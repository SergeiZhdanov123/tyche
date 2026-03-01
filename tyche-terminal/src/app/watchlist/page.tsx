"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useQuotes } from "@/hooks/useMarketData";
import { type QuoteResponse, getCompanyEarningsEvents } from "@/lib/api";

const TrendUp = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </svg>
);

const TrendDown = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181" />
    </svg>
);

const PlusIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
);

const TrashIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
);

import { useUser } from "@clerk/nextjs";

export default function WatchlistPage() {
    const { user } = useUser();
    const [showAddModal, setShowAddModal] = useState(false);
    const [newTicker, setNewTicker] = useState("");
    const [addError, setAddError] = useState<string | null>(null);
    const [earningsDates, setEarningsDates] = useState<Record<string, string | null>>({});
    const [earningsLoading, setEarningsLoading] = useState(false);

    // Global watchlist (synced with dashboard)
    const { items, tickers, loading: wlLoading, addTicker, removeTicker } = useWatchlist(user?.primaryEmailAddress?.emailAddress);

    // Fetch live quotes for watchlist tickers
    const { quotes: quotesArr, loading: quotesLoading } = useQuotes(tickers, 15000);
    const quotesMap = useMemo(() => {
        const map: Record<string, QuoteResponse> = {};
        quotesArr?.forEach((q) => { map[q.ticker] = q; });
        return map;
    }, [quotesArr]);

    // Fetch next earnings date for all tickers
    useEffect(() => {
        if (!tickers.length) return;
        let isMounted = true;

        async function fetchEarnings() {
            setEarningsLoading(true);
            const datesMap: Record<string, string | null> = { ...earningsDates };

            const promises = tickers.map(async (ticker) => {
                // Skip if already fetched to avoid spamming
                if (datesMap[ticker] !== undefined) return;

                try {
                    const events = await getCompanyEarningsEvents(ticker, 1);
                    if (events && events.length > 0) {
                        datesMap[ticker] = events[0].event_date;
                    } else {
                        datesMap[ticker] = null;
                    }
                } catch {
                    datesMap[ticker] = null;
                }
            });

            await Promise.all(promises);
            if (isMounted) {
                setEarningsDates(datesMap);
                setEarningsLoading(false);
            }
        }

        fetchEarnings();
        return () => { isMounted = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tickers]);

    const handleAdd = async () => {
        const t = newTicker.trim().toUpperCase();
        if (!t) return;
        if (tickers.includes(t)) {
            setAddError(`${t} is already in your watchlist`);
            return;
        }
        setAddError(null);
        try {
            await addTicker(t);
            setNewTicker("");
            setShowAddModal(false);
        } catch {
            setAddError("Failed to add ticker. Try again.");
        }
    };

    const handleRemove = async (ticker: string) => {
        try {
            await removeTicker(ticker);
        } catch {
            // Silent — optimistic removal already happened
        }
    };

    const gainers = items.filter((i) => (quotesMap[i.ticker]?.change ?? 0) > 0).length;
    const losers = items.filter((i) => (quotesMap[i.ticker]?.change ?? 0) < 0).length;
    const loading = wlLoading || (quotesLoading && quotesArr.length === 0);

    return (
        <DashboardLayout title="Watchlist" subtitle="Track your favorite stocks — synced across all pages">
            {/* Stats Bar */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
            >
                {[
                    { label: "Watchlist Size", value: items.length.toString() },
                    { label: "Total Value", value: `$${Object.values(quotesMap).reduce((s, q) => s + (q?.price || 0), 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: "text-primary" },
                    { label: "Gainers Today", value: gainers.toString(), color: "text-profit" },
                    { label: "Losers Today", value: losers.toString(), color: "text-loss" },
                ].map((stat, i) => (
                    <div key={i} className="bg-surface border border-border rounded-xl p-4">
                        <p className="text-sm text-text-muted mb-1">{stat.label}</p>
                        <p className={`text-2xl font-bold font-mono ${stat.color || "text-primary"}`}>
                            {loading ? "—" : stat.value}
                        </p>
                    </div>
                ))}
            </motion.div>

            {/* Add Button */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-6"
            >
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:shadow-[0_0_20px_rgba(0,230,118,0.3)] transition-all"
                >
                    <PlusIcon />
                    Add to Watchlist
                </button>
            </motion.div>

            {/* Watchlist Table */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-surface border border-border rounded-xl overflow-hidden"
            >
                {loading ? (
                    <div className="p-6 space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />
                        ))}
                    </div>
                ) : items.length === 0 ? (
                    <div className="py-16 text-center">
                        <p className="text-text-muted mb-2">Your watchlist is empty</p>
                        <button onClick={() => setShowAddModal(true)} className="text-primary text-sm hover:underline">
                            + Add your first stock
                        </button>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border bg-background/50">
                                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Symbol</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-text-muted uppercase tracking-wider">Price</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-text-muted uppercase tracking-wider">Change</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-text-muted uppercase tracking-wider hidden sm:table-cell">Open</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-text-muted uppercase tracking-wider hidden md:table-cell">High</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-text-muted uppercase tracking-wider hidden md:table-cell">Low</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-text-muted uppercase tracking-wider hidden lg:table-cell">Volume</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-text-muted uppercase tracking-wider hidden lg:table-cell">Next Earnings</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider hidden xl:table-cell">Added</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-text-muted uppercase tracking-wider">Remove</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {items.map((item, i) => {
                                const q = quotesMap[item.ticker];
                                const isUp = (q?.change ?? 0) >= 0;
                                return (
                                    <motion.tr
                                        key={item.ticker}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.03 }}
                                        className="hover:bg-white/[0.02] transition-colors"
                                    >
                                        <td className="px-4 py-4">
                                            <span className="font-mono font-semibold text-primary text-lg">{item.ticker}</span>
                                        </td>
                                        <td className="px-4 py-4 text-right font-mono text-text-main">
                                            {q ? `$${q.price.toFixed(2)}` : <span className="w-16 h-4 bg-white/5 rounded animate-pulse inline-block" />}
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            {q ? (
                                                <span className={`flex items-center justify-end gap-1 font-mono ${isUp ? "text-profit" : "text-loss"}`}>
                                                    {isUp ? <TrendUp /> : <TrendDown />}
                                                    {isUp ? "+" : ""}{q.change_pct.toFixed(2)}%
                                                </span>
                                            ) : "—"}
                                        </td>
                                        <td className="px-4 py-4 text-right font-mono text-sm text-text-muted hidden sm:table-cell">
                                            {q ? `$${q.open.toFixed(2)}` : "—"}
                                        </td>
                                        <td className="px-4 py-4 text-right font-mono text-sm text-text-muted hidden md:table-cell">
                                            {q ? `$${q.high.toFixed(2)}` : "—"}
                                        </td>
                                        <td className="px-4 py-4 text-right font-mono text-sm text-text-muted hidden md:table-cell">
                                            {q ? `$${q.low.toFixed(2)}` : "—"}
                                        </td>
                                        <td className="px-4 py-4 text-right font-mono text-xs text-text-muted hidden lg:table-cell">
                                            {q ? q.volume.toLocaleString() : "—"}
                                        </td>
                                        <td className="px-4 py-4 text-right text-sm text-text-main hidden lg:table-cell font-mono">
                                            {earningsLoading && earningsDates[item.ticker] === undefined ? (
                                                <span className="w-16 h-4 bg-white/5 rounded animate-pulse inline-block" />
                                            ) : (
                                                <span className={earningsDates[item.ticker] ? "text-primary" : "text-text-muted"}>
                                                    {earningsDates[item.ticker] || "N/A"}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-text-muted hidden xl:table-cell">
                                            {item.added_at ? new Date(item.added_at).toLocaleDateString() : "—"}
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center justify-center">
                                                <button
                                                    onClick={() => handleRemove(item.ticker)}
                                                    className="p-1.5 text-text-muted hover:text-loss transition-colors"
                                                >
                                                    <TrashIcon />
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </motion.div>

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-surface border border-border rounded-xl p-6 w-full max-w-md"
                    >
                        <h3 className="text-lg font-semibold text-text-main mb-4">Add to Watchlist</h3>
                        <input
                            type="text"
                            value={newTicker}
                            onChange={(e) => { setNewTicker(e.target.value.toUpperCase()); setAddError(null); }}
                            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                            placeholder="Enter symbol (e.g., AAPL)"
                            className="w-full px-4 py-3 bg-background border border-border rounded-lg text-text-main font-mono placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary mb-2"
                            autoFocus
                        />
                        {addError && <p className="text-xs text-loss mb-2">{addError}</p>}
                        <p className="text-xs text-text-muted mb-4">This will sync across your Dashboard, Signals, and all other pages.</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowAddModal(false); setAddError(null); setNewTicker(""); }}
                                className="flex-1 px-4 py-2 border border-border rounded-lg text-text-muted hover:text-text-main transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAdd}
                                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:shadow-[0_0_20px_rgba(0,230,118,0.3)] transition-all"
                            >
                                Add
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </DashboardLayout>
    );
}
