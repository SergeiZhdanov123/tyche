'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    getQuote,
    getMultipleQuotes,
    getPriceBars,
    searchTickers,
    getMarketIndices,
    type QuoteResponse,
    type PriceBar,
    type TickerInfo,
    APIError,
} from '@/lib/api';

/**
 * Hook for fetching a single stock quote
 */
export function useQuote(ticker: string | undefined) {
    const [quote, setQuote] = useState<QuoteResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchQuote = useCallback(async () => {
        if (!ticker) return;

        setLoading(true);
        setError(null);

        try {
            const data = await getQuote(ticker);
            setQuote(data);
        } catch (err) {
            if (err instanceof APIError) {
                setError(err.detail);
            } else {
                setError('Failed to fetch quote');
            }
        } finally {
            setLoading(false);
        }
    }, [ticker]);

    useEffect(() => {
        fetchQuote();
    }, [fetchQuote]);

    return { quote, loading, error, refetch: fetchQuote };
}

/**
 * Hook for fetching multiple quotes at once with live polling
 */
export function useQuotes(tickers: string[], pollIntervalMs: number = 30000) {
    const [quotes, setQuotes] = useState<QuoteResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const hasLoadedRef = { current: false };

    const fetchQuotes = useCallback(async () => {
        if (!tickers || tickers.length === 0) return;

        // Only show loading skeleton on the very first fetch
        if (!hasLoadedRef.current) {
            setLoading(true);
        }
        setError(null);

        try {
            const data = await getMultipleQuotes(tickers);
            setQuotes(data.quotes);
            setLastUpdated(new Date());
            hasLoadedRef.current = true;
        } catch (err) {
            if (err instanceof APIError) {
                setError(err.detail);
            } else {
                setError('Failed to fetch quotes');
            }
        } finally {
            setLoading(false);
        }
    }, [tickers.join(',')]);

    useEffect(() => {
        fetchQuotes();
        if (pollIntervalMs > 0) {
            const interval = setInterval(fetchQuotes, pollIntervalMs);
            return () => clearInterval(interval);
        }
    }, [fetchQuotes, pollIntervalMs]);

    return { quotes, loading, error, lastUpdated, refetch: fetchQuotes };
}


/**
 * Hook for fetching price history bars
 */
export function usePriceBars(
    ticker: string | undefined,
    range: '1D' | '5D' | '1M' | '3M' | '6M' | '1Y' | '5Y' = '1M',
    timespan: 'minute' | 'hour' | 'day' | 'week' | 'month' = 'day'
) {
    const [bars, setBars] = useState<PriceBar[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchBars = useCallback(async () => {
        if (!ticker) return;

        setLoading(true);
        setError(null);

        try {
            const data = await getPriceBars(ticker, range, timespan);
            setBars(data.bars);
        } catch (err) {
            if (err instanceof APIError) {
                setError(err.detail);
            } else {
                setError('Failed to fetch price data');
            }
        } finally {
            setLoading(false);
        }
    }, [ticker, range, timespan]);

    useEffect(() => {
        fetchBars();
    }, [fetchBars]);

    return { bars, loading, error, refetch: fetchBars };
}

/**
 * Hook for searching tickers
 */
export function useTickerSearch(query: string, limit: number = 10) {
    const [results, setResults] = useState<TickerInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const search = useCallback(async () => {
        if (!query || query.length < 1) {
            setResults([]);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const data = await searchTickers(query, limit);
            setResults(data.results);
        } catch (err) {
            if (err instanceof APIError) {
                setError(err.detail);
            } else {
                setError('Search failed');
            }
        } finally {
            setLoading(false);
        }
    }, [query, limit]);

    useEffect(() => {
        const debounce = setTimeout(() => {
            search();
        }, 300);

        return () => clearTimeout(debounce);
    }, [search]);

    return { results, loading, error };
}

/**
 * Hook for polling live quote data
 */
export function useLiveQuote(
    ticker: string | undefined,
    intervalMs: number = 10000 // 10 seconds default
) {
    const [quote, setQuote] = useState<QuoteResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchQuote = useCallback(async () => {
        if (!ticker) return;

        setLoading(true);

        try {
            const data = await getQuote(ticker);
            setQuote(data);
            setLastUpdated(new Date());
            setError(null);
        } catch (err) {
            if (err instanceof APIError) {
                setError(err.detail);
            } else {
                setError('Failed to fetch quote');
            }
        } finally {
            setLoading(false);
        }
    }, [ticker]);

    useEffect(() => {
        fetchQuote();

        const interval = setInterval(fetchQuote, intervalMs);

        return () => clearInterval(interval);
    }, [fetchQuote, intervalMs]);

    return { quote, loading, error, lastUpdated };
}

interface MarketIndex {
    symbol: string;
    name: string;
    price: number;
    change: number;
    change_pct: number;
}

/**
 * Hook for fetching market indices (S&P 500, NASDAQ, DOW, VIX) with live polling
 */
export function useMarketIndices(pollIntervalMs: number = 10000) {
    const [indices, setIndices] = useState<MarketIndex[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchIndices = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const data = await getMarketIndices();
            setIndices(data.indices);
            setLastUpdated(new Date());
        } catch (err) {
            if (err instanceof APIError) {
                setError(err.detail);
            } else {
                setError('Failed to fetch indices');
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchIndices();
        if (pollIntervalMs > 0) {
            const interval = setInterval(fetchIndices, pollIntervalMs);
            return () => clearInterval(interval);
        }
    }, [fetchIndices, pollIntervalMs]);

    return { indices, loading, error, lastUpdated, refetch: fetchIndices };
}
