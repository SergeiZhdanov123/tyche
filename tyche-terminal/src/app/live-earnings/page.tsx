"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useSubscription } from "@/hooks/useSubscription";
import { config } from "@/lib/config";
import Link from "next/link";

/* ── Types ───────────────────────────────────────────────── */

interface MonitorResult {
    ticker: string;
    status: "waiting" | "dropped" | "error";
    company_name: string;
    ir_url: string;
    last_checked: string;
    expected_date?: string;
    expected_time?: string;
    dropped_at?: string;
    headline?: string;
    source_url?: string;
    eps_actual?: string;
    eps_estimate?: string;
    revenue_actual?: string;
    revenue_estimate?: string;
    eps_surprise_pct?: number;
    revenue_surprise_pct?: number;
    beat_eps?: boolean;
    beat_revenue?: boolean;
    guidance?: string;
    error_message?: string;
}

interface MonitorSlot {
    ticker: string;
    result: MonitorResult | null;
    polling: boolean;
}

/* ── Page ────────────────────────────────────────────────── */

export default function LiveEarningsPage() {
    const { isPro, isEnterprise, isPaid, loading: subLoading } = useSubscription();
    const [slots, setSlots] = useState<MonitorSlot[]>([]);
    const [tickerInput, setTickerInput] = useState("");
    const [soundEnabled, setSoundEnabled] = useState(false);
    const intervalsRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const maxSlots = isEnterprise ? 20 : 5;
    const pollInterval = isEnterprise ? 1000 : 3000;

    // Create audio for notifications
    useEffect(() => {
        if (typeof window !== "undefined") {
            const audio = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAACAgICAgICAgICAgICAgICAgA==");
            audioRef.current = audio;
        }
    }, []);

    const pollTicker = useCallback(async (ticker: string) => {
        try {
            const res = await fetch(`${config.apiUrl}/earnings/live-monitor?ticker=${ticker}`);
            if (!res.ok) return;
            const data: MonitorResult = await res.json();

            setSlots(prev => {
                const updated = prev.map(s => {
                    if (s.ticker === ticker) {
                        // If status changed from waiting to dropped, play sound
                        if (s.result?.status === "waiting" && data.status === "dropped" && soundEnabled && audioRef.current) {
                            audioRef.current.play().catch(() => { });
                        }
                        return { ...s, result: data };
                    }
                    return s;
                });
                return updated;
            });
        } catch {
            // Silently fail
        }
    }, [soundEnabled]);

    const addTicker = useCallback(() => {
        const ticker = tickerInput.trim().toUpperCase();
        if (!ticker || slots.length >= maxSlots) return;
        if (slots.some(s => s.ticker === ticker)) return;

        const newSlot: MonitorSlot = { ticker, result: null, polling: true };
        setSlots(prev => [...prev, newSlot]);
        setTickerInput("");

        // Start polling
        pollTicker(ticker); // immediate first poll
        const interval = setInterval(() => pollTicker(ticker), pollInterval);
        intervalsRef.current.set(ticker, interval);
    }, [tickerInput, slots, maxSlots, pollInterval, pollTicker]);

    const removeTicker = useCallback((ticker: string) => {
        const interval = intervalsRef.current.get(ticker);
        if (interval) {
            clearInterval(interval);
            intervalsRef.current.delete(ticker);
        }
        setSlots(prev => prev.filter(s => s.ticker !== ticker));
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            intervalsRef.current.forEach(interval => clearInterval(interval));
            intervalsRef.current.clear();
        };
    }, []);

    // Gate for non-paid users
    if (!subLoading && !isPaid) {
        return (
            <DashboardLayout title="Live Earnings Monitor" subtitle="Real-time earnings detection">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-20"
                >
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500/20 to-primary/20 flex items-center justify-center mb-6">
                        <svg className="w-10 h-10 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-text-main mb-2">Pro Feature</h2>
                    <p className="text-text-muted text-center max-w-md mb-6">
                        Live Earnings Monitor is available for Pro and Enterprise users.
                        Monitor up to {isPro ? 5 : 20} tickers in real-time and get instant alerts when earnings drop.
                    </p>
                    <Link
                        href="/select-plan"
                        className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-primary text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
                    >
                        Upgrade to Pro
                    </Link>
                </motion.div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Live Earnings Monitor" subtitle="Real-time earnings detection from investor relations pages">
            {/* Controls Bar */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={tickerInput}
                            onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
                            onKeyDown={(e) => e.key === "Enter" && addTicker()}
                            placeholder="Enter ticker to monitor (e.g. AAPL)"
                            className="w-full pl-4 pr-4 py-3 bg-surface border border-border rounded-xl text-text-main font-mono text-lg placeholder:text-text-muted/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                            maxLength={10}
                        />
                    </div>
                    <button
                        onClick={addTicker}
                        disabled={!tickerInput.trim() || slots.length >= maxSlots}
                        className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-primary text-white rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                        Start Monitoring
                    </button>
                    <button
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        className={`p-3 rounded-xl border transition-all ${soundEnabled
                            ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400"
                            : "bg-surface border-border text-text-muted hover:text-text-main"
                            }`}
                        title={soundEnabled ? "Sound alerts ON" : "Sound alerts OFF"}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            {soundEnabled ? (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                            )}
                        </svg>
                    </button>
                </div>

                {/* Status line */}
                <div className="flex items-center justify-between text-xs text-text-muted">
                    <span>Monitoring {slots.length}/{maxSlots} tickers • Polling every {pollInterval / 1000}s</span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                        {isPro ? "Pro" : "Enterprise"} Plan
                    </span>
                </div>
            </motion.div>

            {/* Empty State */}
            {slots.length === 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-20"
                >
                    <div className="w-24 h-24 rounded-full border-2 border-dashed border-border flex items-center justify-center mb-6">
                        <svg className="w-10 h-10 text-text-muted/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                        </svg>
                    </div>
                    <p className="text-text-muted text-sm mb-1">No tickers being monitored</p>
                    <p className="text-text-muted/50 text-xs">Enter a ticker above to start watching for earnings drops</p>
                </motion.div>
            )}

            {/* Monitor Slots */}
            <div className="space-y-4">
                <AnimatePresence>
                    {slots.map((slot, i) => (
                        <motion.div
                            key={slot.ticker}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.95 }}
                            transition={{ delay: i * 0.05 }}
                        >
                            {!slot.result ? (
                                /* Loading state */
                                <div className="p-6 rounded-2xl border border-border bg-surface">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                                            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                        </div>
                                        <div>
                                            <p className="font-mono text-lg font-bold text-primary">{slot.ticker}</p>
                                            <p className="text-xs text-text-muted">Connecting to IR page...</p>
                                        </div>
                                    </div>
                                </div>
                            ) : slot.result.status === "waiting" ? (
                                /* Waiting state — radar pulse */
                                <div className="p-6 rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-cyan-500/5 to-transparent relative overflow-hidden">
                                    {/* Pulse effect */}
                                    <div className="absolute right-6 top-1/2 -translate-y-1/2">
                                        <div className="relative w-16 h-16">
                                            <div className="absolute inset-0 rounded-full border border-cyan-500/30 animate-ping" />
                                            <div className="absolute inset-2 rounded-full border border-cyan-500/20 animate-ping" style={{ animationDelay: "0.5s" }} />
                                            <div className="absolute inset-4 rounded-full bg-cyan-500/10 animate-pulse flex items-center justify-center">
                                                <div className="w-2 h-2 rounded-full bg-cyan-400" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-start justify-between pr-24">
                                        <div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="font-mono text-xl font-bold text-primary">{slot.result.ticker}</span>
                                                <span className="text-sm text-text-muted">{slot.result.company_name}</span>
                                                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-cyan-500/20 text-cyan-400 rounded-full">Monitoring</span>
                                            </div>
                                            <p className="text-xs text-text-muted mb-3">Scanning investor relations page for earnings release...</p>

                                            <div className="flex items-center gap-6 text-xs">
                                                {slot.result.expected_date && (
                                                    <span className="text-text-muted">
                                                        Expected: <span className="text-text-main font-semibold">{slot.result.expected_date}</span>
                                                        {slot.result.expected_time && <span className="ml-1 text-cyan-400">{slot.result.expected_time}</span>}
                                                    </span>
                                                )}
                                                {slot.result.eps_estimate && (
                                                    <span className="text-text-muted">
                                                        EPS Est: <span className="text-text-main font-mono">{slot.result.eps_estimate}</span>
                                                    </span>
                                                )}
                                                {slot.result.revenue_estimate && (
                                                    <span className="text-text-muted">
                                                        Rev Est: <span className="text-text-main font-mono">{slot.result.revenue_estimate}</span>
                                                    </span>
                                                )}
                                                <span className="text-text-muted/50">
                                                    Last check: {new Date(slot.result.last_checked).toLocaleTimeString()}
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => removeTicker(slot.ticker)}
                                            className="absolute top-4 right-4 p-1 text-text-muted/30 hover:text-text-muted transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ) : slot.result.status === "dropped" ? (
                                /* DROPPED — Earnings detected! */
                                <div className="rounded-2xl border-2 overflow-hidden"
                                    style={{ borderColor: slot.result.beat_eps ? "rgb(16, 185, 129)" : "rgb(239, 68, 68)" }}
                                >
                                    {/* Header */}
                                    <div className={`px-6 py-4 ${slot.result.beat_eps ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="font-mono text-2xl font-bold text-primary">{slot.result.ticker}</span>
                                                <span className="text-sm text-text-muted">{slot.result.company_name}</span>
                                                <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full ${slot.result.beat_eps
                                                    ? "bg-emerald-500/20 text-emerald-400"
                                                    : "bg-red-500/20 text-red-400"
                                                    }`}>
                                                    {slot.result.beat_eps ? "🟢 EARNINGS BEAT" : "🔴 EARNINGS MISS"}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => removeTicker(slot.ticker)}
                                                className="p-1 text-text-muted/30 hover:text-text-muted transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                        {slot.result.headline && (
                                            <p className="text-sm text-text-main mt-2 font-medium">{slot.result.headline}</p>
                                        )}
                                    </div>

                                    {/* Data Grid */}
                                    <div className="p-6 bg-surface">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                            {/* EPS Actual */}
                                            <div className="bg-white/5 rounded-xl p-4 text-center">
                                                <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">EPS Actual</p>
                                                <p className={`text-2xl font-bold font-mono ${slot.result.beat_eps ? "text-emerald-400" : "text-red-400"}`}>
                                                    {slot.result.eps_actual || "—"}
                                                </p>
                                            </div>

                                            {/* EPS Estimate */}
                                            <div className="bg-white/5 rounded-xl p-4 text-center">
                                                <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">EPS Estimate</p>
                                                <p className="text-2xl font-bold font-mono text-text-main">
                                                    {slot.result.eps_estimate || "—"}
                                                </p>
                                            </div>

                                            {/* Revenue Actual */}
                                            <div className="bg-white/5 rounded-xl p-4 text-center">
                                                <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Revenue Actual</p>
                                                <p className={`text-2xl font-bold font-mono ${slot.result.beat_revenue ? "text-emerald-400" : "text-red-400"}`}>
                                                    {slot.result.revenue_actual || "—"}
                                                </p>
                                            </div>

                                            {/* Revenue Estimate */}
                                            <div className="bg-white/5 rounded-xl p-4 text-center">
                                                <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Rev. Estimate</p>
                                                <p className="text-2xl font-bold font-mono text-text-main">
                                                    {slot.result.revenue_estimate || "—"}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Surprise percentages */}
                                        <div className="flex items-center gap-6 mb-4">
                                            {slot.result.eps_surprise_pct !== undefined && slot.result.eps_surprise_pct !== null && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-text-muted">EPS Surprise:</span>
                                                    <span className={`text-sm font-bold font-mono ${slot.result.eps_surprise_pct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                                        {slot.result.eps_surprise_pct >= 0 ? "+" : ""}{slot.result.eps_surprise_pct}%
                                                    </span>
                                                </div>
                                            )}
                                            {slot.result.revenue_surprise_pct !== undefined && slot.result.revenue_surprise_pct !== null && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-text-muted">Revenue Surprise:</span>
                                                    <span className={`text-sm font-bold font-mono ${slot.result.revenue_surprise_pct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                                        {slot.result.revenue_surprise_pct >= 0 ? "+" : ""}{slot.result.revenue_surprise_pct}%
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Guidance */}
                                        {slot.result.guidance && (
                                            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 mb-3">
                                                <p className="text-[10px] text-primary uppercase tracking-wider font-semibold mb-1">Guidance</p>
                                                <p className="text-sm text-text-main">{slot.result.guidance}</p>
                                            </div>
                                        )}

                                        {/* Footer links */}
                                        <div className="flex items-center justify-between text-xs text-text-muted/50">
                                            <span>Detected at {slot.result.dropped_at ? new Date(slot.result.dropped_at).toLocaleTimeString() : "—"}</span>
                                            {slot.result.source_url && (
                                                <a href={slot.result.source_url} target="_blank" rel="noopener noreferrer" className="text-primary/60 hover:text-primary transition-colors">
                                                    View press release →
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* Error state */
                                <div className="p-6 rounded-2xl border border-red-500/20 bg-red-500/5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono text-lg font-bold text-primary">{slot.result.ticker}</span>
                                            <span className="px-2 py-0.5 text-[10px] font-semibold uppercase bg-red-500/20 text-red-400 rounded-full">Error</span>
                                        </div>
                                        <button
                                            onClick={() => removeTicker(slot.ticker)}
                                            className="p-1 text-text-muted/30 hover:text-text-muted transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                    <p className="text-xs text-red-400/70 mt-2">{slot.result.error_message || "Could not reach investor relations page"}</p>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Footer */}
            <p className="text-center text-[10px] text-text-muted/30 mt-8">
                Powered by IR page scanning + SEC EDGAR • Data may have slight delay vs wire services
            </p>
        </DashboardLayout>
    );
}
