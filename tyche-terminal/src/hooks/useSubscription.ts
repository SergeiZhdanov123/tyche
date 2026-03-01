"use client";

import { useState, useEffect, useCallback } from "react";

export type Plan = "starter" | "pro" | "enterprise" | null;
export type SubStatus = "active" | "trialing" | "canceled" | "past_due" | null;

interface SubscriptionData {
    plan: Plan;
    subscriptionStatus: SubStatus;
    subscriptionStartedAt: string | null;
    hasSelectedPlan: boolean;
    loading: boolean;
    isStarter: boolean;
    isPro: boolean;
    isEnterprise: boolean;
    isPaid: boolean;
    refresh: () => void;
}

// Simple cache so multiple components don't re-fetch
let _cache: { plan: Plan; status: SubStatus; startedAt: string | null; hasSelected: boolean } | null = null;
let _lastFetch = 0;
const CACHE_TTL = 30_000; // 30 seconds

export function useSubscription(): SubscriptionData {
    const [plan, setPlan] = useState<Plan>(_cache?.plan ?? null);
    const [status, setStatus] = useState<SubStatus>(_cache?.status ?? null);
    const [startedAt, setStartedAt] = useState<string | null>(_cache?.startedAt ?? null);
    const [hasSelected, setHasSelected] = useState(_cache?.hasSelected ?? false);
    const [loading, setLoading] = useState(!_cache);

    const fetchSub = useCallback(async () => {
        try {
            const res = await fetch("/api/subscription");
            if (!res.ok) return;
            const data = await res.json();
            if (data.success) {
                setPlan(data.plan);
                setStatus(data.subscriptionStatus);
                setStartedAt(data.subscriptionStartedAt);
                setHasSelected(data.hasSelectedPlan);
                _cache = {
                    plan: data.plan,
                    status: data.subscriptionStatus,
                    startedAt: data.subscriptionStartedAt,
                    hasSelected: data.hasSelectedPlan,
                };
                _lastFetch = Date.now();
            }
        } catch {
            // silently fail
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (_cache && Date.now() - _lastFetch < CACHE_TTL) {
            setLoading(false);
            return;
        }
        fetchSub();
    }, [fetchSub]);

    return {
        plan,
        subscriptionStatus: status,
        subscriptionStartedAt: startedAt,
        hasSelectedPlan: hasSelected,
        loading,
        isStarter: plan === "starter" || plan === null,
        isPro: plan === "pro",
        isEnterprise: plan === "enterprise",
        isPaid: plan === "pro" || plan === "enterprise",
        refresh: fetchSub,
    };
}
