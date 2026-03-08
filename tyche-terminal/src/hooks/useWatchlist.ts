"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
    getWatchlist,
    addToWatchlist as apiAdd,
    removeFromWatchlist as apiRemove,
    type WatchlistItem,
} from "@/lib/api";

/**
 * Module-level shared state so every component using this hook
 * sees the same watchlist (like Zustand, but zero-dep).
 */
let _listeners: Set<() => void> = new Set();
let _items: WatchlistItem[] = [];
let _loading = true;
let _email: string | null = null;
let _fetchPromise: Promise<void> | null = null;

function _notify() {
    _listeners.forEach((fn) => fn());
}

async function _fetchWatchlist(email: string) {
    _email = email;
    _loading = true;
    _notify();
    try {
        const data = await getWatchlist(email);
        _items = data.items || [];
    } catch {
        // keep existing items on error
    } finally {
        _loading = false;
        _fetchPromise = null;
        _notify();
    }
}

async function _addTicker(email: string, ticker: string, notes?: string) {
    try {
        await apiAdd(email, ticker, notes);
        // Optimistic update
        const t = ticker.toUpperCase();
        if (!_items.find((i) => i.ticker === t)) {
            _items = [..._items, { ticker: t, added_at: new Date().toISOString(), notes: notes || null }];
            _notify();
        }
        // Create a notification for watchlist add
        try {
            await fetch("/api/notifications", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "watchlist",
                    title: `${t} added to watchlist`,
                    message: `You're now tracking ${t}. You'll receive alerts for earnings events.`,
                    ticker: t,
                }),
            });
        } catch { /* notification creation is non-critical */ }
        // Background refresh for accuracy
        _fetchWatchlist(email);
    } catch (err) {
        console.error("Failed to add ticker:", err);
        throw err;
    }
}

async function _removeTicker(email: string, ticker: string) {
    const t = ticker.toUpperCase();
    // Optimistic remove
    _items = _items.filter((i) => i.ticker !== t);
    _notify();
    try {
        await apiRemove(email, t);
    } catch (err) {
        console.error("Failed to remove ticker:", err);
        // Refetch to restore accurate state
        _fetchWatchlist(email);
        throw err;
    }
}

/**
 * useWatchlist – global watchlist backed by the backend API.
 * 
 * Every component that calls this hook shares the same state.
 * Provide the user email so we know which backend watchlist to use.
 */
export function useWatchlist(email?: string | null) {
    const [, forceUpdate] = useState(0);
    const emailRef = useRef(email);
    emailRef.current = email;

    // Subscribe to shared state changes
    useEffect(() => {
        const listener = () => forceUpdate((n) => n + 1);
        _listeners.add(listener);
        return () => { _listeners.delete(listener); };
    }, []);

    // Fetch on first mount or when email changes
    useEffect(() => {
        if (!email) return;
        // Always re-fetch if the email changed, or if we haven't fetched yet
        if (_email !== email || (!_fetchPromise && _loading)) {
            _fetchPromise = _fetchWatchlist(email);
        }
    }, [email]);

    const addTicker = useCallback(
        async (ticker: string, notes?: string) => {
            if (!emailRef.current) return;
            await _addTicker(emailRef.current, ticker, notes);
        },
        []
    );

    const removeTicker = useCallback(
        async (ticker: string) => {
            if (!emailRef.current) return;
            await _removeTicker(emailRef.current, ticker);
        },
        []
    );

    const refetch = useCallback(() => {
        if (!emailRef.current) return;
        _fetchWatchlist(emailRef.current);
    }, []);

    const tickers = useMemo(() => _items.map((i) => i.ticker), [_items]);

    return {
        items: _items,
        tickers,
        loading: _loading,
        addTicker,
        removeTicker,
        refetch,
    };
}
