"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const StarIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
);

const CheckIcon = () => (
    <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
);

const ArrowIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
);

interface UpgradeBannerProps {
    /** Compact mode for sidebar */
    compact?: boolean;
    /** Override title */
    title?: string;
    /** Override description */
    description?: string;
    /** Context-specific features to highlight */
    features?: string[];
}

export function UpgradeBanner({
    compact = false,
    title,
    description,
    features,
}: UpgradeBannerProps) {
    const defaultFeatures = [
        "Unlimited watchlist & screener",
        "AI-powered trading signals",
        "50,000 API calls/month",
        "Real-time SEC filing alerts",
    ];

    const displayFeatures = features || defaultFeatures;

    if (compact) {
        return (
            <Link href="/select-plan">
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="mx-3 mb-4 p-3 rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-cyan-500/10 border border-primary/30 cursor-pointer group"
                >
                    <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-6 h-6 rounded-md bg-primary/30 flex items-center justify-center text-primary">
                            <StarIcon />
                        </div>
                        <span className="text-xs font-bold text-primary">Upgrade to Pro</span>
                    </div>
                    <p className="text-[10px] text-text-muted leading-tight mb-2">
                        Unlock unlimited access, AI signals & API
                    </p>
                    <div className="flex items-center gap-1 text-[10px] text-primary group-hover:gap-2 transition-all">
                        <span className="font-semibold">$49/mo</span>
                        <ArrowIcon />
                    </div>
                </motion.div>
            </Link>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-cyan-500/10 p-5"
        >
            {/* Glow effect */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl" />

            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/30 flex items-center justify-center text-primary">
                        <StarIcon />
                    </div>
                    <div>
                        <h3 className="font-bold text-text-main text-sm">
                            {title || "Upgrade to Pro"}
                        </h3>
                        <p className="text-[10px] text-text-muted">
                            {description || "Unlock the full power of Erns"}
                        </p>
                    </div>
                </div>

                <ul className="space-y-1.5 mb-4 mt-3">
                    {displayFeatures.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-text-muted">
                            <CheckIcon />
                            <span>{feature}</span>
                        </li>
                    ))}
                </ul>

                <Link href="/select-plan">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:shadow-[0_0_20px_rgba(0,230,118,0.3)] transition-all flex items-center justify-center gap-2"
                    >
                        Upgrade Now — $49/mo
                        <ArrowIcon />
                    </motion.button>
                </Link>

                <p className="text-center text-[10px] text-text-muted mt-2">
                    14-day free trial • Cancel anytime
                </p>
            </div>
        </motion.div>
    );
}
