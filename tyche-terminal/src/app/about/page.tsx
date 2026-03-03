"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

const values = [
    {
        icon: "⚡",
        title: "Speed is Alpha",
        description: "In markets, milliseconds matter. Every feature we build is optimized for speed — from sub-50ms data latency to instant SEC filing parsing.",
    },
    {
        icon: "🎯",
        title: "Signal Over Noise",
        description: "We don't overwhelm you with data. Our AI surfaces what matters — the signals that move markets — so you can focus on making decisions.",
    },
    {
        icon: "🔓",
        title: "Democratize Access",
        description: "Institutional-grade intelligence shouldn't be locked behind $25,000/year terminals. We make Wall Street tools accessible to every trader.",
    },
    {
        icon: "🛡️",
        title: "Trust & Transparency",
        description: "Your data is yours. We never sell personal information, we're SOC 2 compliant, and our AI models explain their reasoning — no black boxes.",
    },
];

const stats = [
    { value: "5,000+", label: "Stocks Covered" },
    { value: "15,000+", label: "Filings Parsed Daily" },
    { value: "<50ms", label: "Data Latency" },
    { value: "99.9%", label: "Uptime SLA" },
];

export default function AboutPage() {
    return (
        <main className="min-h-screen bg-background">
            <Navbar />

            {/* Hero */}
            <section className="pt-28 sm:pt-36 pb-16 sm:pb-24 px-4 sm:px-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
                <div className="absolute pointer-events-none blur-[140px] bg-[rgba(0,230,118,0.1)] w-[700px] h-[700px] top-[20%] left-[50%] -translate-x-1/2 -translate-y-1/2 rounded-full" />

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="max-w-3xl mx-auto text-center relative z-10"
                >
                    <span className="inline-block text-primary text-xs sm:text-sm font-semibold tracking-widest uppercase mb-4 sm:mb-6">About Erns</span>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-text-main mb-5 sm:mb-6 leading-tight">
                        Building the Future of{" "}
                        <span className="text-gradient-green">Earnings Intelligence</span>
                    </h1>
                    <p className="text-text-muted text-base sm:text-lg max-w-2xl mx-auto leading-relaxed px-2">
                        Erns was founded on a simple belief: every trader deserves access to
                        the same intelligence that institutional investors use to gain an edge.
                    </p>
                </motion.div>
            </section>

            {/* Mission */}
            <section className="py-16 sm:py-24 px-4 sm:px-6 border-t border-white/[0.06]">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="grid md:grid-cols-2 gap-10 md:gap-16 items-center"
                    >
                        <div>
                            <span className="text-primary text-xs sm:text-sm font-semibold tracking-widest uppercase mb-3 block">Our Mission</span>
                            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-text-main mb-4 sm:mb-6 leading-tight">
                                Level the Playing Field
                            </h2>
                            <p className="text-text-muted text-sm sm:text-base leading-relaxed mb-4">
                                For decades, institutional investors had access to real-time SEC
                                filing analysis, earnings intelligence, and AI-powered trading signals
                                — tools that cost tens of thousands of dollars per year.
                            </p>
                            <p className="text-text-muted text-sm sm:text-base leading-relaxed">
                                Erns changes that. We built an earnings intelligence platform that
                                parses every SEC filing the moment it hits EDGAR, runs AI analysis
                                to detect sentiment and surprises, and delivers actionable signals
                                — all at a price any serious trader can afford.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {stats.map((stat, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 10 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.06 }}
                                    className="p-5 rounded-xl border border-white/[0.06] bg-white/[0.02] text-center"
                                >
                                    <p className="text-xl sm:text-2xl font-bold text-primary font-mono mb-1">
                                        {stat.value}
                                    </p>
                                    <p className="text-xs text-text-muted">{stat.label}</p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Founder */}
            <section className="py-16 sm:py-24 px-4 sm:px-6 border-t border-white/[0.06]">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-10 sm:mb-14"
                    >
                        <span className="text-primary text-xs sm:text-sm font-semibold tracking-widest uppercase mb-3 block">Leadership</span>
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-text-main">
                            Meet the Founder
                        </h2>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="flex flex-col md:flex-row items-center gap-8 md:gap-12 max-w-2xl mx-auto"
                    >
                        <div className="flex-shrink-0">
                            <div className="relative w-40 h-40 sm:w-48 sm:h-48 rounded-2xl overflow-hidden border-2 border-primary/30 shadow-[0_0_40px_-10px_rgba(0,230,118,0.3)]">
                                <Image
                                    src="/sergei.png"
                                    alt="Sergei Zhdanov — CEO & Founder"
                                    fill
                                    className="object-cover"
                                />
                            </div>
                        </div>
                        <div className="text-center md:text-left">
                            <h3 className="text-xl sm:text-2xl font-bold text-text-main mb-1">
                                Sergei Zhdanov
                            </h3>
                            <p className="text-primary font-semibold text-sm mb-4">CEO & Founder</p>
                            <p className="text-text-muted text-sm leading-relaxed">
                                Sergei built Erns with a vision to make institutional-grade financial
                                intelligence accessible to every trader. With a deep passion for
                                markets, data engineering, and AI, he designed the platform from the
                                ground up to deliver real-time earnings analysis, SEC filing parsing,
                                and AI-powered trading signals at unprecedented speed.
                            </p>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Values */}
            <section className="py-16 sm:py-24 px-4 sm:px-6 border-t border-white/[0.06]">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-10 sm:mb-14"
                    >
                        <span className="text-primary text-xs sm:text-sm font-semibold tracking-widest uppercase mb-3 block">Our Values</span>
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-text-main">
                            What Drives Us
                        </h2>
                    </motion.div>

                    <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                        {values.map((val, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 15 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.06 }}
                                className="p-6 sm:p-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:border-primary/20 transition-all"
                            >
                                <div className="text-2xl sm:text-3xl mb-4">{val.icon}</div>
                                <h3 className="text-lg font-bold text-text-main mb-2">{val.title}</h3>
                                <p className="text-text-muted text-sm leading-relaxed">{val.description}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-16 sm:py-24 px-4 sm:px-6 border-t border-white/[0.06] bg-surface/30">
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="max-w-2xl mx-auto text-center"
                >
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-text-main mb-4">
                        Ready to trade with an edge?
                    </h2>
                    <p className="text-text-muted mb-8 px-2">
                        Join thousands of traders who use Erns for real-time earnings intelligence.
                    </p>
                    <a href="/sign-up">
                        <motion.button
                            whileHover={{ scale: 1.03, boxShadow: "0 0 50px rgba(0,230,118,0.4)" }}
                            whileTap={{ scale: 0.97 }}
                            className="px-10 py-4 bg-primary text-primary-foreground rounded-xl font-semibold shadow-[0_0_30px_-5px_rgba(0,230,118,0.4)] transition-all"
                        >
                            Get Started Free →
                        </motion.button>
                    </a>
                </motion.div>
            </section>

            <Footer />
        </main>
    );
}
