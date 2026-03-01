"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/dashboard-layout";
import { type CalendarEvent, getUpcomingEarnings } from "@/lib/api";

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const ChevronLeft = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
);

const ChevronRight = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
);

export default function EarningsPage() {
    const [view, setView] = useState<"calendar" | "list">("calendar");
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [monthOffset, setMonthOffset] = useState(0);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    // Current displayed month
    const displayDate = useMemo(() => {
        const d = new Date();
        d.setMonth(d.getMonth() + monthOffset);
        return d;
    }, [monthOffset]);

    const monthName = displayDate.toLocaleString("default", { month: "long" });
    const year = displayDate.getFullYear();

    // Fetch upcoming 30 days of earnings
    const fetchEarnings = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getUpcomingEarnings(30);
            setEvents(data.events || []);
            setLastUpdated(new Date());
        } catch (err) {
            setError(String(err));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchEarnings();
        const interval = setInterval(fetchEarnings, 120000);
        return () => clearInterval(interval);
    }, [fetchEarnings]);

    // Group events by date for calendar view
    const eventsByDate = useMemo(() => {
        const map: Record<string, CalendarEvent[]> = {};
        for (const ev of events) {
            if (!map[ev.earnings_date]) map[ev.earnings_date] = [];
            map[ev.earnings_date].push(ev);
        }
        return map;
    }, [events]);

    // Generate calendar grid
    const calendarDays = useMemo(() => {
        const month = displayDate.getMonth();
        const yr = displayDate.getFullYear();
        const firstDay = new Date(yr, month, 1).getDay();
        const daysInMonth = new Date(yr, month + 1, 0).getDate();
        const today = new Date();
        const cells = [];

        for (let i = 0; i < firstDay; i++) {
            cells.push({ day: null, dateStr: "", earnings: [] as CalendarEvent[], isToday: false });
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${yr}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            cells.push({
                day,
                dateStr,
                earnings: eventsByDate[dateStr] || [],
                isToday: day === today.getDate() && month === today.getMonth() && yr === today.getFullYear(),
            });
        }

        return cells;
    }, [displayDate, eventsByDate]);

    // Sort events by date for list view
    const sortedEvents = useMemo(() => {
        return [...events].sort((a, b) => a.earnings_date.localeCompare(b.earnings_date));
    }, [events]);

    return (
        <DashboardLayout title="Earnings Calendar" subtitle="Track upcoming earnings announcements">
            {/* Toolbar */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-center justify-between mb-6"
            >
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setView("calendar")}
                        className={`px-4 py-2 text-sm rounded-lg transition-all ${view === "calendar"
                            ? "bg-primary text-primary-foreground"
                            : "bg-surface border border-border text-text-muted hover:text-text-main"
                            }`}
                    >
                        Calendar View
                    </button>
                    <button
                        onClick={() => setView("list")}
                        className={`px-4 py-2 text-sm rounded-lg transition-all ${view === "list"
                            ? "bg-primary text-primary-foreground"
                            : "bg-surface border border-border text-text-muted hover:text-text-main"
                            }`}
                    >
                        List View
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    {lastUpdated && (
                        <span className="flex items-center gap-1 text-xs text-text-muted">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Live • {lastUpdated.toLocaleTimeString()}
                        </span>
                    )}
                    <span className="text-xs font-mono text-text-muted">{events.length} events</span>

                    {view === "calendar" && (
                        <div className="flex items-center gap-2">
                            <button onClick={() => setMonthOffset(monthOffset - 1)} className="p-2 text-text-muted hover:text-text-main hover:bg-white/5 rounded-lg transition-colors">
                                <ChevronLeft />
                            </button>
                            <span className="text-text-main font-semibold min-w-[140px] text-center">{monthName} {year}</span>
                            <button onClick={() => setMonthOffset(monthOffset + 1)} className="p-2 text-text-muted hover:text-text-main hover:bg-white/5 rounded-lg transition-colors">
                                <ChevronRight />
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>

            {loading && events.length === 0 ? (
                <div className="p-8 space-y-3">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm text-text-muted">Loading earnings data...</span>
                    </div>
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-14 bg-surface/40 rounded-lg animate-pulse" />
                    ))}
                </div>
            ) : error ? (
                <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                        <p className="text-red-400 text-sm mb-2">Failed to load earnings data</p>
                        <p className="text-xs text-text-muted">{error}</p>
                        <button onClick={fetchEarnings} className="mt-3 px-3 py-1.5 bg-primary/20 text-primary rounded-lg text-xs">Retry</button>
                    </div>
                </div>
            ) : view === "calendar" ? (
                /* Calendar View */
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-surface border border-border rounded-xl overflow-hidden"
                >
                    <div className="grid grid-cols-7 border-b border-border bg-background/50">
                        {dayLabels.map((day) => (
                            <div key={day} className="px-2 py-3 text-center text-xs font-semibold text-text-muted uppercase tracking-wider">
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7">
                        {calendarDays.map((cell, i) => (
                            <div
                                key={i}
                                className={`min-h-[110px] border-b border-r border-border p-2 ${cell.day === null ? "bg-background/30" : "hover:bg-white/[0.02]"
                                    } ${cell.isToday ? "bg-primary/5" : ""}`}
                            >
                                {cell.day && (
                                    <>
                                        <span className={`text-sm ${cell.isToday ? "w-6 h-6 flex items-center justify-center rounded-full bg-primary text-primary-foreground" : "text-text-muted"}`}>
                                            {cell.day}
                                        </span>
                                        <div className="mt-1 space-y-0.5 max-h-[80px] overflow-y-auto">
                                            {cell.earnings.slice(0, 4).map((ev, j) => (
                                                <div key={j} className="px-1.5 py-0.5 text-[10px] rounded bg-primary-dim/50 text-primary border border-primary/20 truncate">
                                                    <span className="font-mono font-semibold">{ev.ticker}</span>
                                                    {ev.earnings_time && (
                                                        <span className="text-primary/60 ml-1">
                                                            {ev.earnings_time?.toLowerCase().includes("before") || ev.earnings_time === "BMO" ? "BMO" : "AMC"}
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                            {cell.earnings.length > 4 && (
                                                <p className="text-[9px] text-text-muted/60 pl-1">+{cell.earnings.length - 4} more</p>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </motion.div>
            ) : (
                /* List View */
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-surface border border-border rounded-xl overflow-hidden"
                >
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border bg-background/50">
                                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Symbol</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider hidden sm:table-cell">Company</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Date</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Time</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-text-muted uppercase tracking-wider hidden md:table-cell">EPS Est.</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-text-muted uppercase tracking-wider hidden lg:table-cell">Mkt Cap</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {sortedEvents.slice(0, 100).map((ev, i) => (
                                <motion.tr
                                    key={`${ev.ticker}-${ev.earnings_date}-${i}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: Math.min(i * 0.02, 0.5) }}
                                    className="hover:bg-white/[0.02] transition-colors"
                                >
                                    <td className="px-4 py-3">
                                        <span className="font-mono font-semibold text-primary">{ev.ticker}</span>
                                    </td>
                                    <td className="px-4 py-3 text-text-main text-sm truncate max-w-[200px] hidden sm:table-cell">{ev.company_name}</td>
                                    <td className="px-4 py-3 text-text-main font-mono text-xs">
                                        {formatDate(ev.earnings_date)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 text-xs rounded-md font-bold ${ev.earnings_time?.toLowerCase() === "bmo" || ev.earnings_time?.toLowerCase().includes("before")
                                            ? "bg-amber-500/20 text-amber-400"
                                            : "bg-blue-500/20 text-blue-400"
                                            }`}>
                                            {ev.earnings_time?.toLowerCase() === "bmo" || ev.earnings_time?.toLowerCase().includes("before") ? "BMO" : "AMC"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono text-sm text-text-main hidden md:table-cell">{ev.eps_estimate || "—"}</td>
                                    <td className="px-4 py-3 text-right font-mono text-xs text-text-muted hidden lg:table-cell">{ev.market_cap || "—"}</td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                    {sortedEvents.length > 100 && (
                        <p className="text-center text-xs text-text-muted py-3 border-t border-border">
                            Showing 100 of {sortedEvents.length} events
                        </p>
                    )}
                </motion.div>
            )}
        </DashboardLayout>
    );
}

function formatDate(dateStr: string): string {
    try {
        const d = new Date(dateStr + "T00:00:00");
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "short" });
    } catch {
        return dateStr;
    }
}
