"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ProGate } from "@/components/pro-gate";
import { config } from "@/lib/config";

const BACKEND = config.apiUrl;

interface MoverItem {
    ticker: string;
    company_name: string;
    earnings_date: string;
    earnings_time: string | null;
    return_pct: number | null;
    direction: string | null;
    eps_estimate: string | null;
    eps_actual: string | null;
}

export default function PostEarningsMoversPage() {
    const [data, setData] = useState<MoverItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [daysBack, setDaysBack] = useState(7);
    const [dirFilter, setDirFilter] = useState<"all" | "up" | "down">("all");
    const [selectedItem, setSelectedItem] = useState<MoverItem | null>(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${BACKEND}/earnings/movers?days_back=${daysBack}`);
            const json = await res.json();
            setData(json.items || []);
        } catch {
            setError("Failed to load movers data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [daysBack]);

    const filtered = data.filter(d => {
        if (dirFilter === "up") return (d.return_pct || 0) > 0;
        if (dirFilter === "down") return (d.return_pct || 0) < 0;
        return true;
    });

    const avgReturn = data.filter(d => d.return_pct != null).reduce((s, d) => s + Math.abs(d.return_pct || 0), 0) / (data.filter(d => d.return_pct != null).length || 1);
    const gainers = data.filter(d => (d.return_pct || 0) > 0).length;
    const decliners = data.filter(d => (d.return_pct || 0) < 0).length;

    return (
        <DashboardLayout title="Post-Earnings Movers" subtitle="Biggest stock price reactions after earnings">
            <ProGate feature="Post-Earnings Movers">
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
                        <span className="text-xs text-text-muted">Direction:</span>
                        {(["all", "up", "down"] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setDirFilter(f)}
                                className={`px-3 py-1 text-xs rounded-lg transition ${dirFilter === f
                                    ? f === "up" ? "bg-profit text-white" : f === "down" ? "bg-loss text-white" : "bg-primary text-primary-foreground"
                                    : "bg-surface border border-border text-text-muted hover:text-text-main"
                                    }`}
                            >
                                {f === "all" ? "All" : f === "up" ? "Gainers" : "Decliners"}
                            </button>
                        ))}
                    </div>
                </motion.div>

                {/* Stats */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-surface border border-border rounded-xl p-4">
                        <p className="text-xs text-text-muted mb-1">Reports Tracked</p>
                        <p className="text-2xl font-bold font-mono text-primary">{loading ? "—" : data.length}</p>
                    </div>
                    <div className="bg-surface border border-profit/20 rounded-xl p-4">
                        <p className="text-xs text-text-muted mb-1">Gainers</p>
                        <p className="text-2xl font-bold font-mono text-profit">{loading ? "—" : gainers}</p>
                    </div>
                    <div className="bg-surface border border-loss/20 rounded-xl p-4">
                        <p className="text-xs text-text-muted mb-1">Decliners</p>
                        <p className="text-2xl font-bold font-mono text-loss">{loading ? "—" : decliners}</p>
                    </div>
                    <div className="bg-surface border border-border rounded-xl p-4">
                        <p className="text-xs text-text-muted mb-1">Avg Move</p>
                        <p className="text-2xl font-bold font-mono text-amber-400">{loading ? "—" : `±${avgReturn.toFixed(1)}%`}</p>
                    </div>
                </motion.div>

                {/* Content */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-sm text-text-muted">Calculating post-earnings price reactions...</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-20">
                        <p className="text-red-400 text-sm">{error}</p>
                        <button onClick={fetchData} className="mt-3 px-4 py-2 bg-primary/20 text-primary rounded-lg text-sm">Retry</button>
                    </div>
                ) : (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <div className="bg-surface border border-border rounded-xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border text-text-muted text-xs">
                                            <th className="text-left px-4 py-3 font-medium">#</th>
                                            <th className="text-left px-4 py-3 font-medium">Ticker</th>
                                            <th className="text-left px-4 py-3 font-medium">Company</th>
                                            <th className="text-center px-4 py-3 font-medium">Date</th>
                                            <th className="text-center px-4 py-3 font-medium">Time</th>
                                            <th className="text-center px-4 py-3 font-medium">EPS Est</th>
                                            <th className="text-center px-4 py-3 font-medium">EPS Act</th>
                                            <th className="text-right px-4 py-3 font-medium">Return</th>
                                            <th className="text-right px-4 py-3 font-medium">Impact</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map((item, i) => (
                                            <tr
                                                key={`${item.ticker}-${item.earnings_date}-${i}`}
                                                onClick={() => setSelectedItem(selectedItem?.ticker === item.ticker ? null : item)}
                                                className="border-b border-border/50 hover:bg-white/5 cursor-pointer transition-colors"
                                            >
                                                <td className="px-4 py-3 text-text-muted font-mono text-xs">{i + 1}</td>
                                                <td className="px-4 py-3 font-mono font-bold text-primary">{item.ticker}</td>
                                                <td className="px-4 py-3 text-text-main truncate max-w-[180px]">{item.company_name}</td>
                                                <td className="px-4 py-3 text-center text-xs text-text-muted">{item.earnings_date}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${item.earnings_time === "BMO" ? "bg-amber-500/20 text-amber-400" :
                                                        item.earnings_time === "AMC" ? "bg-blue-500/20 text-blue-400" :
                                                            "bg-white/5 text-text-muted"
                                                        }`}>
                                                        {item.earnings_time || "—"}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center font-mono text-xs">{item.eps_estimate || "—"}</td>
                                                <td className="px-4 py-3 text-center font-mono text-xs">{item.eps_actual || "—"}</td>
                                                <td className={`px-4 py-3 text-right font-mono font-bold ${(item.return_pct || 0) > 0 ? "text-profit" : (item.return_pct || 0) < 0 ? "text-loss" : "text-text-muted"
                                                    }`}>
                                                    {item.return_pct != null ? `${item.return_pct > 0 ? "+" : ""}${item.return_pct.toFixed(2)}%` : "—"}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {item.return_pct != null && (
                                                        <div className="flex items-center justify-end gap-1">
                                                            <div className="w-20 h-2 bg-border rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full ${(item.return_pct || 0) > 0 ? "bg-profit" : "bg-loss"}`}
                                                                    style={{ width: `${Math.min(Math.abs(item.return_pct || 0) * 5, 100)}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {filtered.length === 0 && (
                            <div className="text-center py-12">
                                <p className="text-sm text-text-muted">No movers data available for this period</p>
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
                                        {selectedItem.return_pct != null && (
                                            <span className={`text-lg font-mono font-bold ${selectedItem.return_pct > 0 ? "text-profit" : "text-loss"
                                                }`}>
                                                {selectedItem.return_pct > 0 ? "+" : ""}{selectedItem.return_pct.toFixed(2)}%
                                            </span>
                                        )}
                                    </div>
                                    <button onClick={() => setSelectedItem(null)} className="text-text-muted hover:text-text-main p-1">✕</button>
                                </div>
                                <p className="text-text-muted mb-4">{selectedItem.company_name}</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/5 rounded-lg p-4">
                                        <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Earnings Date</p>
                                        <p className="font-semibold text-text-main">{selectedItem.earnings_date}</p>
                                    </div>
                                    <div className="bg-white/5 rounded-lg p-4">
                                        <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Report Timing</p>
                                        <p className="font-semibold text-text-main">{selectedItem.earnings_time || "N/A"}</p>
                                    </div>
                                    <div className="bg-white/5 rounded-lg p-4">
                                        <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">EPS Estimate</p>
                                        <p className="font-mono font-bold">{selectedItem.eps_estimate || "—"}</p>
                                    </div>
                                    <div className="bg-white/5 rounded-lg p-4">
                                        <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">EPS Actual</p>
                                        <p className="font-mono font-bold">{selectedItem.eps_actual || "—"}</p>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </ProGate>
        </DashboardLayout>
    );
}
