"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useSubscription } from "@/hooks/useSubscription";

interface ProGateProps {
    children: React.ReactNode;
    feature?: string;
}

/**
 * Wraps page content and shows an upgrade prompt for Starter users.
 * Pro/Enterprise users see the children normally.
 */
export function ProGate({ children, feature = "This feature" }: ProGateProps) {
    const { isPaid, loading } = useSubscription();

    if (loading) return null;

    if (!isPaid) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-20"
            >
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500/20 to-primary/20 flex items-center justify-center mb-6">
                    <svg className="w-10 h-10 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-text-main mb-2">Pro Feature</h2>
                <p className="text-text-muted text-center max-w-md mb-2">
                    {feature} is available exclusively for Pro and Enterprise users.
                </p>
                <p className="text-text-muted/60 text-sm text-center max-w-sm mb-6">
                    Upgrade to unlock AI-powered signals, advanced screener, post-earnings movers, guidance tracking, and much more.
                </p>
                <Link
                    href="/select-plan"
                    className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-primary text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
                >
                    Upgrade to Pro — $49/mo
                </Link>
                <p className="text-[10px] text-text-muted/30 mt-3">14-day free trial included</p>
            </motion.div>
        );
    }

    return <>{children}</>;
}
