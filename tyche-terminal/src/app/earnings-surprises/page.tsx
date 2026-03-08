"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ProGate } from "@/components/pro-gate";
import { config } from "@/lib/config";

const BACKEND = config.apiUrl;

interface SurpriseItem {
    ticker: string;
    company_name: string;
    earnings_date: string;
    eps_estimate: string | null;
    eps_actual: string | null;
    surprise_pct: number | null;
    beat: boolean | null;
    revenue_estimate: string | null;
    market_cap: string | null;
}

export default function EarningsSurprisesPage() {
    const [data, setData] = useState<SurpriseItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [daysBack, setDaysBack] = useState(7);
    const [filter, setFilter] = useState<"all" | "beat" | "miss">("all");
    const [selectedItem, setSelectedItem] = useState<SurpriseItem | null>(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${BACKEND}/earnings/surprises?days_back=${daysBack}`);
            const json = await res.json();
            setData(json.items || []);
        } catch {
            setError("Failed to load earnings surprise data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [daysBack]);

    const filtered = data.filter((d) => {
        if (filter === "beat") return d.beat === true;
        if (filter === "miss") return d.beat === false;
        return true;
    });

    const beats = data.filter(d => d.beat === true).length;
    const misses = data.filter(d => d.beat === false).length;
    const avgSurprise = data.filter(d => d.surprise_pct != null).reduce((s, d) => s + Math.abs(d.surprise_pct || 0), 0) / (data.filter(d => d.surprise_pct != null).length || 1);

    return (
        <DashboardLayout title="Earnings Surprises" subtitle="Stocks that beat or missed EPS estimates">
            <ProGate feature="Earnings Surprises">
                {/* Controls */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-text-muted">Period:</span>
                        {[3, 7, 14, 30].map(d => (
                            <button
                                key={d}
                                onClick={() => setDaysBack(d)}
                                className={`px-3 py-1 text-xs rounded-lg transition ${daysBack === d
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-surface border border-border text-text-muted hover:text-text-main"
                                    }`}
                            >
                                {d}d
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                        <span className="text-xs text-text-muted">Show:</span>
                        {(["all", "beat", "miss"] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3 py-1 text-xs rounded-lg transition ${filter === f
                                    ? f === "beat" ? "bg-profit text-white" : f === "miss" ? "bg-loss text-white" : "bg-primary text-primary-foreground"
                                    : "bg-surface border border-border text-text-muted hover:text-text-main"
                                    }`}
                            >
                                {f === "all" ? "All" : f === "beat" ? "Beats" : "Misses"}
                            </button>
                        ))}
                    </div>
                </motion.div>

                {/* Stats */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-surface border border-border rounded-xl p-4">
                        <p className="text-xs text-text-muted mb-1">Total Reports</p>
                        <p className="text-2xl font-bold font-mono text-primary">{loading ? "—" : data.length}</p>
                    </div>
                    <div className="bg-surface border border-profit/20 rounded-xl p-4">
                        <p className="text-xs text-text-muted mb-1">Beats</p>
                        <p className="text-2xl font-bold font-mono text-profit">{loading ? "—" : beats}</p>
                    </div>
                    <div className="bg-surface border border-loss/20 rounded-xl p-4">
                        <p className="text-xs text-text-muted mb-1">Misses</p>
                        <p className="text-2xl font-bold font-mono text-loss">{loading ? "—" : misses}</p>
                    </div>
                    <div className="bg-surface border border-border rounded-xl p-4">
                        <p className="text-xs text-text-muted mb-1">Avg Surprise</p>
                        <p className="text-2xl font-bold font-mono text-amber-400">{loading ? "—" : `${avgSurprise.toFixed(1)}%`}</p>
                    </div>
                </motion.div>

                {/* Content */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-sm text-text-muted">Scanning earnings calendar for surprises...</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-20">
                        <p className="text-red-400 text-sm">{error}</p>
                        <button onClick={fetchData} className="mt-3 px-4 py-2 bg-primary/20 text-primary rounded-lg text-sm">Retry</button>
                    </div>
                ) : (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filtered.map((item, i) => (
                            <motion.div
                                key={`${item.ticker}-${item.earnings_date}-${i}`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: Math.min(i * 0.03, 0.5) }}
                                onClick={() => setSelectedItem(selectedItem?.ticker === item.ticker ? null : item)}
                                className={`p-5 rounded-xl border cursor-pointer group transition-all hover:shadow-lg ${item.beat === true ? "border-profit/30 bg-profit/5 hover:border-profit/60" :
                                    item.beat === false ? "border-loss/30 bg-loss/5 hover:border-loss/60" :
                                        "border-border bg-surface hover:border-primary/40"
                                    }`}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-lg font-bold text-primary">{item.ticker}</span>
                                        {item.beat != null && (
                                            <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${item.beat ? "bg-profit/20 text-profit" : "bg-loss/20 text-loss"
                                                }`}>
                                                {item.beat ? "BEAT" : "MISS"}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs text-text-muted">{item.earnings_date}</span>
                                </div>

                                <p className="text-sm text-text-muted mb-3 truncate">{item.company_name}</p>

                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div>
                                        <span className="text-text-muted">Est</span>
                                        <p className="font-mono font-semibold">{item.eps_estimate || "—"}</p>
                                    </div>
                                    <div>
                                        <span className="text-text-muted">Actual</span>
                                        <p className="font-mono font-semibold">{item.eps_actual || "—"}</p>
                                    </div>
                                    <div>
                                        <span className="text-text-muted">Surprise</span>
                                        <p className={`font-mono font-bold ${(item.surprise_pct || 0) > 0 ? "text-profit" :
                                            (item.surprise_pct || 0) < 0 ? "text-loss" :
                                                "text-text-muted"
                                            }`}>
                                            {item.surprise_pct != null ? `${item.surprise_pct > 0 ? "+" : ""}${item.surprise_pct.toFixed(1)}%` : "—"}
                                        </p>
                                    </div>
                                </div>

                                {item.surprise_pct != null && (
                                    <div className="mt-3 h-1.5 bg-border rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${item.beat ? "bg-profit" : "bg-loss"}`}
                                            style={{ width: `${Math.min(Math.abs(item.surprise_pct), 100)}%` }}
                                        />
                                    </div>
                                )}
                            </motion.div>
                        ))}

                        {filtered.length === 0 && (
                            <div className="col-span-full text-center py-12">
                                <p className="text-sm text-text-muted">No earnings surprises found for this period</p>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Detail Modal */}
                <AnimatePresence>
                    {selectedItem && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
                            onClick={() => setSelectedItem(null)}
                        >
                            <motion.div
                                initial={{ scale: 0.95, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.95, y: 20 }}
                                className="bg-surface border border-border rounded-2xl max-w-lg w-full p-8 shadow-2xl"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-2xl font-bold text-primary">{selectedItem.ticker}</span>
                                        {selectedItem.beat != null && (
                                            <span className={`text-xs font-semibold uppercase px-2.5 py-1 rounded ${selectedItem.beat ? "bg-profit/20 text-profit" : "bg-loss/20 text-loss"
                                                }`}>
                                                {selectedItem.beat ? "BEAT" : "MISS"}
                                            </span>
                                        )}
                                    </div>
                                    <button onClick={() => setSelectedItem(null)} className="text-text-muted hover:text-text-main p-1">✕</button>
                                </div>

                                <p className="text-text-muted mb-4">{selectedItem.company_name}</p>

                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="bg-white/5 rounded-lg p-4">
                                        <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">EPS Estimate</p>
                                        <p className="font-mono text-lg font-bold">{selectedItem.eps_estimate || "—"}</p>
                                    </div>
                                    <div className="bg-white/5 rounded-lg p-4">
                                        <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">EPS Actual</p>
                                        <p className="font-mono text-lg font-bold">{selectedItem.eps_actual || "—"}</p>
                                    </div>
                                    <div className="bg-white/5 rounded-lg p-4">
                                        <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Surprise</p>
                                        <p className={`font-mono text-lg font-bold ${(selectedItem.surprise_pct || 0) > 0 ? "text-profit" : "text-loss"
                                            }`}>
                                            {selectedItem.surprise_pct != null ? `${selectedItem.surprise_pct > 0 ? "+" : ""}${selectedItem.surprise_pct.toFixed(2)}%` : "—"}
                                        </p>
                                    </div>
                                    <div className="bg-white/5 rounded-lg p-4">
                                        <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Report Date</p>
                                        <p className="text-sm font-semibold text-text-main">{selectedItem.earnings_date}</p>
                                    </div>
                                </div>

                                {selectedItem.revenue_estimate && (
                                    <div className="bg-white/5 rounded-lg p-4">
                                        <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Revenue Estimate</p>
                                        <p className="font-mono">{selectedItem.revenue_estimate}</p>
                                    </div>
                                )}
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </ProGate>
        </DashboardLayout>
    );
}
