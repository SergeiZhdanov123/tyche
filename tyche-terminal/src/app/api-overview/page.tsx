"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

const endpoints = [
    { method: "GET", path: "/earnings/calendar", description: "Upcoming and historical earnings dates for all covered tickers" },
    { method: "GET", path: "/earnings/surprises", description: "EPS beat/miss data with estimate vs actual comparisons" },
    { method: "GET", path: "/filings/recent", description: "Real-time SEC filing feed — 10-K, 10-Q, 8-K, and more" },
    { method: "GET", path: "/signals/latest", description: "AI-generated trading signals with confidence scores" },
    { method: "GET", path: "/screener/run", description: "Run custom screens with 50+ filter criteria" },
    { method: "WS", path: "/stream/filings", description: "WebSocket stream for sub-second filing delivery" },
];

const apiFeatures = [
    {
        title: "RESTful & WebSocket",
        description: "Standard REST for queries, WebSocket for real-time streams. Pick the right tool for every use case.",
        icon: "🔌",
    },
    {
        title: "Sub-50ms Latency",
        description: "Infrastructure designed for speed. Get SEC filings and market data faster than your competition.",
        icon: "⚡",
    },
    {
        title: "Comprehensive Data",
        description: "Earnings, filings, estimates, analyst ratings, insider trades, and AI signals — all in one API.",
        icon: "📊",
    },
    {
        title: "Battle-Tested SDKs",
        description: "Official Python and Node.js SDKs with TypeScript support. Get started in minutes, not hours.",
        icon: "🛠️",
    },
];

export default function ApiOverviewPage() {
    return (
        <main className="min-h-screen bg-background">
            <Navbar />

            {/* Hero */}
            <section className="pt-28 sm:pt-32 pb-16 sm:pb-20 px-4 sm:px-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
                <div className="absolute pointer-events-none blur-[140px] bg-[rgba(0,230,118,0.1)] w-[700px] h-[700px] top-[20%] left-[50%] -translate-x-1/2 -translate-y-1/2 rounded-full" />

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="max-w-4xl mx-auto text-center relative z-10"
                >
                    <span className="inline-block text-primary text-xs sm:text-sm font-semibold tracking-widest uppercase mb-4 sm:mb-6">Developer API</span>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-text-main mb-4 sm:mb-6 leading-tight">
                        Build on <span className="text-gradient-green">Institutional-Grade</span> Data
                    </h1>
                    <p className="text-text-muted text-base sm:text-lg max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed px-2">
                        RESTful endpoints, WebSocket streams, and comprehensive SDKs.
                        Access real-time SEC filings, earnings data, and AI signals programmatically.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                        <Link href="/docs">
                            <motion.button
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                className="w-full sm:w-auto px-8 py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold shadow-[0_0_30px_-5px_rgba(0,230,118,0.4)] hover:shadow-[0_0_50px_-5px_rgba(0,230,118,0.5)] transition-all"
                            >
                                View Documentation →
                            </motion.button>
                        </Link>
                        <Link href="/api-playground">
                            <motion.button
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                className="w-full sm:w-auto px-8 py-3.5 border border-border rounded-xl font-semibold text-text-main hover:border-primary/50 hover:bg-white/5 transition-all"
                            >
                                Try Playground
                            </motion.button>
                        </Link>
                    </div>
                </motion.div>
            </section>

            {/* Code Preview */}
            <section className="py-12 sm:py-16 px-4 sm:px-6">
                <div className="max-w-3xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="rounded-2xl border border-white/[0.08] bg-surface/80 overflow-hidden shadow-2xl"
                    >
                        <div className="flex items-center gap-2 px-4 py-3 bg-background/80 border-b border-white/[0.06]">
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                                <div className="w-3 h-3 rounded-full bg-green-500/80" />
                            </div>
                            <span className="ml-3 text-xs text-text-muted font-mono">example.py</span>
                        </div>
                        <pre className="p-5 sm:p-6 text-xs sm:text-sm font-mono text-text-muted overflow-x-auto">
                            <code>{`import tyche

client = tyche.Client(api_key="YOUR_KEY")

# Get upcoming earnings
earnings = client.earnings.calendar(
    start_date="2026-03-01",
    end_date="2026-03-07"
)

# Stream real-time SEC filings  
async for filing in client.filings.stream():
    if filing.form_type in ["10-K", "8-K"]:
        analysis = client.ai.analyze(filing)
        print(f"{filing.ticker}: {analysis.sentiment}")`}</code>
                        </pre>
                    </motion.div>
                </div>
            </section>

            {/* Features */}
            <section className="py-16 sm:py-24 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-12 sm:mb-16"
                    >
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-text-main mb-4">
                            Why Developers Choose <span className="text-primary">Erns</span>
                        </h2>
                        <p className="text-text-muted max-w-xl mx-auto px-2">
                            Purpose-built for algorithmic trading, quantitative research, and fintech applications.
                        </p>
                    </motion.div>

                    <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                        {apiFeatures.map((feature, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 15 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.06 }}
                                className="p-6 sm:p-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:border-primary/20 transition-all"
                            >
                                <div className="text-2xl sm:text-3xl mb-4">{feature.icon}</div>
                                <h3 className="text-lg font-bold text-text-main mb-2">{feature.title}</h3>
                                <p className="text-text-muted text-sm leading-relaxed">{feature.description}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Endpoints */}
            <section className="py-16 sm:py-24 px-4 sm:px-6 border-t border-white/[0.06]">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-10 sm:mb-14"
                    >
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-text-main mb-4">
                            Popular Endpoints
                        </h2>
                        <p className="text-text-muted px-2">
                            Access everything you need through clean, well-documented endpoints.
                        </p>
                    </motion.div>

                    <div className="space-y-2 sm:space-y-3">
                        {endpoints.map((ep, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -15 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.04 }}
                                className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-primary/20 transition-all"
                            >
                                <span className={`text-xs font-bold font-mono px-2.5 py-1 rounded ${ep.method === "WS" ? "bg-cyan-500/10 text-cyan-400" : "bg-primary/10 text-primary"}`}>
                                    {ep.method}
                                </span>
                                <code className="text-sm font-mono text-text-main hidden sm:block">{ep.path}</code>
                                <code className="text-xs font-mono text-text-main sm:hidden">{ep.path}</code>
                                <span className="text-xs sm:text-sm text-text-muted flex-1 hidden md:block">{ep.description}</span>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Rate Limits */}
            <section className="py-16 sm:py-24 px-4 sm:px-6 border-t border-white/[0.06]">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-10 sm:mb-14"
                    >
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-text-main mb-4">
                            Rate Limits & Pricing
                        </h2>
                    </motion.div>

                    <div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
                        {[
                            { plan: "Starter", calls: "1,000", rate: "10 req/s", price: "Free" },
                            { plan: "Pro", calls: "50,000", rate: "100 req/s", price: "$49/mo" },
                            { plan: "Enterprise", calls: "Unlimited", rate: "1,000 req/s", price: "$299/mo" },
                        ].map((tier, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.06 }}
                                className="p-6 rounded-xl border border-white/[0.06] bg-white/[0.02] text-center"
                            >
                                <h3 className="text-lg font-bold text-text-main mb-3">{tier.plan}</h3>
                                <p className="text-3xl font-bold text-primary font-mono mb-1">{tier.calls}</p>
                                <p className="text-xs text-text-muted mb-3">calls / month</p>
                                <p className="text-sm text-text-muted">{tier.rate}</p>
                                <p className="mt-4 text-lg font-semibold text-text-main">{tier.price}</p>
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
                    className="max-w-3xl mx-auto text-center"
                >
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-text-main mb-4">
                        Ready to build?
                    </h2>
                    <p className="text-text-muted mb-8 px-2">
                        Get your API key and start building in minutes. Full documentation and examples included.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                        <Link href="/sign-up">
                            <motion.button
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                className="w-full sm:w-auto px-8 py-4 bg-primary text-primary-foreground rounded-xl font-semibold shadow-[0_0_30px_-5px_rgba(0,230,118,0.4)] transition-all"
                            >
                                Get API Key — Free
                            </motion.button>
                        </Link>
                        <Link href="/docs">
                            <motion.button
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                className="w-full sm:w-auto px-8 py-4 border border-border rounded-xl font-semibold text-text-main hover:border-primary/50 transition-all"
                            >
                                Read the Docs
                            </motion.button>
                        </Link>
                    </div>
                </motion.div>
            </section>

            <Footer />
        </main>
    );
}
