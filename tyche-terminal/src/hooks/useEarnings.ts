'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    getTodayEarnings,
    getWeekEarnings,
    getUpcomingEarnings,
    getEarningsByDate,
    getEarningsSummary,
    getEarningsAnalysts,
    getEarningsReaction,
    getCompanyEarningsEvents,
    type CalendarEvent,
    type EarningsEvent,
    type EarningsSummary,
    type EarningsAnalystsResponse,
    APIError,
} from '@/lib/api';

/**
 * Hook for fetching today's earnings calendar with live polling
 */
export function useTodayEarnings(pollIntervalMs: number = 60000) {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchEarnings = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const data = await getTodayEarnings();
            setEvents(data.events);
            setLastUpdated(new Date());
        } catch (err) {
            if (err instanceof APIError) {
                setError(err.detail);
            } else {
                setError('Failed to fetch earnings calendar');
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchEarnings();
        if (pollIntervalMs > 0) {
            const interval = setInterval(fetchEarnings, pollIntervalMs);
            return () => clearInterval(interval);
        }
    }, [fetchEarnings, pollIntervalMs]);

    return { events, loading, error, lastUpdated, refetch: fetchEarnings };
}

/**
 * Hook for fetching this week's earnings with live polling
 */
export function useWeekEarnings(pollIntervalMs: number = 60000) {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchEarnings = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const data = await getWeekEarnings();
            setEvents(data.events);
            setDateRange({ start: data.start_date, end: data.end_date });
            setLastUpdated(new Date());
        } catch (err) {
            if (err instanceof APIError) {
                setError(err.detail);
            } else {
                setError('Failed to fetch earnings calendar');
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchEarnings();
        if (pollIntervalMs > 0) {
            const interval = setInterval(fetchEarnings, pollIntervalMs);
            return () => clearInterval(interval);
        }
    }, [fetchEarnings, pollIntervalMs]);

    return { events, dateRange, loading, error, lastUpdated, refetch: fetchEarnings };
}

/**
 * Hook for fetching upcoming earnings for N days
 */
export function useUpcomingEarnings(days: number = 7) {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchEarnings = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const data = await getUpcomingEarnings(days);
            setEvents(data.events);
        } catch (err) {
            if (err instanceof APIError) {
                setError(err.detail);
            } else {
                setError('Failed to fetch earnings calendar');
            }
        } finally {
            setLoading(false);
        }
    }, [days]);

    useEffect(() => {
        fetchEarnings();
    }, [fetchEarnings]);

    return { events, loading, error, refetch: fetchEarnings };
}

/**
 * Hook for fetching earnings by specific date
 */
export function useEarningsByDate(date: string | undefined) {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchEarnings = useCallback(async () => {
        if (!date) return;

        setLoading(true);
        setError(null);

        try {
            const data = await getEarningsByDate(date);
            setEvents(data.events);
        } catch (err) {
            if (err instanceof APIError) {
                setError(err.detail);
            } else {
                setError('Failed to fetch earnings calendar');
            }
        } finally {
            setLoading(false);
        }
    }, [date]);

    useEffect(() => {
        fetchEarnings();
    }, [fetchEarnings]);

    return { events, loading, error, refetch: fetchEarnings };
}

/**
 * Hook for fetching earnings summary for a ticker
 */
export function useEarningsSummary(ticker: string | undefined) {
    const [summary, setSummary] = useState<EarningsSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSummary = useCallback(async () => {
        if (!ticker) return;

        setLoading(true);
        setError(null);

        try {
            const data = await getEarningsSummary(ticker);
            setSummary(data);
        } catch (err) {
            if (err instanceof APIError) {
                setError(err.detail);
            } else {
                setError('Failed to fetch earnings summary');
            }
        } finally {
            setLoading(false);
        }
    }, [ticker]);

    useEffect(() => {
        fetchSummary();
    }, [fetchSummary]);

    return { summary, loading, error, refetch: fetchSummary };
}

/**
 * Hook for fetching analyst ratings for a ticker
 */
export function useEarningsAnalysts(ticker: string | undefined) {
    const [analysts, setAnalysts] = useState<EarningsAnalystsResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchAnalysts = useCallback(async () => {
        if (!ticker) return;

        setLoading(true);
        setError(null);

        try {
            const data = await getEarningsAnalysts(ticker);
            setAnalysts(data);
        } catch (err) {
            if (err instanceof APIError) {
                setError(err.detail);
            } else {
                setError('Failed to fetch analyst data');
            }
        } finally {
            setLoading(false);
        }
    }, [ticker]);

    useEffect(() => {
        fetchAnalysts();
    }, [fetchAnalysts]);

    return { analysts, loading, error, refetch: fetchAnalysts };
}

/**
 * Hook for fetching earnings reaction data
 */
export function useEarningsReaction(ticker: string | undefined, windowDays: number = 5) {
    const [reaction, setReaction] = useState<{
        ticker: string;
        event_date: string;
        window_days: number;
        ref_close: number | null;
        end_close: number | null;
        return_pct: number | null;
        max_drawdown_pct: number | null;
        max_runup_pct: number | null;
        volume_sum: number | null;
        notes: string[];
    } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchReaction = useCallback(async () => {
        if (!ticker) return;

        setLoading(true);
        setError(null);

        try {
            const data = await getEarningsReaction(ticker, windowDays);
            setReaction(data);
        } catch (err) {
            if (err instanceof APIError) {
                setError(err.detail);
            } else {
                setError('Failed to fetch earnings reaction');
            }
        } finally {
            setLoading(false);
        }
    }, [ticker, windowDays]);

    useEffect(() => {
        fetchReaction();
    }, [fetchReaction]);

    return { reaction, loading, error, refetch: fetchReaction };
}

/**
 * Hook for fetching historical earnings events for a company
 */
export function useCompanyEarningsEvents(ticker: string | undefined, limit: number = 20) {
    const [events, setEvents] = useState<EarningsEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchEvents = useCallback(async () => {
        if (!ticker) {
            setEvents([]);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const data = await getCompanyEarningsEvents(ticker, limit);
            setEvents(data);
        } catch (err) {
            if (err instanceof APIError) {
                setError(err.detail);
            } else {
                setError('Failed to fetch historical earnings events');
            }
        } finally {
            setLoading(false);
        }
    }, [ticker, limit]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    return { events, loading, error, refetch: fetchEvents };
}

/**
 * Group earnings events by date
 */
export function groupEventsByDate(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
    const grouped = new Map<string, CalendarEvent[]>();

    for (const event of events) {
        const existing = grouped.get(event.earnings_date) || [];
        existing.push(event);
        grouped.set(event.earnings_date, existing);
    }

    return grouped;
}

/**
 * Group earnings events by time (BMO/AMC)
 */
export function groupEventsByTime(events: CalendarEvent[]): {
    bmo: CalendarEvent[];
    amc: CalendarEvent[];
    unknown: CalendarEvent[];
} {
    const bmo: CalendarEvent[] = [];
    const amc: CalendarEvent[] = [];
    const unknown: CalendarEvent[] = [];

    for (const event of events) {
        if (event.earnings_time === 'BMO') {
            bmo.push(event);
        } else if (event.earnings_time === 'AMC') {
            amc.push(event);
        } else {
            unknown.push(event);
        }
    }

    return { bmo, amc, unknown };
}
