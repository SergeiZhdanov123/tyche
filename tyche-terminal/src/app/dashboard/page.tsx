"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useQuotes } from "@/hooks/useMarketData";
import { useMarketIndices } from "@/hooks/useMarketData";
import { useTodayEarnings, useWeekEarnings } from "@/hooks/useEarnings";
import { useWatchlist } from "@/hooks/useWatchlist";
import { getCompanyFilings, type QuoteResponse, type CalendarEvent } from "@/lib/api";
import { config } from "@/lib/config";

// Types
interface UserInfo {
    id: string;
    email: string;
    name: string;
    plan: string | null;
}

interface NewsArticle {
    title: string;
    url: string;
    source: string;
    published_at: string;
    publishedAt?: string;
    image_url?: string | null;
    sentiment_hint?: string | null;
}

// Icons
const Icons = {
    TrendUp: () => (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M7 17l9.2-9.2M17 17V7H7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    TrendDown: () => (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M7 7l9.2 9.2M7 7h10v10" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    Plus: () => (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M12 5v14m-7-7h14" strokeLinecap="round" />
        </svg>
    ),
    X: () => (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
        </svg>
    ),
    Crown: () => (
        <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2 19h20l-2-9-5 4-3-6-3 6-5-4-2 9z" />
        </svg>
    ),
    Activity: () => (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    Globe: () => (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M12 21a9 9 0 100-18 9 9 0 000 18zM3.6 9h16.8M3.6 15h16.8M12 3a15.3 15.3 0 014 9 15.3 15.3 0 01-4 9 15.3 15.3 0 01-4-9 15.3 15.3 0 014-9z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
};

// Stat Card
function StatCard({ label, value, subtitle, positive, loading: isLoading, icon, delay = 0 }: {
    label: string; value: string; subtitle: string; positive?: boolean; loading?: boolean; icon: React.ReactNode; delay?: number;
}) {
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
            className="bg-surface/80 backdrop-blur-sm border border-border rounded-2xl p-5 hover:border-primary/20 transition-all"
        >
            <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-text-muted uppercase tracking-wider">{label}</span>
                <span className="text-text-muted/50">{icon}</span>
            </div>
            {isLoading ? (
                <div className="space-y-2"><div className="h-7 w-24 bg-white/5 rounded animate-pulse" /><div className="h-3 w-16 bg-white/5 rounded animate-pulse" /></div>
            ) : (
                <>
                    <div className="text-2xl font-bold text-text-main font-mono">{value}</div>
                    <div className={`text-xs mt-1 ${positive === undefined ? "text-text-muted" : positive ? "text-profit" : "text-loss"}`}>{subtitle}</div>
                </>
            )}
        </motion.div>
    );
}

// Market Index Ticker
function IndexTicker({ index, delay }: {
    index: { symbol: string; name: string; price: number; change: number; change_pct: number }; delay: number;
}) {
    const isUp = index.change >= 0;
    return (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay }}
            className="flex items-center gap-3 px-4 py-3 bg-surface/60 backdrop-blur-sm border border-border rounded-xl hover:border-primary/20 transition-all min-w-[180px]"
        >
            <div>
                <p className="text-xs text-text-muted">{index.name}</p>
                <p className="text-sm font-bold font-mono text-text-main">${index.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            <div className={`ml-auto text-right ${isUp ? "text-profit" : "text-loss"}`}>
                <div className="flex items-center gap-1 text-xs font-mono">
                    {isUp ? <Icons.TrendUp /> : <Icons.TrendDown />}
                    {isUp ? "+" : ""}{index.change_pct.toFixed(2)}%
                </div>
            </div>
        </motion.div>
    );
}

// Mini Heat Map Cell
function HeatCell({ symbol, changePct, loading: isLoading }: { symbol: string; changePct: number | null; loading?: boolean }) {
    if (isLoading || changePct === null) {
        return <div className="h-12 rounded-lg bg-white/5 animate-pulse" />;
    }
    const intensity = Math.min(Math.abs(changePct) / 3, 1);
    const bg = changePct >= 0
        ? `rgba(0, 230, 118, ${0.1 + intensity * 0.4})`
        : `rgba(239, 68, 68, ${0.1 + intensity * 0.4})`;
    return (
        <div className="h-12 rounded-lg flex flex-col items-center justify-center cursor-default hover:ring-1 hover:ring-primary/30 transition-all" style={{ background: bg }}>
            <span className="text-[10px] font-bold text-text-main">{symbol}</span>
            <span className={`text-[9px] font-mono ${changePct >= 0 ? "text-profit" : "text-loss"}`}>
                {changePct >= 0 ? "+" : ""}{changePct.toFixed(1)}%
            </span>
        </div>
    );
}

import { useUser } from "@clerk/nextjs";

export default function DashboardPage() {
    const { user: clerkUser } = useUser();
    const [dbUser, setDbUser] = useState<UserInfo | null>(null);
    const [showAddStock, setShowAddStock] = useState(false);
    const [newTicker, setNewTicker] = useState("");
    const [filings, setFilings] = useState<{ ticker: string; form: string; filingDate: string; url?: string }[]>([]);
    const [filingsLoading, setFilingsLoading] = useState(true);
    const [newsHeadlines, setNewsHeadlines] = useState<NewsArticle[]>([]);
    const [newsLoading, setNewsLoading] = useState(true);

    const router = useRouter();

    // Fetch DB user for plan info
    useEffect(() => {
        fetch("/api/auth/me").then((r) => r.json()).then((d) => {
            if (d.success) {
                setDbUser(d.user);
            }
        }).catch(() => { });
    }, [router]);

    // ── Global watchlist (synced to backend) ──
    const { items: watchlistItems, tickers: watchlistTickers, addTicker, removeTicker } = useWatchlist(clerkUser?.primaryEmailAddress?.emailAddress);
    const watchlist = useMemo(() => watchlistItems.map((i) => ({ symbol: i.ticker, name: i.ticker })), [watchlistItems]);

    // Market data hooks
    const symbols = watchlistTickers;
    const { quotes: quotesArr, loading: quotesLoading } = useQuotes(symbols);
    const { indices, loading: indicesLoading } = useMarketIndices();
    const { events: todayEarnings, loading: earningsLoading } = useTodayEarnings();
    const { events: weekEarnings } = useWeekEarnings();

    // Convert quote arrays to maps for O(1) lookup
    const quotes = useMemo(() => {
        const map: Record<string, QuoteResponse> = {};
        quotesArr?.forEach((q) => { map[q.ticker] = q; });
        return map;
    }, [quotesArr]);

    // Heat map stocks (wider set)
    const heatMapSymbols = ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA", "BRK-B", "JPM", "V", "UNH", "XOM", "JNJ", "PG", "HD", "MA"];
    const { quotes: heatQuotesArr, loading: heatLoading } = useQuotes(heatMapSymbols);
    const heatQuotes = useMemo(() => {
        const map: Record<string, QuoteResponse> = {};
        heatQuotesArr?.forEach((q) => { map[q.ticker] = q; });
        return map;
    }, [heatQuotesArr]);

    // Fetch news from backend scraper
    useEffect(() => {
        fetch(`${config.apiUrl}/news/feed?category=earnings&limit=6`)
            .then((r) => r.json())
            .then((d) => { if (d.articles) setNewsHeadlines(d.articles); })
            .catch(() => { })
            .finally(() => setNewsLoading(false));
    }, []);

    // Fetch filings
    const fetchFilings = useCallback(async () => {
        if (watchlistTickers.length === 0) { setFilingsLoading(false); return; }
        setFilingsLoading(true);
        try {
            const topStocks = watchlistTickers.slice(0, 3);
            const allFilings: { ticker: string; form: string; filingDate: string; url?: string }[] = [];
            for (const ticker of topStocks) {
                try {
                    const f = await getCompanyFilings(ticker, "10-Q,10-K,8-K", 2);
                    if (Array.isArray(f)) {
                        f.forEach((filing: { form?: string; filingDate?: string; filingUrl?: string }) => {
                            allFilings.push({ ticker, form: filing.form || "N/A", filingDate: filing.filingDate || "", url: filing.filingUrl });
                        });
                    }
                } catch { /* skip */ }
            }
            setFilings(allFilings.sort((a, b) => new Date(b.filingDate).getTime() - new Date(a.filingDate).getTime()).slice(0, 6));
        } catch { /* skip */ }
        setFilingsLoading(false);
    }, [watchlistTickers]);

    useEffect(() => { fetchFilings(); }, [fetchFilings]);

    const addStock = () => {
        const t = newTicker.trim().toUpperCase();
        if (t && !watchlistTickers.includes(t)) {
            addTicker(t);
            setNewTicker("");
            setShowAddStock(false);
        }
    };

    const removeStock = (symbol: string) => {
        removeTicker(symbol);
    };

    const isStarter = dbUser?.plan === "starter";
    const greeting = (() => {
        const h = new Date().getHours();
        if (h < 12) return "Good morning";
        if (h < 17) return "Good afternoon";
        return "Good evening";
    })();

    const totalValue = quotes ? Object.values(quotes).reduce((sum, q) => sum + (q?.price || 0), 0) : 0;
    const timeAgo = (d: string) => {
        const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
        if (mins < 60) return `${mins}m`;
        if (mins < 1440) return `${Math.floor(mins / 60)}h`;
        return `${Math.floor(mins / 1440)}d`;
    };

    return (
        <DashboardLayout title={`${greeting}, ${clerkUser?.firstName || "Trader"}`} subtitle="Your market command center">
            <div className="space-y-6">
                {/* Upgrade Banner */}
                {isStarter && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-r from-primary/10 via-cyan-500/5 to-purple-500/10 border border-primary/20 rounded-2xl p-4 flex items-center justify-between"
                    >
                        <div className="flex items-center gap-3">
                            <Icons.Crown />
                            <div>
                                <p className="text-sm font-bold text-text-main">Unlock Full Access</p>
                                <p className="text-xs text-text-muted">Upgrade to Pro for AI signals, unlimited watchlist, and API access</p>
                            </div>
                        </div>
                        <Link href="/select-plan" className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:bg-primary/90 transition-colors">
                            Upgrade
                        </Link>
                    </motion.div>
                )}

                {/* Market Indices Ribbon */}
                <div className="flex gap-3 overflow-x-auto pb-1">
                    {indicesLoading ? (
                        Array(4).fill(0).map((_, i) => <div key={i} className="h-[60px] min-w-[180px] bg-surface/60 border border-border rounded-xl animate-pulse" />)
                    ) : (
                        indices.map((idx, i) => <IndexTicker key={idx.symbol} index={idx} delay={i * 0.05} />)
                    )}
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard label="Watchlist Value" value={quotesLoading ? "—" : `$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        subtitle={`${symbols.length} stocks tracked`} loading={quotesLoading}
                        icon={<Icons.Activity />} delay={0.05} />
                    <StatCard label="Stocks Tracked" value={`${symbols.length}`}
                        subtitle={isStarter ? "5 max (Starter)" : "Unlimited"} loading={false}
                        icon={<Icons.Globe />} delay={0.1} />
                    <StatCard label="Earnings Today" value={earningsLoading ? "—" : `${todayEarnings?.length || 0}`}
                        subtitle="Companies reporting" positive={true} loading={earningsLoading}
                        icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>} delay={0.15} />
                    <StatCard label="This Week" value={weekEarnings ? `${weekEarnings.length}` : "—"}
                        subtitle="Earnings events" loading={!weekEarnings}
                        icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>} delay={0.2} />
                </div>

                {/* Main Grid */}
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Watchlist — Left Column */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                        className="lg:col-span-2 bg-surface/80 backdrop-blur-sm border border-border rounded-2xl overflow-hidden"
                    >
                        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                            <h3 className="font-semibold text-text-main">Watchlist</h3>
                            <button onClick={() => setShowAddStock(!showAddStock)} className="p-1.5 rounded-lg hover:bg-white/5 text-text-muted hover:text-primary transition-colors">
                                {showAddStock ? <Icons.X /> : <Icons.Plus />}
                            </button>
                        </div>
                        {showAddStock && (
                            <div className="px-5 py-3 border-b border-border bg-white/[0.02]">
                                <div className="flex gap-2">
                                    <input type="text" value={newTicker} onChange={(e) => setNewTicker(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addStock()}
                                        placeholder="Enter ticker (e.g., MSFT)" className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-main font-mono placeholder-text-muted focus:border-primary/50 outline-none" />
                                    <button onClick={addStock} className="px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg font-medium">Add</button>
                                </div>
                            </div>
                        )}
                        <div className="divide-y divide-border/50">
                            {watchlist.map((stock) => {
                                const q = quotes?.[stock.symbol];
                                const isUp = q && q.change >= 0;
                                return (
                                    <div key={stock.symbol} className="px-5 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                                                {stock.symbol.slice(0, 2)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-text-main">{stock.symbol}</p>
                                                <p className="text-xs text-text-muted">{stock.name}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {quotesLoading ? (
                                                <div className="w-20 h-4 bg-white/5 rounded animate-pulse" />
                                            ) : q ? (
                                                <div className="text-right">
                                                    <p className="text-sm font-bold font-mono text-text-main">${q.price?.toFixed(2)}</p>
                                                    <p className={`text-xs font-mono ${isUp ? "text-profit" : "text-loss"}`}>
                                                        {isUp ? "+" : ""}{q.change_pct?.toFixed(2)}%
                                                    </p>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-text-muted">N/A</span>
                                            )}
                                            <button onClick={() => removeStock(stock.symbol)} className="opacity-0 group-hover:opacity-100 p-1 text-text-muted hover:text-loss transition-all">
                                                <Icons.X />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>

                    {/* Right Column — Heat Map + News */}
                    <div className="space-y-6">
                        {/* Market Heat Map */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                            className="bg-surface/80 backdrop-blur-sm border border-border rounded-2xl p-5"
                        >
                            <h3 className="font-semibold text-text-main mb-3 text-sm">Market Heat Map</h3>
                            <div className="grid grid-cols-4 gap-1.5">
                                {heatMapSymbols.map((sym) => {
                                    const q = heatQuotes?.[sym];
                                    return <HeatCell key={sym} symbol={sym} changePct={q?.change_pct ?? null} loading={heatLoading} />;
                                })}
                            </div>
                        </motion.div>

                        {/* Live News */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                            className="bg-surface/80 backdrop-blur-sm border border-border rounded-2xl overflow-hidden"
                        >
                            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                                <h3 className="font-semibold text-text-main text-sm">Live News</h3>
                                <Link href="/news" className="text-[10px] text-primary hover:text-primary/80">View All →</Link>
                            </div>
                            <div className="divide-y divide-border/50">
                                {newsLoading ? (
                                    Array(4).fill(0).map((_, i) => <div key={i} className="px-5 py-3"><div className="h-3 bg-white/5 rounded w-full mb-1 animate-pulse" /><div className="h-2 bg-white/5 rounded w-1/3 animate-pulse" /></div>)
                                ) : newsHeadlines.length === 0 ? (
                                    <div className="px-5 py-6 text-center text-xs text-text-muted">No news available</div>
                                ) : (
                                    newsHeadlines.slice(0, 5).map((article, i) => (
                                        <a key={i} href={article.url} target="_blank" rel="noopener noreferrer"
                                            className="flex gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors group">
                                            {article.image_url && (
                                                <img
                                                    src={article.image_url}
                                                    alt=""
                                                    className="w-16 h-12 object-cover rounded-lg flex-shrink-0 bg-white/5"
                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                />
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs text-text-main line-clamp-2 group-hover:text-primary transition-colors leading-relaxed">{article.title}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] text-primary">{article.source}</span>
                                                    <span className="text-[10px] text-text-muted">{timeAgo(article.published_at || article.publishedAt || "")}</span>
                                                </div>
                                            </div>
                                        </a>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* Bottom Grid — Earnings + Filings */}
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Today's Earnings */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                        className="bg-surface/80 backdrop-blur-sm border border-border rounded-2xl overflow-hidden"
                    >
                        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                            <h3 className="font-semibold text-text-main text-sm">Today&apos;s Earnings</h3>
                            <Link href="/earnings" className="text-[10px] text-primary hover:text-primary/80">View All →</Link>
                        </div>
                        <div className="divide-y divide-border/50 max-h-[280px] overflow-y-auto">
                            {earningsLoading ? (
                                Array(5).fill(0).map((_, i) => <div key={i} className="px-5 py-3"><div className="h-3 bg-white/5 rounded w-2/3 mb-1 animate-pulse" /><div className="h-2 bg-white/5 rounded w-1/3 animate-pulse" /></div>)
                            ) : !todayEarnings || todayEarnings.length === 0 ? (
                                <div className="px-5 py-6 text-center text-xs text-text-muted">No earnings today</div>
                            ) : (
                                todayEarnings.slice(0, 8).map((event: CalendarEvent, i: number) => {
                                    const beat = event.eps_actual && event.eps_estimate && parseFloat(event.eps_actual) > parseFloat(event.eps_estimate);
                                    const miss = event.eps_actual && event.eps_estimate && parseFloat(event.eps_actual) < parseFloat(event.eps_estimate);
                                    return (
                                        <div key={i} className="px-5 py-3 flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-semibold text-text-main">{event.ticker || "N/A"}</p>
                                                <p className="text-xs text-text-muted truncate max-w-[140px]">{event.company_name || ""}</p>
                                            </div>
                                            <div className="text-right">
                                                {event.eps_actual ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-mono text-text-main">${event.eps_actual}</span>
                                                        {beat && <span className="text-[10px] bg-profit/20 text-profit px-1.5 py-0.5 rounded font-bold">BEAT</span>}
                                                        {miss && <span className="text-[10px] bg-loss/20 text-loss px-1.5 py-0.5 rounded font-bold">MISS</span>}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-text-muted font-mono">Est: ${event.eps_estimate || "N/A"}</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </motion.div>

                    {/* Week Ahead */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
                        className="bg-surface/80 backdrop-blur-sm border border-border rounded-2xl overflow-hidden"
                    >
                        <div className="px-5 py-4 border-b border-border">
                            <h3 className="font-semibold text-text-main text-sm">Week Ahead</h3>
                            <p className="text-xs text-text-muted mt-1">Upcoming earnings this week</p>
                        </div>
                        <div className="divide-y divide-border/50 max-h-[280px] overflow-y-auto">
                            {(() => {
                                const todayStr = new Date().toISOString().split('T')[0];
                                const futureEvents = (weekEarnings || []).filter(
                                    (e: CalendarEvent) => e.earnings_date >= todayStr
                                );
                                if (!weekEarnings) {
                                    return Array(5).fill(0).map((_, i) => <div key={i} className="px-5 py-3"><div className="h-3 bg-white/5 rounded w-2/3 mb-1 animate-pulse" /><div className="h-2 bg-white/5 rounded w-1/3 animate-pulse" /></div>);
                                }
                                if (futureEvents.length === 0) {
                                    return <div className="px-5 py-6 text-center text-xs text-text-muted">No upcoming earnings this week</div>;
                                }
                                return futureEvents.slice(0, 8).map((event: CalendarEvent, i: number) => (
                                    <div key={i} className="px-5 py-3 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-text-main">{event.ticker}</p>
                                            <p className="text-xs text-text-muted truncate max-w-[140px]">{event.company_name}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-text-muted">{event.earnings_date || ""}</p>
                                            {event.eps_estimate && <p className="text-xs font-mono text-text-muted">Est: ${event.eps_estimate}</p>}
                                        </div>
                                    </div>
                                ));
                            })()}
                        </div>
                    </motion.div>

                    {/* SEC Filings */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                        className="bg-surface/80 backdrop-blur-sm border border-border rounded-2xl overflow-hidden"
                    >
                        <div className="px-5 py-4 border-b border-border">
                            <h3 className="font-semibold text-text-main text-sm">Recent Filings</h3>
                        </div>
                        <div className="divide-y divide-border/50 max-h-[280px] overflow-y-auto">
                            {filingsLoading ? (
                                Array(4).fill(0).map((_, i) => <div key={i} className="px-5 py-3"><div className="h-3 bg-white/5 rounded w-2/3 mb-1 animate-pulse" /><div className="h-2 bg-white/5 rounded w-1/3 animate-pulse" /></div>)
                            ) : filings.length === 0 ? (
                                <div className="px-5 py-6 text-center text-xs text-text-muted">No recent filings</div>
                            ) : (
                                filings.map((f, i) => (
                                    <div key={i} className="px-5 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-bold text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded">{f.form}</span>
                                            <span className="text-sm font-semibold text-text-main">{f.ticker}</span>
                                        </div>
                                        <span className="text-xs text-text-muted">{f.filingDate}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                </div>

                {/* Quick Links Footer */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-3"
                >
                    {[
                        { label: "API Playground", href: "/api-playground", icon: "⚡" },
                        { label: "Market News", href: "/news", icon: "📰" },
                        { label: "Write Blog", href: "/blogs", icon: "✏️" },
                        { label: "API Docs", href: "/api-docs", icon: "📖" },
                    ].map((link) => (
                        <Link key={link.href} href={link.href}
                            className="flex items-center gap-3 px-4 py-3 bg-surface/50 border border-border rounded-xl hover:border-primary/30 hover:bg-surface/80 transition-all group"
                        >
                            <span className="text-lg">{link.icon}</span>
                            <span className="text-sm text-text-muted group-hover:text-text-main transition-colors">{link.label}</span>
                        </Link>
                    ))}
                </motion.div>
            </div>
        </DashboardLayout>
    );
}
