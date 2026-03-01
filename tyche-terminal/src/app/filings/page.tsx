"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useWatchlist } from "@/hooks/useWatchlist";
import { getCompanyFilings, getCompanyOverview } from "@/lib/api";

// ─── Types ──────────────────────────────────────────────
interface Filing {
    form: string;
    filingDate: string;
    reportDate: string | null;
    accessionNumber: string;
    primaryDocument: string | null;
}

interface CompanyInfo {
    ticker: string;
    cik: string;
    name: string | null;
    sic: string | null;
    sicDescription: string | null;
    exchanges: string[] | null;
    stateOfIncorporation: string | null;
}

interface CompanyFilings {
    ticker: string;
    info: CompanyInfo | null;
    filings: Filing[];
    loading: boolean;
    error: string | null;
}

// ─── Icons ──────────────────────────────────────────────
const DocIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
);
const ChevronRight = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
);
const ExternalLink = () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
    </svg>
);
const RefreshIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 19.644l3.181-3.182" />
    </svg>
);

// ─── Config ─────────────────────────────────────────────
const FILING_TYPES = ["All", "10-K", "10-Q", "8-K"];

const FORM_COLORS: Record<string, { bg: string; text: string; label: string }> = {
    "10-K": { bg: "bg-purple-500/15", text: "text-purple-400", label: "Annual Report" },
    "10-Q": { bg: "bg-cyan-500/15", text: "text-cyan-400", label: "Quarterly Report" },
    "8-K": { bg: "bg-amber-500/15", text: "text-amber-400", label: "Current Event" },
    "10-K/A": { bg: "bg-purple-500/10", text: "text-purple-300", label: "Amended Annual" },
    "10-Q/A": { bg: "bg-cyan-500/10", text: "text-cyan-300", label: "Amended Quarterly" },
};

function getFormStyle(form: string) {
    return FORM_COLORS[form] || { bg: "bg-white/5", text: "text-text-muted", label: form };
}

function getEdgarUrl(cik: string, accessionNumber: string, primaryDocument: string | null): string {
    const accClean = accessionNumber.replace(/-/g, "");
    if (primaryDocument) {
        return `https://www.sec.gov/Archives/edgar/data/${cik.replace(/^0+/, "")}/${accClean}/${primaryDocument}`;
    }
    return `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=&dateb=&owner=include&count=40`;
}

function formatDate(d: string | null): string {
    if (!d) return "—";
    const date = new Date(d + "T00:00:00");
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function daysAgo(d: string): string {
    const days = Math.floor((Date.now() - new Date(d + "T00:00:00").getTime()) / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 30) return `${days}d ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
}

// ─── Main Component ─────────────────────────────────────
export default function FilingsPage() {
    const [user, setUser] = useState<{ email: string } | null>(null);
    const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
    const [filterType, setFilterType] = useState("All");
    const [companyData, setCompanyData] = useState<Record<string, CompanyFilings>>({});
    const [manualTicker, setManualTicker] = useState("");
    const [extraTickers, setExtraTickers] = useState<string[]>([]);

    // Fetch user
    useEffect(() => {
        fetch("/api/auth/me")
            .then((r) => r.json())
            .then((d) => { if (d.success) setUser(d.user); })
            .catch(() => { });
    }, []);

    // Global watchlist
    const { tickers: watchlistTickers, loading: wlLoading } = useWatchlist(user?.email);
    const allTickers = useMemo(
        () => [...new Set([...watchlistTickers, ...extraTickers])],
        [watchlistTickers, extraTickers]
    );

    // Fetch filings for all watchlist tickers
    const fetchCompanyData = useCallback(async (ticker: string) => {
        setCompanyData((prev) => ({
            ...prev,
            [ticker]: { ticker, info: prev[ticker]?.info ?? null, filings: prev[ticker]?.filings ?? [], loading: true, error: null },
        }));

        try {
            const [filings, info] = await Promise.all([
                getCompanyFilings(ticker, "10-K,10-K/A,10-Q,10-Q/A,8-K", 50),
                getCompanyOverview(ticker).catch(() => null),
            ]);
            setCompanyData((prev) => ({
                ...prev,
                [ticker]: { ticker, info, filings: filings || [], loading: false, error: null },
            }));
        } catch {
            setCompanyData((prev) => ({
                ...prev,
                [ticker]: { ticker, info: null, filings: [], loading: false, error: "Failed to load filings" },
            }));
        }
    }, []);

    useEffect(() => {
        if (wlLoading) return;
        allTickers.forEach((ticker) => {
            if (!companyData[ticker] || companyData[ticker].error) {
                fetchCompanyData(ticker);
            }
        });
        // Auto-select first ticker if nothing selected
        if (!selectedTicker && allTickers.length > 0) {
            setSelectedTicker(allTickers[0]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allTickers, wlLoading]);

    const selectedData = selectedTicker ? companyData[selectedTicker] : null;

    const filteredFilings = useMemo(() => {
        if (!selectedData) return [];
        return selectedData.filings.filter(
            (f) => filterType === "All" || f.form.startsWith(filterType)
        );
    }, [selectedData, filterType]);

    // Stats
    const totalFilings = Object.values(companyData).reduce((s, d) => s + d.filings.length, 0);
    const recentFilings = Object.values(companyData)
        .flatMap((d) => d.filings.map((f) => ({ ...f, ticker: d.ticker, cik: d.info?.cik || "" })))
        .sort((a, b) => b.filingDate.localeCompare(a.filingDate))
        .slice(0, 10);

    const handleAddManual = () => {
        const t = manualTicker.trim().toUpperCase();
        if (t && !allTickers.includes(t)) {
            setExtraTickers([...extraTickers, t]);
            setManualTicker("");
            setSelectedTicker(t);
        }
    };

    return (
        <DashboardLayout title="SEC Filings" subtitle="Deep dive into company regulatory filings">
            <div className="space-y-6">
                {/* Stats Row */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-4"
                >
                    {[
                        { label: "Companies", value: allTickers.length.toString(), color: "text-primary" },
                        { label: "Total Filings", value: totalFilings.toLocaleString(), color: "text-cyan-400" },
                        { label: "10-K Reports", value: Object.values(companyData).reduce((s, d) => s + d.filings.filter((f) => f.form === "10-K").length, 0).toString(), color: "text-purple-400" },
                        { label: "Latest Filing", value: recentFilings[0] ? daysAgo(recentFilings[0].filingDate) : "—", color: "text-amber-400" },
                    ].map((stat, i) => (
                        <div key={i} className="bg-surface border border-border rounded-xl p-4">
                            <p className="text-xs text-text-muted mb-1">{stat.label}</p>
                            <p className={`text-2xl font-bold font-mono ${stat.color}`}>
                                {wlLoading ? "—" : stat.value}
                            </p>
                        </div>
                    ))}
                </motion.div>

                {/* Main Layout: Sidebar + Detail */}
                <div className="grid lg:grid-cols-4 gap-6">
                    {/* Company Sidebar */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="lg:col-span-1 bg-surface border border-border rounded-2xl overflow-hidden"
                    >
                        <div className="px-4 py-3 border-b border-border">
                            <h3 className="text-sm font-semibold text-text-main mb-2">Companies</h3>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={manualTicker}
                                    onChange={(e) => setManualTicker(e.target.value.toUpperCase())}
                                    onKeyDown={(e) => e.key === "Enter" && handleAddManual()}
                                    placeholder="Add ticker..."
                                    className="flex-1 px-2 py-1.5 bg-background border border-border rounded-lg text-xs text-text-main font-mono placeholder-text-muted focus:border-primary/50 outline-none"
                                />
                                <button
                                    onClick={handleAddManual}
                                    className="px-2.5 py-1.5 bg-primary/20 text-primary text-xs font-bold rounded-lg hover:bg-primary/30 transition-colors"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                        <div className="divide-y divide-border/30 max-h-[500px] overflow-y-auto">
                            {wlLoading ? (
                                [...Array(5)].map((_, i) => (
                                    <div key={i} className="px-4 py-3">
                                        <div className="h-4 bg-white/5 rounded w-16 mb-1 animate-pulse" />
                                        <div className="h-3 bg-white/5 rounded w-24 animate-pulse" />
                                    </div>
                                ))
                            ) : allTickers.length === 0 ? (
                                <div className="px-4 py-8 text-center text-xs text-text-muted">
                                    Add stocks to your watchlist to see filings
                                </div>
                            ) : (
                                allTickers.map((ticker) => {
                                    const data = companyData[ticker];
                                    const isSelected = selectedTicker === ticker;
                                    const filingCount = data?.filings.length || 0;
                                    return (
                                        <button
                                            key={ticker}
                                            onClick={() => setSelectedTicker(ticker)}
                                            className={`w-full px-4 py-3 text-left hover:bg-white/[0.03] transition-all flex items-center justify-between group ${isSelected ? "bg-primary/5 border-l-2 border-primary" : "border-l-2 border-transparent"
                                                }`}
                                        >
                                            <div>
                                                <p className={`text-sm font-mono font-bold ${isSelected ? "text-primary" : "text-text-main"}`}>
                                                    {ticker}
                                                </p>
                                                <p className="text-[10px] text-text-muted truncate max-w-[120px]">
                                                    {data?.info?.name || (data?.loading ? "Loading..." : "—")}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {filingCount > 0 && (
                                                    <span className="text-[10px] text-text-muted font-mono">{filingCount}</span>
                                                )}
                                                <span className={`transition-colors ${isSelected ? "text-primary" : "text-text-muted/30 group-hover:text-text-muted"}`}>
                                                    <ChevronRight />
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </motion.div>

                    {/* Filing Detail Panel */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="lg:col-span-3 space-y-4"
                    >
                        {/* Company Header */}
                        {selectedData && (
                            <div className="bg-surface border border-border rounded-2xl p-5">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <h2 className="text-xl font-bold text-text-main">{selectedTicker}</h2>
                                            {selectedData.info?.exchanges && (
                                                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                                                    {selectedData.info.exchanges[0]}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-text-muted">{selectedData.info?.name || "Loading..."}</p>
                                    </div>
                                    <button
                                        onClick={() => selectedTicker && fetchCompanyData(selectedTicker)}
                                        className="p-2 text-text-muted hover:text-primary transition-colors rounded-lg hover:bg-white/5"
                                        title="Refresh filings"
                                    >
                                        <RefreshIcon />
                                    </button>
                                </div>

                                {/* Company metadata grid */}
                                {selectedData.info && (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {[
                                            { label: "CIK", value: selectedData.info.cik },
                                            { label: "SIC Code", value: selectedData.info.sic || "—" },
                                            { label: "Industry", value: selectedData.info.sicDescription || "—" },
                                            { label: "State", value: selectedData.info.stateOfIncorporation || "—" },
                                        ].map((item, i) => (
                                            <div key={i} className="bg-background/50 rounded-lg px-3 py-2">
                                                <p className="text-[10px] text-text-muted uppercase tracking-wider">{item.label}</p>
                                                <p className="text-xs text-text-main font-mono truncate">{item.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Filing type breakdown */}
                                {selectedData.filings.length > 0 && (
                                    <div className="mt-4 flex gap-4 flex-wrap">
                                        {Object.entries(
                                            selectedData.filings.reduce<Record<string, number>>((acc, f) => {
                                                const key = f.form.replace(/\/A$/, "");
                                                acc[key] = (acc[key] || 0) + 1;
                                                return acc;
                                            }, {})
                                        )
                                            .sort((a, b) => b[1] - a[1])
                                            .slice(0, 5)
                                            .map(([form, count]) => {
                                                const style = getFormStyle(form);
                                                return (
                                                    <div key={form} className={`${style.bg} rounded-lg px-3 py-1.5 flex items-center gap-2`}>
                                                        <span className={`text-xs font-bold font-mono ${style.text}`}>{form}</span>
                                                        <span className="text-[10px] text-text-muted">×{count}</span>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Filters */}
                        <div className="flex items-center gap-2">
                            <DocIcon />
                            <span className="text-sm font-semibold text-text-main">Filings</span>
                            <div className="flex gap-1 ml-4">
                                {FILING_TYPES.map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => setFilterType(type)}
                                        className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${filterType === type
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-surface border border-border text-text-muted hover:text-text-main"
                                            }`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                            <span className="ml-auto text-xs text-text-muted font-mono">{filteredFilings.length} filings</span>
                        </div>

                        {/* Filings List */}
                        <div className="bg-surface border border-border rounded-2xl overflow-hidden">
                            {!selectedTicker ? (
                                <div className="py-16 text-center text-text-muted">
                                    <DocIcon />
                                    <p className="mt-2 text-sm">Select a company to view filings</p>
                                </div>
                            ) : selectedData?.loading ? (
                                <div className="p-4 space-y-3">
                                    {[...Array(6)].map((_, i) => (
                                        <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
                                    ))}
                                </div>
                            ) : selectedData?.error ? (
                                <div className="py-12 text-center">
                                    <p className="text-loss text-sm mb-2">{selectedData.error}</p>
                                    <button
                                        onClick={() => fetchCompanyData(selectedTicker)}
                                        className="text-primary text-xs hover:underline"
                                    >
                                        Retry
                                    </button>
                                </div>
                            ) : filteredFilings.length === 0 ? (
                                <div className="py-12 text-center text-text-muted text-sm">
                                    No {filterType === "All" ? "" : filterType + " "}filings found
                                </div>
                            ) : (
                                <div className="divide-y divide-border/30">
                                    <AnimatePresence mode="popLayout">
                                        {filteredFilings.map((filing, i) => {
                                            const style = getFormStyle(filing.form);
                                            const cik = selectedData?.info?.cik || "";
                                            const edgarUrl = getEdgarUrl(cik, filing.accessionNumber, filing.primaryDocument);
                                            return (
                                                <motion.div
                                                    key={filing.accessionNumber}
                                                    initial={{ opacity: 0, y: 8 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0 }}
                                                    transition={{ delay: Math.min(i * 0.02, 0.3) }}
                                                    className="px-5 py-4 hover:bg-white/[0.02] transition-colors group"
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex items-start gap-3">
                                                            <span className={`${style.bg} ${style.text} text-xs font-bold font-mono px-2.5 py-1 rounded-lg shrink-0`}>
                                                                {filing.form}
                                                            </span>
                                                            <div className="min-w-0">
                                                                <p className="text-sm text-text-main font-medium">
                                                                    {style.label}
                                                                </p>
                                                                <div className="flex items-center gap-3 mt-1 text-[11px] text-text-muted">
                                                                    <span>Filed: <span className="text-text-main/75">{formatDate(filing.filingDate)}</span></span>
                                                                    {filing.reportDate && (
                                                                        <span>Period: <span className="text-text-main/75">{formatDate(filing.reportDate)}</span></span>
                                                                    )}
                                                                    <span className="text-primary/60">{daysAgo(filing.filingDate)}</span>
                                                                </div>
                                                                <p className="text-[10px] text-text-muted/50 font-mono mt-0.5">
                                                                    Acc: {filing.accessionNumber}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <a
                                                            href={edgarUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors opacity-60 group-hover:opacity-100"
                                                        >
                                                            View on SEC
                                                            <ExternalLink />
                                                        </a>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>

                {/* Recent Filings Across All Companies */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="bg-surface border border-border rounded-2xl overflow-hidden"
                >
                    <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                        <h3 className="font-semibold text-text-main text-sm">Most Recent Filings Across All Companies</h3>
                        <span className="text-[10px] text-text-muted font-mono">{recentFilings.length} shown</span>
                    </div>
                    <div className="divide-y divide-border/30">
                        {recentFilings.length === 0 ? (
                            <div className="py-8 text-center text-text-muted text-xs">No filings loaded yet</div>
                        ) : (
                            recentFilings.map((f, i) => {
                                const style = getFormStyle(f.form);
                                return (
                                    <div key={`${f.accessionNumber}-${i}`} className="px-5 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                                        <div className="flex items-center gap-3">
                                            <span className={`${style.bg} ${style.text} text-[10px] font-bold font-mono px-2 py-0.5 rounded`}>
                                                {f.form}
                                            </span>
                                            <button
                                                onClick={() => setSelectedTicker(f.ticker)}
                                                className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
                                            >
                                                {f.ticker}
                                            </button>
                                            <span className="text-[11px] text-text-muted">{style.label}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-text-muted font-mono">{formatDate(f.filingDate)}</span>
                                            <span className="text-[10px] text-primary/50">{daysAgo(f.filingDate)}</span>
                                            {f.cik && (
                                                <a
                                                    href={getEdgarUrl(f.cik, f.accessionNumber, f.primaryDocument)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-primary/50 hover:text-primary transition-colors"
                                                >
                                                    <ExternalLink />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </motion.div>
            </div>
        </DashboardLayout>
    );
}
