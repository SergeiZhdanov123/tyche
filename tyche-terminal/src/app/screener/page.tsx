"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { type CalendarEvent, type EarningsSummary, getUpcomingEarnings, getEarningsSummary } from "@/lib/api";

// ─── Types ──────────────────────────────────────────────────
type SortKey = "date" | "ticker" | "market_cap";
type SortDir = "asc" | "desc";
type TimeFilter = "all" | "bmo" | "amc";

export default function ScreenerPage() {
    // ─── State ──────────────────────────────────────────
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    // Filters
    const [search, setSearch] = useState("");
    const [daysAhead, setDaysAhead] = useState(7);
    const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");

    // Sorting
    const [sortKey, setSortKey] = useState<SortKey>("date");
    const [sortDir, setSortDir] = useState<SortDir>("asc");

    // Detail drawer
    const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
    const [detailData, setDetailData] = useState<EarningsSummary | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    // ─── Fetch earnings calendar ────────────────────────
    const fetchEarnings = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getUpcomingEarnings(daysAhead);
            setEvents(data.events || []);
            setLastUpdated(new Date());
        } catch (err) {
            setError(String(err));
        } finally {
            setLoading(false);
        }
    }, [daysAhead]);

    useEffect(() => {
        fetchEarnings();
        const interval = setInterval(fetchEarnings, 60000);
        return () => clearInterval(interval);
    }, [fetchEarnings]);

    // ─── Fetch detail when ticker selected ──────────────
    useEffect(() => {
        if (!selectedTicker) { setDetailData(null); return; }
        setDetailLoading(true);
        getEarningsSummary(selectedTicker)
            .then((d) => setDetailData(d))
            .catch(() => setDetailData(null))
            .finally(() => setDetailLoading(false));
    }, [selectedTicker]);

    // ─── Filtering & Sorting ────────────────────────────
    const filtered = useMemo(() => {
        let data = [...events];

        // Search
        if (search) {
            const q = search.toUpperCase();
            data = data.filter((e) =>
                (e.ticker && e.ticker.includes(q)) ||
                (e.company_name && e.company_name.toUpperCase().includes(q))
            );
        }

        // Time filter
        if (timeFilter === "bmo") {
            data = data.filter((e) => e.earnings_time && (e.earnings_time.toLowerCase() === "bmo" || e.earnings_time.toLowerCase().includes("before")));
        } else if (timeFilter === "amc") {
            data = data.filter((e) => e.earnings_time && (e.earnings_time.toLowerCase() === "amc" || e.earnings_time.toLowerCase().includes("after")));
        }

        // Sort
        data.sort((a, b) => {
            let cmp = 0;
            switch (sortKey) {
                case "date":
                    cmp = (a.earnings_date || "").localeCompare(b.earnings_date || "");
                    break;
                case "ticker":
                    cmp = (a.ticker || "").localeCompare(b.ticker || "");
                    break;
                case "market_cap":
                    cmp = parseCap(a.market_cap) - parseCap(b.market_cap);
                    break;
            }
            return sortDir === "asc" ? cmp : -cmp;
        });

        return data;
    }, [events, search, timeFilter, sortKey, sortDir]);

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(sortDir === "asc" ? "desc" : "asc");
        } else {
            setSortKey(key);
            setSortDir("asc");
        }
    };

    const sortIcon = (key: SortKey) => {
        if (sortKey !== key) return "↕";
        return sortDir === "asc" ? "↑" : "↓";
    };

    return (
        <DashboardLayout title="Earnings Screener">
            <div className="flex h-full">
                {/* Main Table Area */}
                <div className={`flex-1 flex flex-col overflow-hidden transition-all ${selectedTicker ? "lg:mr-[420px]" : ""}`}>
                    {/* Toolbar */}
                    <div className="p-4 lg:p-5 border-b border-border bg-surface/30 space-y-3">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                            {/* Search */}
                            <div className="relative flex-1 w-full sm:max-w-xs">
                                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Search ticker or company..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm text-text-main placeholder-text-muted/40 focus:border-primary/50 outline-none"
                                />
                            </div>

                            {/* Days ahead */}
                            <div className="flex items-center gap-2">
                                <label className="text-xs text-text-muted shrink-0">Next</label>
                                <select
                                    value={daysAhead}
                                    onChange={(e) => setDaysAhead(Number(e.target.value))}
                                    className="px-2 py-1.5 bg-background border border-border rounded-lg text-xs text-text-main"
                                >
                                    {[1, 3, 5, 7, 14, 30].map((d) => (
                                        <option key={d} value={d}>{d} day{d > 1 ? "s" : ""}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Time filter */}
                            <div className="flex items-center gap-1 bg-background rounded-lg border border-border p-0.5">
                                {(["all", "bmo", "amc"] as TimeFilter[]).map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => setTimeFilter(t)}
                                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${timeFilter === t
                                            ? "bg-primary/20 text-primary"
                                            : "text-text-muted hover:text-text-main"
                                            }`}
                                    >
                                        {t === "all" ? "All" : t.toUpperCase()}
                                    </button>
                                ))}
                            </div>

                            {/* Stats */}
                            <div className="flex items-center gap-3 ml-auto text-xs text-text-muted">
                                <span className="font-mono">{filtered.length} results</span>
                                {lastUpdated && (
                                    <span className="flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                        Live • {lastUpdated.toLocaleTimeString()}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="flex-1 overflow-auto">
                        {loading && events.length === 0 ? (
                            <div className="p-8 space-y-2">
                                {[...Array(10)].map((_, i) => (
                                    <div key={i} className="h-12 bg-surface/40 rounded-lg animate-pulse" />
                                ))}
                            </div>
                        ) : error ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="text-center">
                                    <p className="text-red-400 text-sm mb-2">Failed to load earnings data</p>
                                    <p className="text-xs text-text-muted">{error}</p>
                                    <button onClick={fetchEarnings} className="mt-3 px-3 py-1.5 bg-primary/20 text-primary rounded-lg text-xs">Retry</button>
                                </div>
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="text-center">
                                    <div className="text-3xl mb-3 opacity-20">📊</div>
                                    <p className="text-sm text-text-muted">No earnings events found</p>
                                    <p className="text-xs text-text-muted/50 mt-1">Try adjusting your filters</p>
                                </div>
                            </div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-surface/90 backdrop-blur-sm z-10">
                                    <tr className="border-b border-border text-text-muted text-xs uppercase tracking-wider">
                                        <th className="text-left px-4 py-3 font-medium">
                                            <button onClick={() => toggleSort("ticker")} className="flex items-center gap-1 hover:text-text-main transition-colors">
                                                Ticker {sortIcon("ticker")}
                                            </button>
                                        </th>
                                        <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Company</th>
                                        <th className="text-left px-4 py-3 font-medium">
                                            <button onClick={() => toggleSort("date")} className="flex items-center gap-1 hover:text-text-main transition-colors">
                                                Date {sortIcon("date")}
                                            </button>
                                        </th>
                                        <th className="text-center px-4 py-3 font-medium">Time</th>
                                        <th className="text-right px-4 py-3 font-medium hidden md:table-cell">EPS Est.</th>
                                        <th className="text-right px-4 py-3 font-medium hidden md:table-cell">EPS Act.</th>
                                        <th className="text-right px-4 py-3 font-medium hidden lg:table-cell">Rev. Est.</th>
                                        <th className="text-right px-4 py-3 font-medium">
                                            <button onClick={() => toggleSort("market_cap")} className="flex items-center gap-1 ml-auto hover:text-text-main transition-colors">
                                                Mkt Cap {sortIcon("market_cap")}
                                            </button>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((ev, i) => {
                                        const isSelected = selectedTicker === ev.ticker;
                                        const hasSurprise = ev.eps_actual && ev.eps_estimate;
                                        const surprise = hasSurprise
                                            ? parseFloat(String(ev.eps_actual)) - parseFloat(String(ev.eps_estimate))
                                            : null;
                                        return (
                                            <tr
                                                key={`${ev.ticker}-${ev.earnings_date}-${i}`}
                                                onClick={() => setSelectedTicker(isSelected ? null : ev.ticker)}
                                                className={`border-b border-border/30 cursor-pointer transition-colors ${isSelected
                                                    ? "bg-primary/5 border-l-2 border-l-primary"
                                                    : "hover:bg-white/[0.02]"
                                                    }`}
                                            >
                                                <td className="px-4 py-3">
                                                    <span className="font-mono font-bold text-text-main">{ev.ticker}</span>
                                                </td>
                                                <td className="px-4 py-3 text-text-muted text-xs truncate max-w-[200px] hidden sm:table-cell">
                                                    {ev.company_name}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="font-mono text-xs text-text-main">
                                                        {formatDate(ev.earnings_date)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ev.earnings_time?.toLowerCase() === "bmo" || ev.earnings_time?.toLowerCase().includes("before")
                                                        ? "text-amber-400 bg-amber-400/10"
                                                        : ev.earnings_time?.toLowerCase() === "amc" || ev.earnings_time?.toLowerCase().includes("after")
                                                            ? "text-blue-400 bg-blue-400/10"
                                                            : "text-text-muted/50 bg-white/5"
                                                        }`}>
                                                        {normalizeTime(ev.earnings_time)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono text-xs text-text-muted hidden md:table-cell">
                                                    {ev.eps_estimate || "—"}
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono text-xs hidden md:table-cell">
                                                    {ev.eps_actual ? (
                                                        <span className={surprise && surprise > 0 ? "text-emerald-400" : surprise && surprise < 0 ? "text-red-400" : "text-text-main"}>
                                                            {ev.eps_actual}
                                                            {surprise !== null && (
                                                                <span className="text-[9px] ml-1">
                                                                    ({surprise > 0 ? "+" : ""}{surprise.toFixed(2)})
                                                                </span>
                                                            )}
                                                        </span>
                                                    ) : "—"}
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono text-xs text-text-muted hidden lg:table-cell">
                                                    {ev.revenue_estimate || "—"}
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono text-xs text-text-muted">
                                                    {ev.market_cap || "—"}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* Detail Drawer */}
                {selectedTicker && (
                    <aside className="fixed right-0 top-0 bottom-0 w-[420px] bg-surface border-l border-border z-30 overflow-y-auto shadow-2xl lg:shadow-none">
                        {/* Drawer Header */}
                        <div className="sticky top-0 bg-surface/95 backdrop-blur-sm border-b border-border p-5 flex items-center justify-between z-10">
                            <div>
                                <h3 className="text-lg font-bold text-text-main font-mono">{selectedTicker}</h3>
                                <p className="text-xs text-text-muted">Earnings Summary</p>
                            </div>
                            <button
                                onClick={() => setSelectedTicker(null)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-text-muted transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-5">
                            {detailLoading ? (
                                <div className="space-y-4">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse" />
                                    ))}
                                </div>
                            ) : detailData ? (
                                <div className="space-y-4">
                                    {/* Period */}
                                    <div className="bg-background rounded-xl p-4 border border-border">
                                        <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">Period</p>
                                        <p className="text-sm text-text-main font-mono">
                                            FY{detailData.revenue?.fy || "—"} {detailData.revenue?.fp || "—"}
                                        </p>
                                        {detailData.period_end && (
                                            <p className="text-xs text-text-muted mt-1">Ending {detailData.period_end}</p>
                                        )}
                                    </div>

                                    {/* Revenue */}
                                    {detailData.revenue && (
                                        <div className="bg-background rounded-xl p-4 border border-border">
                                            <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">Revenue</p>
                                            <p className="text-xl font-bold text-text-main font-mono">
                                                ${formatLargeNumber(detailData.revenue.value)}
                                            </p>
                                        </div>
                                    )}

                                    {/* Net Income */}
                                    {detailData.net_income && (
                                        <div className="bg-background rounded-xl p-4 border border-border">
                                            <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">Net Income</p>
                                            <p className={`text-xl font-bold font-mono ${detailData.net_income.value >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                                ${formatLargeNumber(detailData.net_income.value)}
                                            </p>
                                        </div>
                                    )}

                                    {/* EPS */}
                                    <div className="grid grid-cols-2 gap-3">
                                        {detailData.eps_basic && (
                                            <div className="bg-background rounded-xl p-4 border border-border">
                                                <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">EPS Basic</p>
                                                <p className="text-lg font-bold text-text-main font-mono">
                                                    ${detailData.eps_basic.value.toFixed(2)}
                                                </p>
                                            </div>
                                        )}
                                        {detailData.eps_diluted && (
                                            <div className="bg-background rounded-xl p-4 border border-border">
                                                <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">EPS Diluted</p>
                                                <p className="text-lg font-bold text-text-main font-mono">
                                                    ${detailData.eps_diluted.value.toFixed(2)}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Notes */}
                                    {detailData.notes && detailData.notes.length > 0 && (
                                        <div className="bg-background rounded-xl p-4 border border-border">
                                            <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">Notes</p>
                                            <ul className="text-xs text-text-muted space-y-1">
                                                {detailData.notes.map((n, i) => (
                                                    <li key={i} className="flex items-start gap-2">
                                                        <span className="text-primary/60 mt-0.5">•</span>
                                                        {n}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Source */}
                                    <p className="text-[10px] text-text-muted/40 text-center">
                                        Source: SEC EDGAR XBRL • Mode: {detailData.mode}
                                    </p>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-sm text-text-muted">No earnings data available for {selectedTicker}</p>
                                    <p className="text-xs text-text-muted/50 mt-1">This company may not have recent SEC filings</p>
                                </div>
                            )}
                        </div>
                    </aside>
                )}
            </div>
        </DashboardLayout>
    );
}

// ─── Helpers ────────────────────────────────────────────────

function parseCap(cap: string | null): number {
    if (!cap) return 0;
    const clean = cap.replace(/[^0-9.BMTK]/gi, "");
    const num = parseFloat(clean) || 0;
    if (cap.toUpperCase().includes("T")) return num * 1e12;
    if (cap.toUpperCase().includes("B")) return num * 1e9;
    if (cap.toUpperCase().includes("M")) return num * 1e6;
    if (cap.toUpperCase().includes("K")) return num * 1e3;
    return num;
}

function formatDate(dateStr: string): string {
    try {
        const d = new Date(dateStr + "T00:00:00");
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "short" });
    } catch {
        return dateStr;
    }
}

function normalizeTime(time: string | null): string {
    if (!time) return "TBD";
    const t = time.toLowerCase();
    if (t === "bmo" || t.includes("before")) return "BMO";
    if (t === "amc" || t.includes("after")) return "AMC";
    return time.toUpperCase();
}

function formatLargeNumber(n: number): string {
    const abs = Math.abs(n);
    if (abs >= 1e12) return (n / 1e12).toFixed(2) + "T";
    if (abs >= 1e9) return (n / 1e9).toFixed(2) + "B";
    if (abs >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (abs >= 1e3) return (n / 1e3).toFixed(1) + "K";
    return n.toFixed(2);
}
