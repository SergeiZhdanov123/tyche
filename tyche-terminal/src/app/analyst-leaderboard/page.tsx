"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardLayout } from "@/components/dashboard-layout";
import { config } from "@/lib/config";

const BACKEND = config.apiUrl;

interface LeaderboardEntry {
    ticker: string;
    company_name: string;
    buy_count: number | null;
    hold_count: number | null;
    sell_count: number | null;
    total_analysts: number | null;
    consensus: string | null;
    target_low: number | null;
    target_mean: number | null;
    target_high: number | null;
    implied_upside_pct: number | null;
    accuracy_score: number | null;
}

const consensusColors: Record<string, string> = {
    strongBuy: "text-emerald-400",
    buy: "text-profit",
    hold: "text-amber-400",
    sell: "text-loss",
    strongSell: "text-red-500",
    strong_buy: "text-emerald-400",
};

export default function AnalystLeaderboardPage() {
    const [data, setData] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<"accuracy" | "upside" | "analysts">("accuracy");
    const [selectedRow, setSelectedRow] = useState<LeaderboardEntry | null>(null);
    const [tickerInput, setTickerInput] = useState("AAPL,MSFT,GOOGL,AMZN,NVDA,META,TSLA,JPM,V,WMT,JNJ,PG,UNH,HD,MA");

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${BACKEND}/earnings/analyst-leaderboard?tickers=${encodeURIComponent(tickerInput)}`);
            const json = await res.json();
            setData(json.items || []);
        } catch {
            setError("Failed to load analyst data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const sorted = [...data].sort((a, b) => {
        if (sortBy === "accuracy") return (b.accuracy_score || 0) - (a.accuracy_score || 0);
        if (sortBy === "upside") return (b.implied_upside_pct || 0) - (a.implied_upside_pct || 0);
        return (b.total_analysts || 0) - (a.total_analysts || 0);
    });

    return (
        <DashboardLayout title="Analyst Leaderboard" subtitle="Wall Street analyst consensus & accuracy rankings">
            {/* Controls */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 space-y-3">
                <div className="flex flex-wrap items-end gap-3">
                    <div className="flex-1 min-w-[300px]">
                        <label className="text-xs text-text-muted mb-1 block">Tickers (comma-separated)</label>
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
                    <span className="text-xs text-text-muted">Sort by:</span>
                    {(["accuracy", "upside", "analysts"] as const).map((s) => (
                        <button
                            key={s}
                            onClick={() => setSortBy(s)}
                            className={`px-3 py-1 text-xs rounded-lg transition ${sortBy === s
                                ? "bg-primary text-primary-foreground"
                                : "bg-surface border border-border text-text-muted hover:text-text-main"
                                }`}
                        >
                            {s === "accuracy" ? "Consensus %" : s === "upside" ? "Price Upside" : "# Analysts"}
                        </button>
                    ))}
                </div>
            </motion.div>

            {/* Stats Bar */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-surface border border-border rounded-xl p-4">
                    <p className="text-xs text-text-muted mb-1">Strong Buys</p>
                    <p className="text-2xl font-bold font-mono text-profit">{data.filter(d => d.consensus?.includes("buy")).length}</p>
                </div>
                <div className="bg-surface border border-border rounded-xl p-4">
                    <p className="text-xs text-text-muted mb-1">Coverage</p>
                    <p className="text-2xl font-bold font-mono text-primary">{data.length} stocks</p>
                </div>
                <div className="bg-surface border border-border rounded-xl p-4">
                    <p className="text-xs text-text-muted mb-1">Avg Upside</p>
                    <p className="text-2xl font-bold font-mono text-amber-400">
                        {data.length > 0 ? (data.reduce((s, d) => s + (d.implied_upside_pct || 0), 0) / data.length).toFixed(1) : "—"}%
                    </p>
                </div>
            </motion.div>

            {/* Table */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-sm text-text-muted">Fetching analyst data from Yahoo Finance...</p>
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
                                        <th className="text-center px-4 py-3 font-medium">Consensus</th>
                                        <th className="text-center px-4 py-3 font-medium">Buy</th>
                                        <th className="text-center px-4 py-3 font-medium">Hold</th>
                                        <th className="text-center px-4 py-3 font-medium">Sell</th>
                                        <th className="text-right px-4 py-3 font-medium">Target</th>
                                        <th className="text-right px-4 py-3 font-medium">Upside</th>
                                        <th className="text-right px-4 py-3 font-medium">Score</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sorted.map((item, i) => (
                                        <tr
                                            key={item.ticker}
                                            onClick={() => setSelectedRow(selectedRow?.ticker === item.ticker ? null : item)}
                                            className="border-b border-border/50 hover:bg-white/5 cursor-pointer transition-colors"
                                        >
                                            <td className="px-4 py-3 text-text-muted font-mono text-xs">{i + 1}</td>
                                            <td className="px-4 py-3 font-mono font-bold text-primary">{item.ticker}</td>
                                            <td className="px-4 py-3 text-text-main truncate max-w-[200px]">{item.company_name}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`text-xs font-semibold uppercase ${consensusColors[item.consensus || ""] || "text-text-muted"}`}>
                                                    {item.consensus?.replace("_", " ") || "—"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center font-mono text-profit">{item.buy_count ?? "—"}</td>
                                            <td className="px-4 py-3 text-center font-mono text-amber-400">{item.hold_count ?? "—"}</td>
                                            <td className="px-4 py-3 text-center font-mono text-loss">{item.sell_count ?? "—"}</td>
                                            <td className="px-4 py-3 text-right font-mono">${item.target_mean?.toFixed(0) ?? "—"}</td>
                                            <td className={`px-4 py-3 text-right font-mono font-semibold ${(item.implied_upside_pct || 0) > 0 ? "text-profit" : "text-loss"}`}>
                                                {item.implied_upside_pct != null ? `${item.implied_upside_pct > 0 ? "+" : ""}${item.implied_upside_pct.toFixed(1)}%` : "—"}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
                                                        <div className="h-full bg-primary rounded-full" style={{ width: `${item.accuracy_score || 0}%` }} />
                                                    </div>
                                                    <span className="font-mono text-xs">{item.accuracy_score?.toFixed(0) ?? "—"}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Expanded Detail */}
                    <AnimatePresence>
                        {selectedRow && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-4 bg-surface border border-primary/30 rounded-xl p-6"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-primary font-mono">{selectedRow.ticker} — {selectedRow.company_name}</h3>
                                    <button onClick={() => setSelectedRow(null)} className="text-text-muted hover:text-text-main text-sm">✕</button>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-white/5 rounded-lg p-3">
                                        <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Price Target Range</p>
                                        <p className="font-mono text-sm text-text-main">
                                            ${selectedRow.target_low?.toFixed(0) ?? "?"} — ${selectedRow.target_high?.toFixed(0) ?? "?"}
                                        </p>
                                    </div>
                                    <div className="bg-white/5 rounded-lg p-3">
                                        <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Mean Target</p>
                                        <p className="font-mono text-sm font-bold text-primary">${selectedRow.target_mean?.toFixed(2) ?? "—"}</p>
                                    </div>
                                    <div className="bg-white/5 rounded-lg p-3">
                                        <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Analysts Covering</p>
                                        <p className="font-mono text-sm text-text-main">{selectedRow.total_analysts ?? "—"}</p>
                                    </div>
                                    <div className="bg-white/5 rounded-lg p-3">
                                        <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Buy Ratio</p>
                                        <div className="flex gap-1 mt-1">
                                            <div className="h-3 bg-profit rounded" style={{ width: `${((selectedRow.buy_count || 0) / ((selectedRow.buy_count || 0) + (selectedRow.hold_count || 0) + (selectedRow.sell_count || 0) || 1)) * 100}%`, minWidth: 4 }} />
                                            <div className="h-3 bg-amber-400 rounded" style={{ width: `${((selectedRow.hold_count || 0) / ((selectedRow.buy_count || 0) + (selectedRow.hold_count || 0) + (selectedRow.sell_count || 0) || 1)) * 100}%`, minWidth: 4 }} />
                                            <div className="h-3 bg-loss rounded" style={{ width: `${((selectedRow.sell_count || 0) / ((selectedRow.buy_count || 0) + (selectedRow.hold_count || 0) + (selectedRow.sell_count || 0) || 1)) * 100}%`, minWidth: 4 }} />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}
        </DashboardLayout>
    );
}
