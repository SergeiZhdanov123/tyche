"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ProGate } from "@/components/pro-gate";
import { config } from "@/lib/config";

const BACKEND = config.apiUrl;

interface GuidanceItem {
    ticker: string;
    company_name: string;
    eps_current_year: number | null;
    eps_next_year: number | null;
    eps_growth_pct: number | null;
    revenue_current_year: number | null;
    revenue_next_year: number | null;
    consensus: string | null;
    price_target_mean: number | null;
    price_target_upside: number | null;
    guidance_signal: string | null;
}

const signalConfig: Record<string, { label: string; bg: string; text: string; icon: string }> = {
    raised: { label: "RAISED", bg: "bg-profit/15", text: "text-profit", icon: "▲" },
    lowered: { label: "LOWERED", bg: "bg-loss/15", text: "text-loss", icon: "▼" },
    maintained: { label: "MAINTAINED", bg: "bg-amber-500/15", text: "text-amber-400", icon: "━" },
};

export default function GuidanceTrackerPage() {
    const [data, setData] = useState<GuidanceItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [signalFilter, setSignalFilter] = useState<"all" | "raised" | "lowered" | "maintained">("all");
    const [selectedItem, setSelectedItem] = useState<GuidanceItem | null>(null);
    const [tickerInput, setTickerInput] = useState("AAPL,MSFT,GOOGL,AMZN,NVDA,META,TSLA,JPM,V,WMT,JNJ,PG,UNH,HD,MA");

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${BACKEND}/earnings/guidance?tickers=${encodeURIComponent(tickerInput)}`);
            const json = await res.json();
            setData(json.items || []);
        } catch {
            setError("Failed to load guidance data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const filtered = data.filter(d => {
        if (signalFilter === "all") return true;
        return d.guidance_signal === signalFilter;
    });

    const raised = data.filter(d => d.guidance_signal === "raised").length;
    const lowered = data.filter(d => d.guidance_signal === "lowered").length;
    const maintained = data.filter(d => d.guidance_signal === "maintained").length;

    return (
        <DashboardLayout title="Guidance Tracker" subtitle="Forward EPS & revenue guidance from analyst estimates">
            <ProGate feature="Guidance Tracker">
                {/* Controls */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 space-y-3">
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="flex-1 min-w-[300px]">
                            <label className="text-xs text-text-muted mb-1 block">Tickers</label>
                            <input
                                value={tickerInput}
                                onChange={(e) => setTickerInput(e.target.value)}
                                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-main font-mono focus:outline-none focus:border-primary"
                            />
                        </div>
                        <button
                            onClick={fetchData}
                            disabled={loading}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50"
                        >
                            {loading ? "Loading..." : "Analyze"}
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs text-text-muted">Signal:</span>
                        {(["all", "raised", "lowered", "maintained"] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setSignalFilter(f)}
                                className={`px-3 py-1 text-xs rounded-lg transition ${signalFilter === f
                                    ? f === "raised" ? "bg-profit text-white" :
                                        f === "lowered" ? "bg-loss text-white" :
                                            f === "maintained" ? "bg-amber-500 text-white" :
                                                "bg-primary text-primary-foreground"
                                    : "bg-surface border border-border text-text-muted hover:text-text-main"
                                    }`}
                            >
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                        ))}
                    </div>
                </motion.div>

                {/* Stats */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-surface border border-border rounded-xl p-4">
                        <p className="text-xs text-text-muted mb-1">Tracked</p>
                        <p className="text-2xl font-bold font-mono text-primary">{loading ? "—" : data.length}</p>
                    </div>
                    <div className="bg-surface border border-profit/20 rounded-xl p-4">
                        <p className="text-xs text-text-muted mb-1">Raised</p>
                        <p className="text-2xl font-bold font-mono text-profit">{loading ? "—" : raised}</p>
                    </div>
                    <div className="bg-surface border border-loss/20 rounded-xl p-4">
                        <p className="text-xs text-text-muted mb-1">Lowered</p>
                        <p className="text-2xl font-bold font-mono text-loss">{loading ? "—" : lowered}</p>
                    </div>
                    <div className="bg-surface border border-amber-500/20 rounded-xl p-4">
                        <p className="text-xs text-text-muted mb-1">Maintained</p>
                        <p className="text-2xl font-bold font-mono text-amber-400">{loading ? "—" : maintained}</p>
                    </div>
                </motion.div>

                {/* Content */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-sm text-text-muted">Fetching analyst guidance estimates...</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-20">
                        <p className="text-red-400 text-sm">{error}</p>
                        <button onClick={fetchData} className="mt-3 px-4 py-2 bg-primary/20 text-primary rounded-lg text-sm">Retry</button>
                    </div>
                ) : (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filtered.map((item, i) => {
                            const cfg = signalConfig[item.guidance_signal || ""] || { label: "N/A", bg: "bg-white/5", text: "text-text-muted", icon: "?" };
                            return (
                                <motion.div
                                    key={item.ticker}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: Math.min(i * 0.04, 0.5) }}
                                    onClick={() => setSelectedItem(selectedItem?.ticker === item.ticker ? null : item)}
                                    className={`p-5 rounded-xl border cursor-pointer group transition-all hover:shadow-lg ${item.guidance_signal === "raised" ? "border-profit/30 bg-profit/5 hover:border-profit/60" :
                                        item.guidance_signal === "lowered" ? "border-loss/30 bg-loss/5 hover:border-loss/60" :
                                            "border-border bg-surface hover:border-primary/40"
                                        }`}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-lg font-bold text-primary">{item.ticker}</span>
                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${cfg.bg} ${cfg.text}`}>
                                                {cfg.icon} {cfg.label}
                                            </span>
                                        </div>
                                        {item.consensus && (
                                            <span className="text-[10px] uppercase text-text-muted bg-white/5 px-2 py-0.5 rounded">
                                                {item.consensus.replace("_", " ")}
                                            </span>
                                        )}
                                    </div>

                                    <p className="text-sm text-text-muted mb-3 truncate">{item.company_name}</p>

                                    <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                                        <div>
                                            <span className="text-text-muted">EPS This Year</span>
                                            <p className="font-mono font-semibold">{item.eps_current_year != null ? `$${item.eps_current_year.toFixed(2)}` : "—"}</p>
                                        </div>
                                        <div>
                                            <span className="text-text-muted">EPS Next Year</span>
                                            <p className="font-mono font-semibold">{item.eps_next_year != null ? `$${item.eps_next_year.toFixed(2)}` : "—"}</p>
                                        </div>
                                    </div>

                                    {item.eps_growth_pct != null && (
                                        <div className="flex items-center gap-2 text-xs">
                                            <span className="text-text-muted">EPS Growth:</span>
                                            <span className={`font-mono font-bold ${item.eps_growth_pct > 0 ? "text-profit" : "text-loss"}`}>
                                                {item.eps_growth_pct > 0 ? "+" : ""}{item.eps_growth_pct.toFixed(1)}%
                                            </span>
                                        </div>
                                    )}

                                    {item.price_target_upside != null && (
                                        <div className="flex items-center gap-2 text-xs mt-1">
                                            <span className="text-text-muted">Target Upside:</span>
                                            <span className={`font-mono font-bold ${item.price_target_upside > 0 ? "text-profit" : "text-loss"}`}>
                                                {item.price_target_upside > 0 ? "+" : ""}{item.price_target_upside.toFixed(1)}%
                                            </span>
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}

                        {filtered.length === 0 && (
                            <div className="col-span-full text-center py-12">
                                <p className="text-sm text-text-muted">No guidance data matches your filters</p>
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
                                        {selectedItem.guidance_signal && (
                                            <span className={`text-xs font-semibold px-2.5 py-1 rounded ${signalConfig[selectedItem.guidance_signal]?.bg
                                                } ${signalConfig[selectedItem.guidance_signal]?.text}`}>
                                                {signalConfig[selectedItem.guidance_signal]?.icon} {signalConfig[selectedItem.guidance_signal]?.label}
                                            </span>
                                        )}
                                    </div>
                                    <button onClick={() => setSelectedItem(null)} className="text-text-muted hover:text-text-main p-1">✕</button>
                                </div>
                                <p className="text-text-muted mb-4">{selectedItem.company_name}</p>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="bg-white/5 rounded-lg p-4">
                                        <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">EPS Current Year</p>
                                        <p className="font-mono text-lg font-bold">{selectedItem.eps_current_year != null ? `$${selectedItem.eps_current_year.toFixed(2)}` : "—"}</p>
                                    </div>
                                    <div className="bg-white/5 rounded-lg p-4">
                                        <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">EPS Next Year</p>
                                        <p className="font-mono text-lg font-bold">{selectedItem.eps_next_year != null ? `$${selectedItem.eps_next_year.toFixed(2)}` : "—"}</p>
                                    </div>
                                    <div className="bg-white/5 rounded-lg p-4">
                                        <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">EPS Growth</p>
                                        <p className={`font-mono text-lg font-bold ${(selectedItem.eps_growth_pct || 0) > 0 ? "text-profit" : "text-loss"}`}>
                                            {selectedItem.eps_growth_pct != null ? `${selectedItem.eps_growth_pct > 0 ? "+" : ""}${selectedItem.eps_growth_pct.toFixed(1)}%` : "—"}
                                        </p>
                                    </div>
                                    <div className="bg-white/5 rounded-lg p-4">
                                        <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Price Target</p>
                                        <p className="font-mono text-lg font-bold">{selectedItem.price_target_mean != null ? `$${selectedItem.price_target_mean.toFixed(0)}` : "—"}</p>
                                    </div>
                                </div>
                                {selectedItem.price_target_upside != null && (
                                    <div className="bg-white/5 rounded-lg p-4">
                                        <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Implied Upside to Target</p>
                                        <p className={`font-mono text-lg font-bold ${selectedItem.price_target_upside > 0 ? "text-profit" : "text-loss"}`}>
                                            {selectedItem.price_target_upside > 0 ? "+" : ""}{selectedItem.price_target_upside.toFixed(1)}%
                                        </p>
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
