"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useSubscription } from "@/hooks/useSubscription";
import { ErnsLogo } from "@/components/erns-logo";

const CheckIcon = () => (
    <svg className="w-5 h-5 text-profit" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
);

const StarIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
);

const plans = [
    {
        id: "starter",
        name: "Starter",
        price: "Free",
        period: "",
        description: "For individual traders getting started",
        features: [
            "5 stocks in watchlist",
            "Basic earnings calendar",
            "Limited screener access",
            "Community support",
        ],
        limitations: [
            "No API key generation",
            "Basic signals only",
            "Limited data access",
        ],
        cta: "Start Free",
        popular: false,
    },
    {
        id: "pro",
        name: "Pro",
        price: "$49",
        period: "/month",
        description: "For serious traders who need an edge",
        features: [
            "Unlimited watchlist",
            "Real-time SEC filing alerts",
            "AI-powered signals",
            "Advanced screener filters",
            "50,000 API calls/month",
            "Priority support",
            "Historical data access",
        ],
        limitations: [],
        cta: "Start Pro Trial",
        popular: true,
    },
    {
        id: "enterprise",
        name: "Enterprise",
        price: "$299",
        period: "/month",
        description: "For funds and professional traders",
        features: [
            "Everything in Pro",
            "Unlimited API calls",
            "Custom signal models",
            "Dedicated support",
            "SLA guarantees",
            "Team management",
            "SSO authentication",
            "Custom integrations",
        ],
        limitations: [],
        cta: "Start Enterprise",
        popular: false,
    },
];

function SelectPlanInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { plan: currentPlan, refresh } = useSubscription();
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Handle return from Stripe Checkout
    useEffect(() => {
        const sessionId = searchParams.get("session_id");
        const plan = searchParams.get("plan");
        if (sessionId) {
            setSuccess(`🎉 Welcome to Erns ${plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : "Pro"}! Your subscription is active.`);
            refresh();
            // Clean up URL
            router.replace("/select-plan", { scroll: false });
        }
    }, [searchParams, refresh, router]);

    const handleSelectPlan = async (planId: string) => {
        // If user already has this plan, go to dashboard
        if (planId === currentPlan) {
            router.push("/dashboard");
            return;
        }

        setSelectedPlan(planId);
        setLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/subscription/select", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ plan: planId }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to select plan");
            }

            // Redirect to Stripe Checkout if a URL was returned
            if (data.url) {
                window.location.href = data.url;
            } else {
                // Starter plan — redirect to dashboard
                refresh();
                router.push("/dashboard");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
            setLoading(false);
            setSelectedPlan(null);
        }
    };

    return (
        <main className="min-h-screen bg-background flex flex-col items-center justify-center py-12 px-4">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-12"
            >
                <div className="mb-6">
                    <ErnsLogo size="lg" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-text-main mb-4">
                    Choose Your Plan
                </h1>
                <p className="text-text-muted max-w-xl mx-auto">
                    Select a plan to continue. You can upgrade or downgrade anytime.
                </p>
            </motion.div>

            {/* Success Message */}
            {success && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 bg-profit/20 border border-profit/50 rounded-lg text-profit text-sm max-w-xl w-full text-center"
                >
                    {success}
                </motion.div>
            )}

            {error && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mb-6 p-4 bg-loss/20 border border-loss/50 rounded-lg text-loss text-sm"
                >
                    {error}
                </motion.div>
            )}

            {/* Plans Grid */}
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl w-full">
                {plans.map((plan, i) => {
                    const isCurrent = plan.id === currentPlan;
                    return (
                        <motion.div
                            key={plan.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className={`relative rounded-2xl border p-6 ${plan.popular
                                ? "border-primary bg-gradient-to-b from-primary/10 to-transparent"
                                : "border-border bg-surface"
                                } ${selectedPlan === plan.id ? "ring-2 ring-primary" : ""} ${isCurrent ? "ring-2 ring-primary/50" : ""}`}
                        >
                            {plan.popular && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full">
                                    Recommended
                                </div>
                            )}

                            <h3 className="text-xl font-bold text-text-main mb-2">{plan.name}</h3>
                            <p className="text-text-muted text-sm mb-4">{plan.description}</p>

                            <div className="mb-6">
                                <span className="text-3xl font-bold text-text-main">{plan.price}</span>
                                <span className="text-text-muted">{plan.period}</span>
                            </div>

                            <ul className="space-y-2 mb-6">
                                {plan.features.map((feature, j) => (
                                    <li key={j} className="flex items-start gap-2 text-sm text-text-muted">
                                        <CheckIcon />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            {plan.limitations.length > 0 && (
                                <div className="mb-6 pt-4 border-t border-border">
                                    <p className="text-xs text-text-muted/70 mb-2">Limitations:</p>
                                    {plan.limitations.map((limit, j) => (
                                        <p key={j} className="text-xs text-loss/80">• {limit}</p>
                                    ))}
                                </div>
                            )}

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleSelectPlan(plan.id)}
                                disabled={loading}
                                className={`w-full py-3 rounded-lg font-semibold transition-all ${isCurrent
                                    ? "border border-primary/50 text-primary bg-primary/10 cursor-default"
                                    : plan.popular
                                        ? "bg-primary text-primary-foreground hover:shadow-[0_0_20px_rgba(0,230,118,0.3)]"
                                        : "border border-border text-text-main hover:border-primary/50 hover:bg-white/5"
                                    } ${loading && selectedPlan === plan.id ? "opacity-70 cursor-not-allowed" : ""}`}
                            >
                                {loading && selectedPlan === plan.id ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Processing...
                                    </span>
                                ) : (
                                    plan.cta
                                )}
                            </motion.button>
                        </motion.div>
                    );
                })}
            </div>

            {/* Footer */}
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-8 text-text-muted text-sm text-center"
            >
                All paid plans include a 14-day free trial. Cancel anytime.
            </motion.p>
        </main>
    );
}

export default function SelectPlanPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-background" />}>
            <SelectPlanInner />
        </Suspense>
    );
}
