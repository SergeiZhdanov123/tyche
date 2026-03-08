"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardLayout } from "@/components/dashboard-layout";
import { config } from "@/lib/config";

const BACKEND = config.apiUrl;

interface SentimentItem {
    ticker: string;
    company_name: string;
    score: number | null;
    label: string | null;
    filing_type: string | null;
    filed_date: string | null;
    positive_cues: number;
    negative_cues: number;
}

export default function EarningsSentimentPage() {
    const [data, setData] = useState<SentimentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<SentimentItem | null>(null);
    const [deepAnalysis, setDeepAnalysis] = useState<string | null>(null);
    const [deepLoading, setDeepLoading] = useState(false);
    const [labelFilter, setLabelFilter] = useState<"all" | "positive" | "negative" | "neutral">("all");
    const [tickerInput, setTickerInput] = useState("AAPL,MSFT,GOOGL,AMZN,NVDA,META,TSLA,JPM,V,WMT");

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${BACKEND}/earnings/sentiment-batch?tickers=${encodeURIComponent(tickerInput)}`);
            const json = await res.json();
            setData(json.items || []);
        } catch {
            setError("Failed to load sentiment data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const fetchDeepAnalysis = useCallback(async (item: SentimentItem) => {
        setSelectedItem(item);
        setDeepAnalysis(null);
        setDeepLoading(true);
        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [{
                        role: "user",
                        content: `Analyze the SEC filing sentiment for ${item.ticker} (${item.company_name}).

The latest ${item.filing_type || "10-Q/10-K"} filing (${item.filed_date || "recent"}) has a sentiment score of ${item.score?.toFixed(2) || "N/A"} (${item.label || "unknown"}).
- Positive language cues: ${item.positive_cues}
- Negative language cues: ${item.negative_cues}

Provide a brief analysis (under 250 words):
1. What does this sentiment score suggest about the company's outlook?
2. Key risks or opportunities implied by the filing language
3. How this compares to typical filing sentiment for this industry
4. Trading implications — is the sentiment aligned with market expectations?

Be specific and data-driven.`
                    }]
                }),
            });
            const d = await res.json();
            if (d.reply) setDeepAnalysis(d.reply);
        } catch {
            setDeepAnalysis("Failed to generate analysis.");
        } finally {
            setDeepLoading(false);
        }
    }, []);

    const filtered = data.filter(d => {
        if (labelFilter === "all") return true;
        return d.label === labelFilter;
    });

    const positive = data.filter(d => d.label === "positive").length;
    const negative = data.filter(d => d.label === "negative").length;
    const neutral = data.filter(d => d.label === "neutral").length;
    const avgScore = data.length > 0 ? data.reduce((s, d) => s + (d.score || 0), 0) / data.length : 0;

    const scoreToColor = (score: number | null) => {
        if (score == null) return "text-text-muted";
        if (score > 0.15) return "text-profit";
        if (score < -0.15) return "text-loss";
        return "text-amber-400";
    };

    const scoreToGradient = (score: number | null) => {
        if (score == null) return "from-gray-500/20 to-gray-500/5";
        if (score > 0.15) return "from-profit/20 to-profit/5";
        if (score < -0.15) return "from-loss/20 to-loss/5";
        return "from-amber-500/20 to-amber-500/5";
    };

    return (
        <DashboardLayout title="Earnings Sentiment" subtitle="AI-powered SEC filing sentiment analysis">
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
                        {loading ? "Analyzing..." : "Scan Filings"}
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted">Sentiment:</span>
                    {(["all", "positive", "negative", "neutral"] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setLabelFilter(f)}
                            className={`px-3 py-1 text-xs rounded-lg transition ${labelFilter === f
                                ? f === "positive" ? "bg-profit text-white" :
                                    f === "negative" ? "bg-loss text-white" :
                                        f === "neutral" ? "bg-amber-500 text-white" :
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
                    <p className="text-xs text-text-muted mb-1">Filings Analyzed</p>
                    <p className="text-2xl font-bold font-mono text-primary">{loading ? "—" : data.length}</p>
                </div>
                <div className="bg-surface border border-profit/20 rounded-xl p-4">
                    <p className="text-xs text-text-muted mb-1">Positive</p>
                    <p className="text-2xl font-bold font-mono text-profit">{loading ? "—" : positive}</p>
                </div>
                <div className="bg-surface border border-loss/20 rounded-xl p-4">
                    <p className="text-xs text-text-muted mb-1">Negative</p>
                    <p className="text-2xl font-bold font-mono text-loss">{loading ? "—" : negative}</p>
                </div>
                <div className="bg-surface border border-border rounded-xl p-4">
                    <p className="text-xs text-text-muted mb-1">Avg Score</p>
                    <p className={`text-2xl font-bold font-mono ${scoreToColor(avgScore)}`}>
                        {loading ? "—" : avgScore.toFixed(3)}
                    </p>
                </div>
            </motion.div>

            {/* Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-sm text-text-muted">Reading SEC filings and analyzing sentiment...</p>
                    <p className="text-xs text-text-muted/50 mt-1">This may take a moment</p>
                </div>
            ) : error ? (
                <div className="text-center py-20">
                    <p className="text-red-400 text-sm">{error}</p>
                    <button onClick={fetchData} className="mt-3 px-4 py-2 bg-primary/20 text-primary rounded-lg text-sm">Retry</button>
                </div>
            ) : (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid md:grid-cols-2 gap-4">
                    {filtered.map((item, i) => (
                        <motion.div
                            key={item.ticker}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: Math.min(i * 0.05, 0.5) }}
                            onClick={() => fetchDeepAnalysis(item)}
                            className={`p-5 rounded-xl border cursor-pointer group transition-all hover:shadow-lg bg-gradient-to-br ${scoreToGradient(item.score)} ${item.label === "positive" ? "border-profit/30 hover:border-profit/60" :
                                item.label === "negative" ? "border-loss/30 hover:border-loss/60" :
                                    "border-border hover:border-primary/40"
                                }`}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <span className="font-mono text-lg font-bold text-primary">{item.ticker}</span>
                                    {item.label && (
                                        <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${item.label === "positive" ? "bg-profit/20 text-profit" :
                                            item.label === "negative" ? "bg-loss/20 text-loss" :
                                                "bg-amber-500/20 text-amber-400"
                                            }`}>
                                            {item.label}
                                        </span>
                                    )}
                                </div>
                                <span className="text-xs text-text-muted">{item.filing_type} • {item.filed_date}</span>
                            </div>

                            <p className="text-sm text-text-muted mb-4 truncate">{item.company_name}</p>

                            {/* Sentiment Gauge */}
                            <div className="mb-3">
                                <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                                    <span>Bearish</span>
                                    <span className={`font-mono font-bold ${scoreToColor(item.score)}`}>
                                        {item.score != null ? item.score.toFixed(3) : "—"}
                                    </span>
                                    <span>Bullish</span>
                                </div>
                                <div className="h-2 bg-border rounded-full overflow-hidden relative">
                                    <div className="absolute inset-0 flex">
                                        <div className="w-1/2 h-full bg-loss/20" />
                                        <div className="w-1/2 h-full bg-profit/20" />
                                    </div>
                                    {item.score != null && (
                                        <div
                                            className={`absolute top-0 w-3 h-full rounded-full ${item.score > 0.15 ? "bg-profit" :
                                                item.score < -0.15 ? "bg-loss" :
                                                    "bg-amber-400"
                                                }`}
                                            style={{ left: `${Math.max(0, Math.min(97, (item.score + 1) / 2 * 100))}%` }}
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Cues */}
                            <div className="flex items-center gap-4 text-xs">
                                <span className="text-profit">+{item.positive_cues} positive cues</span>
                                <span className="text-loss">-{item.negative_cues} negative cues</span>
                            </div>

                            <div className="flex items-center gap-1 mt-3 text-xs text-text-muted/40 group-hover:text-primary/60 transition-colors">
                                <span>Click for AI deep-dive</span>
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                </svg>
                            </div>
                        </motion.div>
                    ))}

                    {filtered.length === 0 && (
                        <div className="col-span-full text-center py-12">
                            <p className="text-sm text-text-muted">No sentiment data matches your filters</p>
                        </div>
                    )}
                </motion.div>
            )}

            {/* Deep Analysis Modal */}
            <AnimatePresence>
                {selectedItem && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => { setSelectedItem(null); setDeepAnalysis(null); }}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="bg-surface border border-border rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="sticky top-0 bg-surface/95 backdrop-blur-sm px-8 py-5 border-b border-border z-10">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-2xl font-bold text-primary">{selectedItem.ticker}</span>
                                        <span className={`text-xs font-semibold uppercase px-2.5 py-1 rounded ${selectedItem.label === "positive" ? "bg-profit/20 text-profit" :
                                            selectedItem.label === "negative" ? "bg-loss/20 text-loss" :
                                                "bg-amber-500/20 text-amber-400"
                                            }`}>
                                            {selectedItem.label}
                                        </span>
                                    </div>
                                    <button onClick={() => { setSelectedItem(null); setDeepAnalysis(null); }} className="text-text-muted hover:text-text-main p-1">✕</button>
                                </div>
                            </div>

                            <div className="px-8 py-6">
                                <p className="text-text-muted mb-4">{selectedItem.company_name}</p>

                                <div className="grid grid-cols-3 gap-3 mb-6">
                                    <div className="bg-white/5 rounded-lg p-3 text-center">
                                        <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Score</p>
                                        <p className={`font-mono font-bold text-lg ${scoreToColor(selectedItem.score)}`}>
                                            {selectedItem.score?.toFixed(3) || "—"}
                                        </p>
                                    </div>
                                    <div className="bg-white/5 rounded-lg p-3 text-center">
                                        <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Filing</p>
                                        <p className="font-semibold text-sm">{selectedItem.filing_type}</p>
                                    </div>
                                    <div className="bg-white/5 rounded-lg p-3 text-center">
                                        <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Filed</p>
                                        <p className="font-semibold text-sm">{selectedItem.filed_date}</p>
                                    </div>
                                </div>

                                <h4 className="text-sm font-semibold text-text-main mb-3 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-primary" />
                                    AI Sentiment Analysis
                                </h4>

                                {deepLoading ? (
                                    <div className="flex items-center gap-3 py-8 justify-center">
                                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                        <span className="text-sm text-text-muted">Generating AI analysis...</span>
                                    </div>
                                ) : deepAnalysis ? (
                                    <div className="prose prose-invert prose-sm max-w-none text-text-muted leading-relaxed whitespace-pre-wrap">
                                        {deepAnalysis}
                                    </div>
                                ) : (
                                    <p className="text-sm text-text-muted/50 text-center py-4">Analysis loading...</p>
                                )}
                            </div>

                            <div className="px-8 py-4 border-t border-border">
                                <p className="text-[10px] text-text-muted/30">Powered by AI Insights • SEC filing analysis is for informational purposes only</p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </DashboardLayout>
    );
}
