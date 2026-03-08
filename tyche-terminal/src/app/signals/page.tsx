"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ProGate } from "@/components/pro-gate";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useUser } from "@clerk/nextjs";

/* ── Types ───────────────────────────────────────────────── */

interface Signal {
    id: number;
    type: "bullish" | "bearish" | "neutral";
    symbol: string;
    title: string;
    description: string;
    confidence: number;
    category: string;
    time: string;
    deepAnalysis?: string;
    keyLevels?: { support: string; resistance: string };
    catalysts?: string[];
    risk?: string;
}

/* ── Constants ───────────────────────────────────────────── */

const categories = ["All", "Earnings", "Technical", "Fundamental", "Momentum", "Macro", "AI Insight"];
const types = ["All", "Bullish", "Bearish", "Neutral"];
const DEFAULT_TICKERS = ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA", "JPM"];

/* ── Icons ───────────────────────────────────────────────── */

const FilterIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
    </svg>
);

const RefreshIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 19.644l3.181-3.182" />
    </svg>
);

const CloseIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" d="M18 6L6 18M6 6l12 12" />
    </svg>
);

const ChevronRight = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
);

/* ── Main Component ──────────────────────────────────────── */

export default function SignalsPage() {
    const { user: clerkUser } = useUser();
    const [signals, setSignals] = useState<Signal[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [selectedType, setSelectedType] = useState("All");
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
    const [deepLoading, setDeepLoading] = useState(false);

    // Use watchlist tickers synced from Clerk identity
    const { tickers: watchlistTickers, loading: wlLoading } = useWatchlist(
        clerkUser?.primaryEmailAddress?.emailAddress
    );
    const analysisTickers = watchlistTickers.length > 0 ? watchlistTickers : DEFAULT_TICKERS;

    const fetchSignals = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const tickerList = analysisTickers.join(", ");
            const signalCount = analysisTickers.length;

            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [{
                        role: "user",
                        content: `You are a professional trading signal generator. Today's date is ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.

CRITICAL: All analysis must reference CURRENT data as of today. Do NOT reference outdated quarters or past years as if they are current.

Analyze these ${signalCount} stocks and generate EXACTLY ONE unique signal per stock: ${tickerList}.

For each stock, provide a trading signal based on CURRENT market conditions as of today. Each signal must be for a DIFFERENT stock — do NOT repeat any ticker.

Return a JSON array of ${signalCount} objects with these fields:
- "type": "bullish", "bearish", or "neutral"
- "symbol": the ticker symbol (must match one from the list above, each used only ONCE)
- "title": short signal title (e.g. "Earnings Momentum", "Support Break Risk", "Consolidation Phase")
- "description": 2-3 sentence specific analysis. Include CURRENT price levels, recent earnings dates, specific percentage moves, and concrete reasoning. Do NOT be vague.
- "confidence": number 50-95 representing conviction percentage
- "category": one of "Earnings", "Technical", "Fundamental", "Momentum", "Macro", "AI Insight"
- "keyLevels": {"support": "$price", "resistance": "$price"} — current key technical levels with dollar signs
- "catalysts": array of 2-3 specific upcoming catalysts with approximate dates (e.g. "Q1 2026 earnings March 28", "Fed meeting March 19")
- "risk": one sentence describing the primary risk to this thesis

Be specific with real price levels, percentages, and recent events. No filler text.

IMPORTANT: Return ONLY the raw JSON array. No markdown, no code blocks, no explanations.`
                    }]
                }),
            });

            const data = await res.json();

            if (data.reply) {
                try {
                    let jsonStr = data.reply.trim();
                    if (jsonStr.startsWith("```")) {
                        jsonStr = jsonStr.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
                    }
                    const parsed = JSON.parse(jsonStr);

                    if (Array.isArray(parsed)) {
                        // Deduplicate by symbol — keep only the first signal per ticker
                        const seen = new Set<string>();
                        const unique = parsed.filter((s: Record<string, unknown>) => {
                            const sym = String(s.symbol || "").toUpperCase();
                            if (seen.has(sym)) return false;
                            seen.add(sym);
                            return true;
                        });

                        const mapped: Signal[] = unique.map((s: Record<string, unknown>, i: number) => ({
                            id: i + 1,
                            type: (["bullish", "bearish", "neutral"].includes(String(s.type)) ? s.type : "neutral") as Signal["type"],
                            symbol: String(s.symbol || "???").toUpperCase(),
                            title: String(s.title || "Signal"),
                            description: String(s.description || ""),
                            confidence: Math.min(95, Math.max(50, Number(s.confidence) || 65)),
                            category: String(s.category || "AI Insight"),
                            time: "Just now",
                            keyLevels: s.keyLevels as Signal["keyLevels"] || undefined,
                            catalysts: Array.isArray(s.catalysts) ? (s.catalysts as string[]) : undefined,
                            risk: s.risk ? String(s.risk) : undefined,
                        }));
                        setSignals(mapped);
                        setLastUpdated(new Date());
                    }
                } catch {
                    setError("Failed to parse AI response. Please try again.");
                }
            } else {
                setError(data.error || "No response from AI service.");
            }
        } catch {
            setError("Failed to fetch signals. Check your connection.");
        } finally {
            setLoading(false);
        }
    }, [analysisTickers]);

    useEffect(() => {
        if (!wlLoading) fetchSignals();
    }, [fetchSignals, wlLoading]);

    // Deep analysis on demand
    const fetchDeepAnalysis = useCallback(async (signal: Signal) => {
        setSelectedSignal(signal);
        if (signal.deepAnalysis) return; // Already fetched

        setDeepLoading(true);
        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [{
                        role: "user",
                        content: `Today's date is ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.

Provide an actionable deep-dive analysis for ${signal.symbol}. The current signal is **${signal.type}** with the thesis: "${signal.title} — ${signal.description}"

CRITICAL RULES:
- All data must be CURRENT as of today's date. Do NOT reference 2024 data as if it's current.
- Every section MUST include specific numbers (prices, percentages, ratios, dates).
- No filler paragraphs. Every sentence must add value.
- Use markdown formatting: ## for section headers, **bold** for key numbers, bullet points for lists.

Structure:

## Current Position
Exact current price, 52-week range, where it sits relative to major moving averages (50/200 day).

## Recent Earnings (Most Recent Quarter)
Exact EPS reported vs estimate, revenue reported vs estimate, surprise %, YoY growth rate. What guidance did management give?

## Technical Setup
Specific support/resistance levels with dollar prices. RSI reading. Whether it's above/below key moving averages. Volume trend.

## Upcoming Catalysts
Bullet list of 3-5 specific events with dates: next earnings date, ex-dividend date, product launches, regulatory decisions, macro events.

## Risk Factors
2-3 specific risks with concrete scenarios (e.g. "If revenue misses by >5%, stock could test $XXX support").

## Trade Setup
Entry zone (specific price range), target price, stop loss level. Risk/reward ratio.

Keep it under 400 words. Dense with data, zero fluff.`
                    }]
                }),
            });

            const data = await res.json();
            if (data.reply) {
                setSignals(prev => prev.map(s =>
                    s.id === signal.id ? { ...s, deepAnalysis: data.reply } : s
                ));
                setSelectedSignal(prev => prev ? { ...prev, deepAnalysis: data.reply } : null);
            }
        } catch {
            // Silently fail
        } finally {
            setDeepLoading(false);
        }
    }, []);

    const filteredSignals = signals.filter((signal) => {
        const categoryMatch = selectedCategory === "All" || signal.category === selectedCategory;
        const typeMatch = selectedType === "All" || signal.type === selectedType.toLowerCase();
        return categoryMatch && typeMatch;
    });

    const stats = {
        total: signals.length,
        bullish: signals.filter((s) => s.type === "bullish").length,
        bearish: signals.filter((s) => s.type === "bearish").length,
        neutral: signals.filter((s) => s.type === "neutral").length,
    };

    return (
        <DashboardLayout title="Trading Signals" subtitle="AI-powered trading signals and analysis">
            <ProGate feature="AI Trading Signals">
                {/* Filters */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-6 space-y-4"
                >
                    {/* Category Filter */}
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm text-text-muted mr-2 flex items-center gap-1">
                            <FilterIcon /> Category:
                        </span>
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-3 py-1.5 text-sm rounded-lg transition-all ${selectedCategory === cat
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-surface border border-border text-text-muted hover:text-text-main hover:border-primary/50"
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    {/* Type Filter + Refresh */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-text-muted mr-2">Signal Type:</span>
                            {types.map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setSelectedType(type)}
                                    className={`px-3 py-1.5 text-sm rounded-lg transition-all ${selectedType === type
                                        ? type === "Bullish" ? "bg-profit text-white" :
                                            type === "Bearish" ? "bg-loss text-white" :
                                                "bg-primary text-primary-foreground"
                                        : "bg-surface border border-border text-text-muted hover:text-text-main hover:border-primary/50"
                                        }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-3">
                            {lastUpdated && (
                                <span className="text-xs text-text-muted flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    Updated {lastUpdated.toLocaleTimeString()}
                                </span>
                            )}
                            <button
                                onClick={fetchSignals}
                                disabled={loading}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-surface border border-border text-text-muted hover:text-text-main rounded-lg transition-colors disabled:opacity-50"
                            >
                                <RefreshIcon />
                                {loading ? "Analyzing..." : "Refresh"}
                            </button>
                        </div>
                    </div>

                    {/* Active tickers strip */}
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                        <span>Analyzing:</span>
                        <div className="flex flex-wrap gap-1">
                            {analysisTickers.map((t) => (
                                <span key={t} className="px-2 py-0.5 rounded bg-white/5 font-mono text-primary/80">{t}</span>
                            ))}
                        </div>
                    </div>
                </motion.div>

                {/* Signal Stats */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
                >
                    {[
                        { label: "Active Signals", value: stats.total, color: "text-primary" },
                        { label: "Bullish", value: stats.bullish, color: "text-profit" },
                        { label: "Bearish", value: stats.bearish, color: "text-loss" },
                        { label: "Neutral", value: stats.neutral, color: "text-text-muted" },
                    ].map((stat, i) => (
                        <div key={i} className="bg-surface border border-border rounded-xl p-4">
                            <p className="text-sm text-text-muted mb-1">{stat.label}</p>
                            <p className={`text-2xl font-bold font-mono ${stat.color}`}>
                                {loading ? "—" : stat.value}
                            </p>
                        </div>
                    ))}
                </motion.div>

                {/* Loading State */}
                {loading && signals.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-20"
                    >
                        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-sm text-text-muted">Generating AI signals...</p>
                        <p className="text-xs text-text-muted/50 mt-1">Analyzing {analysisTickers.length} stocks — one signal per ticker</p>
                    </motion.div>
                ) : error ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="text-center">
                            <p className="text-red-400 text-sm mb-2">{error}</p>
                            <button onClick={fetchSignals} className="mt-3 px-4 py-2 bg-primary/20 text-primary rounded-lg text-sm">
                                Try Again
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Signals Grid */
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="grid md:grid-cols-2 gap-4"
                    >
                        {filteredSignals.map((signal, i) => (
                            <motion.div
                                key={signal.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                onClick={() => fetchDeepAnalysis(signal)}
                                className={`p-5 rounded-xl border cursor-pointer group transition-all hover:shadow-lg ${signal.type === "bullish" ? "border-profit/30 bg-profit/5 hover:border-profit/60" :
                                    signal.type === "bearish" ? "border-loss/30 bg-loss/5 hover:border-loss/60" :
                                        "border-border bg-surface hover:border-primary/40"
                                    }`}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <span className={`text-xs font-semibold uppercase px-2 py-1 rounded ${signal.type === "bullish" ? "bg-profit/20 text-profit" :
                                            signal.type === "bearish" ? "bg-loss/20 text-loss" :
                                                "bg-white/10 text-text-muted"
                                            }`}>
                                            {signal.type}
                                        </span>
                                        <span className="px-2 py-1 text-xs rounded bg-white/5 text-text-muted">{signal.category}</span>
                                    </div>
                                    <span className="text-xs text-text-muted">{signal.time}</span>
                                </div>

                                <div className="flex items-center gap-3 mb-2">
                                    <span className="font-mono text-xl font-bold text-primary">{signal.symbol}</span>
                                    <span className="font-semibold text-text-main">{signal.title}</span>
                                </div>

                                <p className="text-sm text-text-muted mb-3">{signal.description}</p>

                                {/* Key Levels */}
                                {signal.keyLevels && (
                                    <div className="flex gap-4 mb-3 text-xs">
                                        <span className="text-profit">▲ Resistance: {signal.keyLevels.resistance}</span>
                                        <span className="text-loss">▼ Support: {signal.keyLevels.support}</span>
                                    </div>
                                )}

                                {/* Catalysts */}
                                {signal.catalysts && signal.catalysts.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mb-3">
                                        {signal.catalysts.map((c, j) => (
                                            <span key={j} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary/80">{c}</span>
                                        ))}
                                    </div>
                                )}

                                {/* Confidence Bar */}
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${signal.type === "bullish" ? "bg-profit" : signal.type === "bearish" ? "bg-loss" : "bg-primary"}`}
                                            style={{ width: `${signal.confidence}%` }}
                                        />
                                    </div>
                                    <span className="text-sm font-mono text-text-muted">{signal.confidence}%</span>
                                </div>

                                {/* Risk */}
                                {signal.risk && (
                                    <p className="text-[11px] text-loss/70 mt-1">⚠ {signal.risk}</p>
                                )}

                                {/* Click hint */}
                                <div className="flex items-center gap-1 mt-3 text-xs text-text-muted/50 group-hover:text-primary/60 transition-colors">
                                    <span>Click for deep analysis</span>
                                    <ChevronRight />
                                </div>
                            </motion.div>
                        ))}

                        {filteredSignals.length === 0 && (
                            <div className="col-span-2 text-center py-12">
                                <p className="text-sm text-text-muted">No signals match your filters</p>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Deep Analysis Modal */}
                <AnimatePresence>
                    {selectedSignal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
                            onClick={() => setSelectedSignal(null)}
                        >
                            <motion.div
                                initial={{ scale: 0.95, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.95, y: 20 }}
                                className="bg-surface border border-border rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-2xl"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Modal Header */}
                                <div className="sticky top-0 bg-surface/95 backdrop-blur-sm px-8 py-5 border-b border-border flex items-center justify-between z-10">
                                    <div className="flex items-center gap-4">
                                        <span className="font-mono text-2xl font-bold text-primary">{selectedSignal.symbol}</span>
                                        <span className={`text-xs font-semibold uppercase px-2.5 py-1 rounded ${selectedSignal.type === "bullish" ? "bg-profit/20 text-profit" :
                                            selectedSignal.type === "bearish" ? "bg-loss/20 text-loss" :
                                                "bg-white/10 text-text-muted"
                                            }`}>
                                            {selectedSignal.type}
                                        </span>
                                        <span className="text-sm text-text-muted">{selectedSignal.title}</span>
                                    </div>
                                    <button onClick={() => setSelectedSignal(null)} className="text-text-muted hover:text-text-main transition-colors p-1">
                                        <CloseIcon />
                                    </button>
                                </div>

                                {/* Modal Content */}
                                <div className="px-8 py-6">
                                    {/* Signal Summary */}
                                    <div className={`p-4 rounded-xl mb-6 ${selectedSignal.type === "bullish" ? "bg-profit/5 border border-profit/20" :
                                        selectedSignal.type === "bearish" ? "bg-loss/5 border border-loss/20" :
                                            "bg-white/5 border border-border"
                                        }`}>
                                        <p className="text-sm text-text-main mb-3">{selectedSignal.description}</p>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-text-muted">Confidence:</span>
                                            <div className="flex-1 h-2 bg-border rounded-full overflow-hidden max-w-[200px]">
                                                <div
                                                    className={`h-full rounded-full ${selectedSignal.type === "bullish" ? "bg-profit" : selectedSignal.type === "bearish" ? "bg-loss" : "bg-primary"}`}
                                                    style={{ width: `${selectedSignal.confidence}%` }}
                                                />
                                            </div>
                                            <span className="text-sm font-mono font-bold">{selectedSignal.confidence}%</span>
                                        </div>
                                    </div>

                                    {/* Quick Stats Row */}
                                    <div className="grid grid-cols-3 gap-3 mb-6">
                                        {selectedSignal.keyLevels && (
                                            <>
                                                <div className="bg-white/5 rounded-lg p-3 text-center">
                                                    <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Support</p>
                                                    <p className="text-loss font-mono font-bold">{selectedSignal.keyLevels.support}</p>
                                                </div>
                                                <div className="bg-white/5 rounded-lg p-3 text-center">
                                                    <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Category</p>
                                                    <p className="text-primary font-semibold text-sm">{selectedSignal.category}</p>
                                                </div>
                                                <div className="bg-white/5 rounded-lg p-3 text-center">
                                                    <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Resistance</p>
                                                    <p className="text-profit font-mono font-bold">{selectedSignal.keyLevels.resistance}</p>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Catalysts */}
                                    {selectedSignal.catalysts && selectedSignal.catalysts.length > 0 && (
                                        <div className="mb-6">
                                            <h4 className="text-sm font-semibold text-text-main mb-2">Key Catalysts</h4>
                                            <div className="space-y-1.5">
                                                {selectedSignal.catalysts.map((c, i) => (
                                                    <div key={i} className="flex items-center gap-2 text-sm text-text-muted">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                                        {c}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Risk */}
                                    {selectedSignal.risk && (
                                        <div className="p-3 rounded-lg bg-loss/5 border border-loss/20 mb-6">
                                            <p className="text-xs font-semibold text-loss mb-1">⚠ Primary Risk</p>
                                            <p className="text-sm text-text-muted">{selectedSignal.risk}</p>
                                        </div>
                                    )}

                                    {/* Deep Analysis */}
                                    <div>
                                        <h4 className="text-sm font-semibold text-text-main mb-3 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-primary" />
                                            Deep Analysis
                                        </h4>

                                        {deepLoading && !selectedSignal.deepAnalysis ? (
                                            <div className="flex items-center gap-3 py-8 justify-center">
                                                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                                <span className="text-sm text-text-muted">Generating deep analysis for {selectedSignal.symbol}...</span>
                                            </div>
                                        ) : selectedSignal.deepAnalysis ? (
                                            <div className="prose prose-invert prose-sm max-w-none text-text-muted leading-relaxed">
                                                {renderMarkdown(selectedSignal.deepAnalysis)}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-text-muted/50 text-center py-4">Analysis will load shortly...</p>
                                        )}
                                    </div>
                                </div>

                                {/* Modal Footer */}
                                <div className="px-8 py-4 border-t border-border flex items-center justify-between">
                                    <p className="text-[10px] text-text-muted/30">Powered by AI Insights • Not financial advice</p>
                                    <button
                                        onClick={() => setSelectedSignal(null)}
                                        className="px-4 py-2 text-sm text-text-muted hover:text-text-main transition-colors"
                                    >
                                        Close
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Powered by */}
                <p className="text-center text-[10px] text-text-muted/30 mt-6">
                    Powered by AI Insights • Signals are AI-generated and not financial advice
                </p>
            </ProGate>
        </DashboardLayout>
    );
}

/* ── Markdown renderer for deep analysis ──────────────────── */

function renderMarkdown(content: string): React.ReactNode {
    const blocks = content.split(/\n\n+/);
    return blocks.map((block, bi) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        // Heading
        const hm = trimmed.match(/^(#{1,3})\s+(.+)$/m);
        if (hm) {
            const cls = hm[1].length === 1
                ? "text-base font-bold text-text-main mt-4 mb-1"
                : hm[1].length === 2
                    ? "text-sm font-bold text-text-main mt-3 mb-1"
                    : "text-sm font-semibold text-primary mt-2 mb-0.5";
            return <div key={bi} className={cls}>{mdInline(hm[2])}</div>;
        }

        // Bullet list
        if (/^[-*•]\s/.test(trimmed)) {
            const items = trimmed.split(/\n/).filter(l => l.trim());
            return (
                <ul key={bi} className="space-y-1 my-1.5 ml-3">
                    {items.map((item, ii) => (
                        <li key={ii} className="flex items-start gap-2 text-sm">
                            <span className="text-primary/60 mt-1 text-[6px]">●</span>
                            <span>{mdInline(item.replace(/^[-*•]\s*/, ""))}</span>
                        </li>
                    ))}
                </ul>
            );
        }

        // Numbered list
        if (/^\d+[.)]\s/.test(trimmed)) {
            const items = trimmed.split(/\n/).filter(l => l.trim());
            return (
                <ol key={bi} className="space-y-1 my-1.5 ml-3">
                    {items.map((item, ii) => (
                        <li key={ii} className="flex items-start gap-2 text-sm">
                            <span className="text-primary/60 font-mono text-xs mt-0.5 w-4 shrink-0">{ii + 1}.</span>
                            <span>{mdInline(item.replace(/^\d+[.)]\s*/, ""))}</span>
                        </li>
                    ))}
                </ol>
            );
        }

        return <p key={bi} className="text-sm my-1">{mdInline(trimmed)}</p>;
    });
}

function mdInline(text: string): React.ReactNode {
    const parts = text.split(/(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
    return parts.map((part, i) => {
        if (part.startsWith("***") && part.endsWith("***"))
            return <strong key={i} className="font-bold italic text-text-main">{part.slice(3, -3)}</strong>;
        if (part.startsWith("**") && part.endsWith("**"))
            return <strong key={i} className="font-bold text-text-main">{part.slice(2, -2)}</strong>;
        if (part.startsWith("*") && part.endsWith("*"))
            return <em key={i} className="italic">{part.slice(1, -1)}</em>;
        if (part.startsWith("`") && part.endsWith("`"))
            return <code key={i} className="bg-white/10 px-1 rounded text-emerald-300 text-xs font-mono">{part.slice(1, -1)}</code>;
        return part;
    });
}
