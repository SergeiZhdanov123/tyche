"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { motion, AnimatePresence } from "framer-motion";
import { usePriceBars, useQuote } from "@/hooks/useMarketData";
import { useEarningsSummary, useEarningsAnalysts, useCompanyEarningsEvents, useEarningsReaction } from "@/hooks/useEarnings";
import { getEPSHistory, type EPSQuarter, type PriceBar, type EarningsEvent } from "@/lib/api";

type RangeType = '1D' | '1M' | '3M' | '6M' | '1Y' | '5Y';
type ChartType = 'candle' | 'line';
type TimespanType = 'minute' | 'hour' | 'day' | 'week';

function formatCurrency(val: number | null | undefined) {
    if (val == null) return "—";
    if (Math.abs(val) >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
    if (Math.abs(val) >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
    if (Math.abs(val) >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
    return `$${val.toFixed(2)}`;
}

function formatCompact(val: number) {
    if (Math.abs(val) >= 1e9) return `${(val / 1e9).toFixed(1)}B`;
    if (Math.abs(val) >= 1e6) return `${(val / 1e6).toFixed(1)}M`;
    if (Math.abs(val) >= 1e3) return `${(val / 1e3).toFixed(1)}K`;
    return val.toFixed(0);
}

// Custom hook for EPS history
function useEPSHistory(ticker: string | undefined) {
    const [quarters, setQuarters] = useState<EPSQuarter[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!ticker) { setQuarters([]); return; }
        setLoading(true);
        getEPSHistory(ticker, 12)
            .then(data => setQuarters(data.quarters))
            .catch(() => setQuarters([]))
            .finally(() => setLoading(false));
    }, [ticker]);

    return { quarters, loading };
}

export default function ChartPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTicker, setActiveTicker] = useState<string | null>(null);
    const [compareTicker, setCompareTicker] = useState<string | null>(null);
    const [compareQuery, setCompareQuery] = useState("");
    const [range, setRange] = useState<RangeType>('1Y');
    const [chartType, setChartType] = useState<ChartType>('candle');
    const [timespan, setTimespan] = useState<TimespanType>('day');

    // Auto-select appropriate timespan when range changes
    const effectiveTimespan = useMemo(() => {
        if (range === '1D') return 'minute';
        if (range === '1M') return timespan === 'minute' ? 'hour' : timespan;
        return timespan;
    }, [range, timespan]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            setActiveTicker(searchQuery.trim().toUpperCase());
            setCompareTicker(null);
            setSearchQuery("");
        }
    };

    const handleCompare = (e: React.FormEvent) => {
        e.preventDefault();
        if (compareQuery.trim()) {
            setCompareTicker(compareQuery.trim().toUpperCase());
            setCompareQuery("");
        }
    };

    // Data Hooks for primary ticker
    const { bars, loading: barsLoading } = usePriceBars(activeTicker || undefined, range, effectiveTimespan);
    const { bars: compareBars } = usePriceBars(compareTicker || undefined, range, effectiveTimespan);
    const { quote } = useQuote(activeTicker || undefined);
    const { summary } = useEarningsSummary(activeTicker || undefined);
    const { analysts } = useEarningsAnalysts(activeTicker || undefined);
    const { events: earningsEvents } = useCompanyEarningsEvents(activeTicker || undefined, 20);
    const { reaction } = useEarningsReaction(activeTicker || undefined);
    const { quarters: epsHistory, loading: epsLoading } = useEPSHistory(activeTicker || undefined);

    return (
        <DashboardLayout title="Technical Chart" subtitle="Interactive OHLCV charts with earnings overlays">
            <div className="flex flex-col gap-6">
                {/* Search Bar Row */}
                <div className="flex flex-wrap gap-3 items-center">
                    <form onSubmit={handleSearch} className="relative flex-1 min-w-[200px] max-w-md">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-4 w-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 text-sm border border-white/10 rounded-lg bg-surface/50 text-text-main placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                            placeholder="Enter ticker (e.g. AAPL)"
                        />
                    </form>
                    {activeTicker && (
                        <form onSubmit={handleCompare} className="relative flex-1 min-w-[200px] max-w-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                value={compareQuery}
                                onChange={(e) => setCompareQuery(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2 text-sm border border-blue-500/20 rounded-lg bg-surface/50 text-text-main placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                placeholder="Compare with... (e.g. MSFT)"
                            />
                        </form>
                    )}
                    {compareTicker && (
                        <button
                            onClick={() => setCompareTicker(null)}
                            className="text-xs text-red-400 hover:text-red-300 border border-red-400/20 rounded-md px-2 py-1"
                        >
                            Remove {compareTicker}
                        </button>
                    )}
                </div>

                {activeTicker ? (
                    <>

                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                            <div className="col-span-1 lg:col-span-3 flex flex-col gap-6">
                                {/* Price Chart Card */}
                                <div className="bg-surface/50 border border-white/5 rounded-2xl overflow-hidden shadow-sm">
                                    <div className="p-4 border-b border-white/5 flex items-center justify-between flex-wrap gap-2">
                                        <div className="flex items-center gap-3">
                                            <h2 className="text-xl font-bold font-mono text-primary">{activeTicker}</h2>
                                            {compareTicker && (
                                                <span className="text-sm font-mono text-blue-400">vs {compareTicker}</span>
                                            )}
                                            {quote && (
                                                <span className={`text-sm font-medium ${quote.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                    ${quote.price.toFixed(2)} ({quote.change >= 0 ? '+' : ''}{quote.change_pct.toFixed(2)}%)
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex bg-background/50 rounded-lg p-1 border border-white/5">
                                            {(['1D', '1M', '3M', '6M', '1Y', '5Y'] as RangeType[]).map((r) => (
                                                <button
                                                    key={r}
                                                    onClick={() => setRange(r)}
                                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${range === r ? 'bg-white/10 text-white shadow-sm' : 'text-text-muted hover:text-text-main hover:bg-white/5'}`}
                                                >
                                                    {r}
                                                </button>
                                            ))}
                                        </div>
                                        {/* Chart Type Toggle */}
                                        <div className="flex bg-background/50 rounded-lg p-1 border border-white/5">
                                            <button
                                                onClick={() => setChartType('candle')}
                                                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${chartType === 'candle' ? 'bg-white/10 text-white shadow-sm' : 'text-text-muted hover:text-text-main hover:bg-white/5'}`}
                                            >
                                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                    <line x1="4" y1="1" x2="4" y2="13" />
                                                    <rect x="2" y="4" width="4" height="5" rx="0.5" fill="currentColor" />
                                                    <line x1="10" y1="2" x2="10" y2="12" />
                                                    <rect x="8" y="5" width="4" height="4" rx="0.5" fill="currentColor" />
                                                </svg>
                                                Candle
                                            </button>
                                            <button
                                                onClick={() => setChartType('line')}
                                                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${chartType === 'line' ? 'bg-white/10 text-white shadow-sm' : 'text-text-muted hover:text-text-main hover:bg-white/5'}`}
                                            >
                                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                    <path d="M1 10 L4 6 L7 8 L10 3 L13 5" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                                Line
                                            </button>
                                        </div>
                                        {/* Timeframe Granularity */}
                                        {range !== '1D' && (
                                            <div className="flex bg-background/50 rounded-lg p-1 border border-white/5">
                                                {(['hour', 'day', 'week'] as TimespanType[]).map((t) => (
                                                    <button
                                                        key={t}
                                                        onClick={() => setTimespan(t)}
                                                        className={`px-2.5 py-1 text-[10px] font-medium rounded-md transition-colors ${effectiveTimespan === t ? 'bg-white/10 text-white shadow-sm' : 'text-text-muted hover:text-text-main hover:bg-white/5'}`}
                                                    >
                                                        {t === 'hour' ? '1H' : t === 'day' ? '1D' : '1W'}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="relative overflow-hidden" style={{ height: '460px' }}>
                                        {barsLoading ? (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                            </div>
                                        ) : bars.length === 0 ? (
                                            <div className="absolute inset-0 flex items-center justify-center text-text-muted">
                                                No chart data available for {activeTicker} ({range})
                                            </div>
                                        ) : (
                                            <InteractiveSVGChart
                                                bars={bars}
                                                compareBars={compareBars}
                                                compareTicker={compareTicker}
                                                earningsEvents={earningsEvents}
                                                chartType={chartType}
                                            />
                                        )}
                                    </div>
                                    {/* SMA Legend */}
                                    <div className="px-4 py-2 border-t border-white/5 flex gap-4 text-[10px] text-text-muted">
                                        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-400 inline-block rounded"></span> SMA 20</span>
                                        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-orange-400 inline-block rounded"></span> SMA 50</span>
                                        {compareTicker && <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-cyan-400 inline-block rounded"></span> {compareTicker}</span>}
                                        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-yellow-400 inline-block rounded" style={{ borderTop: '1px dashed' }}></span> Earnings Filing</span>
                                    </div>
                                </div>

                                {/* EPS + Revenue side by side below the chart */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-surface/50 border border-white/5 rounded-2xl p-5 shadow-sm">
                                        <h3 className="text-sm font-bold text-text-main mb-0.5">EPS (Diluted)</h3>
                                        <p className="text-[10px] text-text-muted mb-4">Quarterly from SEC filings</p>
                                        {epsLoading ? (
                                            <div className="flex items-center justify-center h-48">
                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                            </div>
                                        ) : (
                                            <EPSBarChart quarters={epsHistory} metric="eps" />
                                        )}
                                    </div>
                                    <div className="bg-surface/50 border border-white/5 rounded-2xl p-5 shadow-sm">
                                        <h3 className="text-sm font-bold text-text-main mb-0.5">Revenue & Net Income</h3>
                                        <p className="text-[10px] text-text-muted mb-4">Quarterly from SEC filings</p>
                                        {epsLoading ? (
                                            <div className="flex items-center justify-center h-48">
                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                            </div>
                                        ) : (
                                            <EPSBarChart quarters={epsHistory} metric="revenue" />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Sidebar Panels */}
                            <div className="col-span-1 flex flex-col gap-4 overflow-y-auto pr-1 custom-scrollbar" style={{ maxHeight: 'calc(100vh - 14rem)' }}>
                                {/* Quote */}
                                <SidebarPanel title="Quote">
                                    {quote ? (
                                        <div className="space-y-3">
                                            <div className="flex items-end justify-between">
                                                <div className="text-2xl font-mono text-text-main font-bold">${quote.price.toFixed(2)}</div>
                                                <div className={`text-sm font-medium ${quote.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                    {quote.change >= 0 ? '+' : ''}{quote.change.toFixed(2)} ({quote.change_pct.toFixed(2)}%)
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 text-xs">
                                                <InfoRow label="Open" value={`$${quote.open.toFixed(2)}`} />
                                                <InfoRow label="Prev Close" value={`$${quote.prev_close.toFixed(2)}`} />
                                                <InfoRow label="Day High" value={`$${quote.high.toFixed(2)}`} />
                                                <InfoRow label="Day Low" value={`$${quote.low.toFixed(2)}`} />
                                                <InfoRow label="Volume" value={formatCompact(quote.volume)} className="col-span-2" />
                                            </div>
                                        </div>
                                    ) : <Skeleton h="h-28" />}
                                </SidebarPanel>

                                {/* Last Earnings Reaction */}
                                <SidebarPanel title="Last Earnings Reaction">
                                    {reaction ? (
                                        <div className="space-y-3 text-xs">
                                            <div className="flex items-center justify-between">
                                                <span className="text-text-muted">Event Date</span>
                                                <span className="text-text-main font-mono">{reaction.event_date}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-text-muted">{reaction.window_days}-Day Return</span>
                                                <span className={`font-mono font-bold ${(reaction.return_pct ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                    {(reaction.return_pct ?? 0) >= 0 ? '+' : ''}{(reaction.return_pct ?? 0).toFixed(2)}%
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-text-muted">Max Run-Up</span>
                                                <span className="text-green-500 font-mono">+{(reaction.max_runup_pct ?? 0).toFixed(2)}%</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-text-muted">Max Drawdown</span>
                                                <span className="text-red-500 font-mono">{(reaction.max_drawdown_pct ?? 0).toFixed(2)}%</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-text-muted">Ref → End Close</span>
                                                <span className="text-text-main font-mono">${(reaction.ref_close ?? 0).toFixed(2)} → ${(reaction.end_close ?? 0).toFixed(2)}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-text-muted">Volume ({reaction.window_days}d)</span>
                                                <span className="text-text-main font-mono">{formatCompact(reaction.volume_sum ?? 0)}</span>
                                            </div>
                                        </div>
                                    ) : <Skeleton h="h-32" />}
                                </SidebarPanel>

                                {/* Price Targets (from analyst data) */}
                                <SidebarPanel title="Price Targets">
                                    {analysts ? (
                                        <div className="space-y-3">
                                            {analysts.price_targets && (analysts.price_targets.low || analysts.price_targets.mean || analysts.price_targets.high) ? (
                                                <>
                                                    {/* Visual price target bar */}
                                                    <PriceTargetBar
                                                        low={analysts.price_targets.low}
                                                        mean={analysts.price_targets.mean}
                                                        high={analysts.price_targets.high}
                                                        current={quote?.price}
                                                    />
                                                    <div className="grid grid-cols-3 gap-2 text-center text-xs mt-2">
                                                        <div>
                                                            <div className="text-text-muted">Low</div>
                                                            <div className="text-red-400 font-mono">${analysts.price_targets.low?.toFixed(2) || '—'}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-text-muted">Mean</div>
                                                            <div className="text-primary font-mono font-bold">${analysts.price_targets.mean?.toFixed(2) || '—'}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-text-muted">High</div>
                                                            <div className="text-green-400 font-mono">${analysts.price_targets.high?.toFixed(2) || '—'}</div>
                                                        </div>
                                                    </div>
                                                    {analysts.price_targets.implied_upside_pct != null && (
                                                        <div className="text-center text-xs mt-1">
                                                            <span className="text-text-muted">Implied Upside: </span>
                                                            <span className={`font-bold ${analysts.price_targets.implied_upside_pct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                                {analysts.price_targets.implied_upside_pct >= 0 ? '+' : ''}{analysts.price_targets.implied_upside_pct.toFixed(1)}%
                                                            </span>
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="text-text-muted text-xs">No price target data available</div>
                                            )}
                                            {/* EPS Forecast */}
                                            {analysts.earnings_forecast && (
                                                <div className="mt-3 pt-3 border-t border-white/5 space-y-2 text-xs">
                                                    <div className="text-text-muted uppercase text-[10px] tracking-wider font-semibold">EPS Forecast</div>
                                                    {analysts.earnings_forecast.eps_next_year != null && (
                                                        <div className="flex justify-between">
                                                            <span className="text-text-muted">Next Year Est</span>
                                                            <span className="text-text-main font-mono">${analysts.earnings_forecast.eps_next_year.toFixed(2)}</span>
                                                        </div>
                                                    )}
                                                    {analysts.earnings_forecast.eps_current_year != null && (
                                                        <div className="flex justify-between">
                                                            <span className="text-text-muted">Current Year Est</span>
                                                            <span className="text-text-main font-mono">${analysts.earnings_forecast.eps_current_year.toFixed(2)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ) : <Skeleton h="h-28" />}
                                </SidebarPanel>

                                {/* Recent Financials */}
                                <SidebarPanel title="Latest Financials">
                                    {summary ? (
                                        <div className="space-y-2 text-xs">
                                            <InfoRow label="Period End" value={summary.period_end || '—'} />
                                            <InfoRow label="Revenue" value={formatCurrency(summary.revenue?.value)} />
                                            <InfoRow label="Net Income" value={formatCurrency(summary.net_income?.value)} />
                                            <InfoRow label="EPS (Basic)" value={summary.eps_basic?.value != null ? `$${summary.eps_basic.value.toFixed(2)}` : '—'} />
                                            <InfoRow label="EPS (Diluted)" value={summary.eps_diluted?.value != null ? `$${summary.eps_diluted.value.toFixed(2)}` : '—'} />
                                        </div>
                                    ) : <Skeleton h="h-28" />}
                                </SidebarPanel>

                                {/* Earnings Filing History */}
                                <SidebarPanel title="Earnings Filings">
                                    {earningsEvents && earningsEvents.length > 0 ? (
                                        <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                                            {earningsEvents.slice(0, 8).map((ev, i) => (
                                                <div key={i} className="flex justify-between items-center text-xs py-1 border-b border-white/5 last:border-0">
                                                    <span className="text-text-main font-mono">{ev.event_date}</span>
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${ev.form === '10-K' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'}`}>
                                                        {ev.form}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : <div className="text-text-muted text-xs">No earnings filing data</div>}
                                </SidebarPanel>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center py-32 text-center px-4">
                        <div className="w-20 h-20 rounded-full bg-surface/80 flex items-center justify-center border border-white/5 shadow-inner mb-6">
                            <svg className="w-10 h-10 text-primary/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-text-main mb-2">Technical Chart</h2>
                        <p className="text-text-muted max-w-sm">
                            Search for a ticker to view OHLCV charts, EPS history, revenue trends, and earnings data overlaid on the chart.
                        </p>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

// ————————————————————————————————————————————————————————————————
// Reusable Components
// ————————————————————————————————————————————————————————————————

function SidebarPanel({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-surface/50 border border-white/5 rounded-2xl p-4 shadow-sm shrink-0">
            <h3 className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-3">{title}</h3>
            {children}
        </div>
    );
}

function InfoRow({ label, value, className }: { label: string; value: string; className?: string }) {
    return (
        <div className={`flex justify-between items-center py-1 border-b border-white/5 last:border-0 ${className || ''}`}>
            <span className="text-text-muted">{label}</span>
            <span className="text-text-main font-mono">{value}</span>
        </div>
    );
}

function Skeleton({ h }: { h: string }) {
    return <div className={`animate-pulse bg-white/5 ${h} rounded-lg`}></div>;
}

function PriceTargetBar({
    low, mean, high, current,
}: {
    low: number | null | undefined;
    mean: number | null | undefined;
    high: number | null | undefined;
    current: number | null | undefined;
}) {
    if (!low || !high) return null;
    const range = high - low;
    if (range <= 0) return null;
    const meanPct = mean ? ((mean - low) / range) * 100 : 50;
    const currentPct = current ? Math.max(0, Math.min(100, ((current - low) / range) * 100)) : null;

    return (
        <div className="relative h-3 bg-white/5 rounded-full overflow-hidden">
            {/* Gradient fill */}
            <div className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(to right, #ef4444, #eab308, #22c55e)', opacity: 0.3 }} />
            {/* Mean marker */}
            <div className="absolute top-0 bottom-0 w-0.5 bg-primary" style={{ left: `${meanPct}%` }} />
            {/* Current price marker */}
            {currentPct !== null && (
                <div
                    className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full border-2 border-primary shadow-lg"
                    style={{ left: `${currentPct}%`, transform: 'translate(-50%, -50%)' }}
                />
            )}
        </div>
    );
}

// ————————————————————————————————————————————————————————————————
// EPS / Revenue Bar Chart
// ————————————————————————————————————————————————————————————————

function EPSBarChart({ quarters, metric }: { quarters: EPSQuarter[]; metric: 'eps' | 'revenue' }) {
    if (!quarters.length) return <div className="text-text-muted text-sm py-8 text-center">No historical data available</div>;

    const isEps = metric === 'eps';
    const values = quarters.map(q => isEps ? (q.eps_diluted ?? 0) : (q.revenue ?? 0));
    const secondaryValues = !isEps ? quarters.map(q => q.net_income ?? 0) : [];
    const allVals = isEps ? values : [...values, ...secondaryValues];
    const maxVal = Math.max(...allVals.map(Math.abs), 0.01);

    const barWidth = Math.max(20, Math.min(60, (700 / quarters.length) - 8));
    const chartHeight = 280;
    const padding = { top: 20, bottom: 60, left: 10, right: 10 };
    const plotH = chartHeight - padding.top - padding.bottom;

    return (
        <div className="overflow-x-auto custom-scrollbar">
            <svg
                width={Math.max(quarters.length * (barWidth + 8) + padding.left + padding.right, 400)}
                height={chartHeight}
                className="w-full"
            >
                {/* Zero line */}
                <line
                    x1={padding.left}
                    y1={padding.top + plotH / 2}
                    x2={quarters.length * (barWidth + 8) + padding.left}
                    y2={padding.top + plotH / 2}
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth={1}
                />

                {quarters.map((q, i) => {
                    const x = padding.left + i * (barWidth + 8);
                    const val = isEps ? (q.eps_diluted ?? 0) : (q.revenue ?? 0);
                    const normalized = (val / maxVal) * (plotH / 2);
                    const isPositive = val >= 0;
                    const barH = Math.abs(normalized);
                    const barY = isPositive
                        ? padding.top + plotH / 2 - barH
                        : padding.top + plotH / 2;

                    // Secondary bar (net income) for revenue view
                    let secBarH = 0;
                    let secBarY = 0;
                    if (!isEps && q.net_income != null) {
                        const secNorm = (q.net_income / maxVal) * (plotH / 2);
                        secBarH = Math.abs(secNorm);
                        secBarY = q.net_income >= 0
                            ? padding.top + plotH / 2 - secBarH
                            : padding.top + plotH / 2;
                    }

                    const label = `${q.fp} FY${q.fy.toString().slice(-2)}`;

                    return (
                        <g key={i}>
                            {/* Primary bar */}
                            <rect
                                x={x}
                                y={barY}
                                width={isEps ? barWidth : barWidth * 0.55}
                                height={Math.max(1, barH)}
                                rx={2}
                                fill={isPositive ? 'rgba(34,197,94,0.7)' : 'rgba(239,68,68,0.7)'}
                            />
                            {/* Secondary bar (net income) */}
                            {!isEps && q.net_income != null && (
                                <rect
                                    x={x + barWidth * 0.55 + 2}
                                    y={secBarY}
                                    width={barWidth * 0.45 - 2}
                                    height={Math.max(1, secBarH)}
                                    rx={2}
                                    fill="rgba(59,130,246,0.6)"
                                />
                            )}
                            {/* Value label */}
                            <text
                                x={x + barWidth / 2}
                                y={isPositive ? barY - 4 : barY + barH + 12}
                                textAnchor="middle"
                                className="text-[9px] fill-text-muted font-mono"
                            >
                                {isEps ? `$${val.toFixed(2)}` : formatCompact(val)}
                            </text>
                            {/* Period label */}
                            <text
                                x={x + barWidth / 2}
                                y={chartHeight - 8}
                                textAnchor="middle"
                                className="text-[9px] fill-text-muted font-mono"
                            >
                                {label}
                            </text>
                        </g>
                    );
                })}
            </svg>
            {!isEps && (
                <div className="flex gap-4 text-[10px] text-text-muted mt-2 ml-2">
                    <span className="flex items-center gap-1"><span className="w-3 h-2 bg-green-500/70 rounded-sm inline-block"></span> Revenue</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-2 bg-blue-500/60 rounded-sm inline-block"></span> Net Income</span>
                </div>
            )}
        </div>
    );
}

// ————————————————————————————————————————————————————————————————
// Interactive SVG Chart Component
// ————————————————————————————————————————————————————————————————

function InteractiveSVGChart({
    bars,
    compareBars,
    compareTicker,
    earningsEvents,
    chartType = 'candle',
}: {
    bars: PriceBar[];
    compareBars?: PriceBar[];
    compareTicker?: string | null;
    earningsEvents: EarningsEvent[];
    chartType?: ChartType;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
    const [hoverIndex, setHoverIndex] = useState<number | null>(null);

    // Responsive resize
    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.clientWidth,
                    height: containerRef.current.clientHeight,
                });
            }
        };
        handleResize();
        const observer = new ResizeObserver(handleResize);
        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    const { width, height } = dimensions;
    const margin = { top: 20, right: 60, bottom: 40, left: 20 };
    const chartWidth = Math.max(0, width - margin.left - margin.right);
    const chartHeight = Math.max(0, height - margin.top - margin.bottom);
    const volumeHeight = chartHeight * 0.15;
    const priceHeight = chartHeight - volumeHeight - 10;

    // Extents
    const prices = useMemo(() => bars.map(b => [b.o, b.h, b.l, b.c]).flat(), [bars]);
    const minPrice = useMemo(() => Math.min(...prices) * 0.98, [prices]);
    const maxPrice = useMemo(() => Math.max(...prices) * 1.02, [prices]);
    const maxVolume = useMemo(() => Math.max(...bars.map(b => b.v)), [bars]);

    // Scales
    const xScale = useCallback((i: number) => margin.left + (i / Math.max(1, bars.length - 1)) * chartWidth, [bars.length, chartWidth, margin.left]);
    const yScale = useCallback((price: number) => margin.top + priceHeight - ((price - minPrice) / Math.max(0.01, maxPrice - minPrice)) * priceHeight, [margin.top, priceHeight, minPrice, maxPrice]);
    const vScale = useCallback((vol: number) => volumeHeight * (vol / Math.max(1, maxVolume)), [volumeHeight, maxVolume]);

    const candleWidth = Math.max(1, (chartWidth / Math.max(1, bars.length)) * 0.6);

    // Compare line: normalize to percentage
    const compareLinePath = useMemo(() => {
        if (!compareBars || compareBars.length < 2) return null;
        const basePrice = compareBars[0].c;
        const mainBasePrice = bars[0]?.c || 1;

        // Same X range as main, scale compare price proportionally
        const points = compareBars.map((b, i) => {
            const x = margin.left + (i / Math.max(1, compareBars.length - 1)) * chartWidth;
            // Normalize: plot compare relative to its own base, mapped to main chart's range
            const ratio = b.c / basePrice;
            const mappedPrice = mainBasePrice * ratio;
            const y = yScale(mappedPrice);
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
        });
        return points.join(' ');
    }, [compareBars, bars, chartWidth, margin.left, yScale]);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!containerRef.current || bars.length === 0) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left - margin.left;
        let index = Math.round((x / chartWidth) * (bars.length - 1));
        index = Math.max(0, Math.min(index, bars.length - 1));
        setHoverIndex(index);
    }, [bars.length, chartWidth, margin.left]);

    const handleMouseLeave = useCallback(() => setHoverIndex(null), []);

    // Earnings markers mapping
    const earningsMap = useMemo(() => {
        const map = new Map<number, EarningsEvent[]>();
        if (!earningsEvents) return map;

        for (const event of earningsEvents) {
            let closestDist = Infinity;
            let closestIdx = -1;
            const eventTime = new Date(event.event_date).getTime();

            for (let i = 0; i < bars.length; i++) {
                const dist = Math.abs(bars[i].t - eventTime);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestIdx = i;
                }
            }

            if (closestIdx !== -1 && closestDist < 5 * 24 * 60 * 60 * 1000) {
                const list = map.get(closestIdx) || [];
                list.push(event);
                map.set(closestIdx, list);
            }
        }
        return map;
    }, [bars, earningsEvents]);

    // SMA calculations
    const sma20 = useMemo(() => {
        return bars.map((_, i) => {
            if (i < 19) return null;
            const sum = bars.slice(i - 19, i + 1).reduce((acc, b) => acc + b.c, 0);
            return sum / 20;
        });
    }, [bars]);

    const sma50 = useMemo(() => {
        return bars.map((_, i) => {
            if (i < 49) return null;
            const sum = bars.slice(i - 49, i + 1).reduce((acc, b) => acc + b.c, 0);
            return sum / 50;
        });
    }, [bars]);

    if (bars.length === 0) return null;

    const hoverBar = hoverIndex !== null ? bars[hoverIndex] : null;

    return (
        <div
            ref={containerRef}
            className="w-full h-full absolute inset-0 cursor-crosshair select-none"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onTouchMove={(e) => {
                if (!containerRef.current) return;
                const rect = containerRef.current.getBoundingClientRect();
                const x = e.touches[0].clientX - rect.left - margin.left;
                let index = Math.round((x / chartWidth) * (bars.length - 1));
                index = Math.max(0, Math.min(index, bars.length - 1));
                setHoverIndex(index);
            }}
            onTouchEnd={handleMouseLeave}
        >
            {/* OHLCV Tooltip at top */}
            <AnimatePresence>
                {hoverBar && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.08 }}
                        className="absolute top-3 left-3 z-20 flex gap-3 text-[11px] font-mono bg-background/90 backdrop-blur-md px-3 py-2 rounded-lg border border-white/10 pointer-events-none shadow-lg"
                    >
                        <span className="text-text-main font-bold">{new Date(hoverBar.t).toLocaleDateString()}</span>
                        <span>O: <span className="text-text-main">{hoverBar.o.toFixed(2)}</span></span>
                        <span>H: <span className="text-green-400">{hoverBar.h.toFixed(2)}</span></span>
                        <span>L: <span className="text-red-400">{hoverBar.l.toFixed(2)}</span></span>
                        <span>C: <span className="text-text-main font-bold">{hoverBar.c.toFixed(2)}</span></span>
                        <span>V: <span className="text-blue-400">{formatCompact(hoverBar.v)}</span></span>

                        {/* Show earnings info if hovering near an earnings event */}
                        {hoverIndex !== null && earningsMap.has(hoverIndex) && (
                            <span className="text-yellow-400 ml-1">
                                📄 {earningsMap.get(hoverIndex)![0].form} Filing
                            </span>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <svg width={width} height={height} className="absolute inset-0 pointer-events-none">
                {/* Grid Lines */}
                {[0, 0.25, 0.5, 0.75, 1].map(r => {
                    const y = margin.top + (priceHeight * r);
                    const val = maxPrice - (maxPrice - minPrice) * r;
                    return (
                        <g key={r}>
                            <line x1={margin.left} y1={y} x2={width - margin.right} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="2,6" />
                            <text x={width - margin.right + 6} y={y + 4} className="text-[9px] fill-text-muted font-mono">
                                {val.toFixed(0)}
                            </text>
                        </g>
                    );
                })}

                {/* SMA Lines */}
                <path
                    d={sma20.map((v, i) => (v !== null ? `${sma20.findIndex(x => x !== null) === i ? 'M' : 'L'} ${xScale(i)} ${yScale(v)}` : '')).filter(Boolean).join(' ')}
                    fill="none"
                    stroke="rgba(96,165,250,0.6)"
                    strokeWidth="1.5"
                />
                <path
                    d={sma50.map((v, i) => (v !== null ? `${sma50.findIndex(x => x !== null) === i ? 'M' : 'L'} ${xScale(i)} ${yScale(v)}` : '')).filter(Boolean).join(' ')}
                    fill="none"
                    stroke="rgba(251,146,60,0.6)"
                    strokeWidth="1.5"
                />

                {/* Compare overlay line */}
                {compareLinePath && (
                    <path d={compareLinePath} fill="none" stroke="rgba(34,211,238,0.7)" strokeWidth="2" />
                )}

                {/* Candles or Line */}
                <g>
                    {chartType === 'candle' ? (
                        bars.map((b, i) => {
                            const x = xScale(i);
                            const isUp = b.c >= b.o;
                            const color = isUp ? "rgb(34,197,94)" : "rgb(239,68,68)";
                            const yTop = yScale(Math.max(b.o, b.c));
                            const yBot = yScale(Math.min(b.o, b.c));

                            return (
                                <g key={i}>
                                    <line x1={x} y1={yScale(b.h)} x2={x} y2={yScale(b.l)} stroke={color} strokeWidth={1} />
                                    <rect x={x - candleWidth / 2} y={yTop} width={candleWidth} height={Math.max(1, yBot - yTop)} fill={color} />
                                    <rect
                                        x={x - candleWidth / 2}
                                        y={margin.top + priceHeight + 10 + volumeHeight - vScale(b.v)}
                                        width={candleWidth}
                                        height={vScale(b.v)}
                                        fill={color}
                                        opacity={0.25}
                                    />
                                </g>
                            );
                        })
                    ) : (
                        <>
                            {/* Line chart: area fill + line */}
                            <defs>
                                <linearGradient id="lineAreaGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="rgb(0,230,118)" stopOpacity="0.25" />
                                    <stop offset="100%" stopColor="rgb(0,230,118)" stopOpacity="0.02" />
                                </linearGradient>
                            </defs>
                            {/* Area fill */}
                            <path
                                d={
                                    `M ${xScale(0)} ${yScale(bars[0].c)} ` +
                                    bars.map((b, i) => `L ${xScale(i)} ${yScale(b.c)}`).join(' ') +
                                    ` L ${xScale(bars.length - 1)} ${margin.top + priceHeight} L ${xScale(0)} ${margin.top + priceHeight} Z`
                                }
                                fill="url(#lineAreaGrad)"
                            />
                            {/* Line */}
                            <path
                                d={
                                    `M ${xScale(0)} ${yScale(bars[0].c)} ` +
                                    bars.map((b, i) => `L ${xScale(i)} ${yScale(b.c)}`).join(' ')
                                }
                                fill="none"
                                stroke="rgb(0,230,118)"
                                strokeWidth="2"
                            />
                            {/* Volume bars still shown */}
                            {bars.map((b, i) => {
                                const x = xScale(i);
                                const isUp = b.c >= b.o;
                                const color = isUp ? "rgb(34,197,94)" : "rgb(239,68,68)";
                                return (
                                    <rect
                                        key={i}
                                        x={x - candleWidth / 2}
                                        y={margin.top + priceHeight + 10 + volumeHeight - vScale(b.v)}
                                        width={candleWidth}
                                        height={vScale(b.v)}
                                        fill={color}
                                        opacity={0.25}
                                    />
                                );
                            })}
                        </>
                    )}
                </g>

                {/* Earnings Markers */}
                {Array.from(earningsMap.entries()).map(([idx, events]) => {
                    const x = xScale(idx);
                    const isAnnual = events.some(e => e.form === '10-K');
                    const markerColor = isAnnual ? '#a855f7' : '#eab308';

                    return (
                        <g key={`e-${idx}`}>
                            <line
                                x1={x} y1={margin.top}
                                x2={x} y2={margin.top + priceHeight}
                                stroke={markerColor}
                                strokeWidth={1}
                                strokeDasharray="3,3"
                                opacity={0.6}
                            />
                            <circle cx={x} cy={margin.top - 6} r={4} fill={markerColor} opacity={0.9} />
                            <text x={x} y={margin.top - 2} fill="white" fontSize="7" textAnchor="middle" className="pointer-events-none font-bold">
                                E
                            </text>
                        </g>
                    );
                })}

                {/* Crosshair */}
                {hoverIndex !== null && (
                    <g className="pointer-events-none">
                        <line
                            x1={xScale(hoverIndex)} y1={margin.top}
                            x2={xScale(hoverIndex)} y2={height - margin.bottom}
                            stroke="rgba(255,255,255,0.3)"
                            strokeWidth={1}
                            strokeDasharray="2,2"
                        />
                        <line
                            x1={margin.left} y1={yScale(bars[hoverIndex].c)}
                            x2={width - margin.right} y2={yScale(bars[hoverIndex].c)}
                            stroke="rgba(255,255,255,0.3)"
                            strokeWidth={1}
                            strokeDasharray="2,2"
                        />
                        {/* Price badge */}
                        <g transform={`translate(${width - margin.right}, ${yScale(bars[hoverIndex].c)})`}>
                            <rect x="0" y="-10" width="52" height="20" fill="rgba(31,31,31,0.95)" rx="3" stroke="rgba(255,255,255,0.1)" />
                            <text x="26" y="3" fill="white" className="text-[10px] font-mono" textAnchor="middle">
                                {bars[hoverIndex].c.toFixed(2)}
                            </text>
                        </g>
                        {/* Date badge */}
                        <g transform={`translate(${xScale(hoverIndex)}, ${height - margin.bottom + 6})`}>
                            <rect x="-32" y="-8" width="64" height="18" fill="rgba(31,31,31,0.95)" rx="3" stroke="rgba(255,255,255,0.1)" />
                            <text x="0" y="4" fill="white" className="text-[9px] font-mono" textAnchor="middle">
                                {new Date(bars[hoverIndex].t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </text>
                        </g>
                    </g>
                )}
            </svg>
        </div>
    );
}
