"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STEPS = [
    {
        icon: "📊",
        title: "Welcome to Erns.",
        description: "Your all-in-one earnings intelligence platform. Let's take a quick tour of the key features.",
    },
    {
        icon: "📈",
        title: "Dashboard",
        description: "Your command center. View market indices, watchlist performance, today's earnings, and the week ahead — all in one place.",
    },
    {
        icon: "🔍",
        title: "Stock Chart & Analysis",
        description: "Dive deep into any stock with interactive charts, EPS history, revenue comparisons, and AI-powered earnings reviews.",
    },
    {
        icon: "📅",
        title: "Earnings Calendar",
        description: "Never miss an earnings event. Track upcoming announcements, historical surprises, and real-time sentiment analysis.",
    },
    {
        icon: "⚡",
        title: "Signals & Screener",
        description: "Use AI-driven signals and the advanced screener to find asymmetric trading opportunities before the market catches on.",
    },
    {
        icon: "🔔",
        title: "Stay Notified",
        description: "Add stocks to your watchlist and receive alerts when earnings are announced. Hit the bell icon anytime to check notifications.",
    },
];

interface OnboardingModalProps {
    onComplete: () => void;
}

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
    const [step, setStep] = useState(0);

    const handleNext = () => {
        if (step < STEPS.length - 1) {
            setStep(step + 1);
        } else {
            onComplete();
        }
    };

    const handleSkip = () => {
        onComplete();
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
                >
                    {/* Header */}
                    <div className="relative h-48 bg-gradient-to-br from-primary/20 via-cyan-500/10 to-purple-500/10 flex items-center justify-center">
                        <motion.span
                            key={step}
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", damping: 15 }}
                            className="text-7xl"
                        >
                            {STEPS[step].icon}
                        </motion.span>

                        {/* Step counter */}
                        <div className="absolute top-4 right-4 px-2.5 py-1 bg-background/50 rounded-full text-xs text-text-muted font-mono">
                            {step + 1}/{STEPS.length}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={step}
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -20, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <h2 className="text-xl font-bold text-text-main mb-2">
                                    {STEPS[step].title}
                                </h2>
                                <p className="text-sm text-text-muted leading-relaxed">
                                    {STEPS[step].description}
                                </p>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Footer */}
                    <div className="px-6 pb-6 flex items-center justify-between">
                        {/* Progress dots */}
                        <div className="flex gap-1.5">
                            {STEPS.map((_, i) => (
                                <div
                                    key={i}
                                    className={`h-1.5 rounded-full transition-all ${i === step
                                        ? "w-6 bg-primary"
                                        : i < step
                                            ? "w-1.5 bg-primary/50"
                                            : "w-1.5 bg-border"
                                        }`}
                                />
                            ))}
                        </div>

                        {/* Buttons */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleSkip}
                                className="text-xs text-text-muted hover:text-text-main transition-colors"
                            >
                                Skip
                            </button>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleNext}
                                className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:shadow-[0_0_16px_rgba(0,230,118,0.3)] transition-all"
                            >
                                {step < STEPS.length - 1 ? "Next" : "Get Started"}
                            </motion.button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
