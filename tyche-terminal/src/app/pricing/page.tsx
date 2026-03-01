"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

const CheckIcon = () => (
    <svg className="w-5 h-5 text-profit" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
);

const plans = [
    {
        name: "Starter",
        price: "Free",
        period: "",
        description: "For individual traders getting started",
        features: [
            "5 stocks in watchlist",
            "Basic SEC filing alerts",
            "Earnings calendar",
            "1,000 API calls/month",
            "Community support",
        ],
        cta: "Get Started",
        href: "/sign-up",
        popular: false,
    },
    {
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
        cta: "Start Free Trial",
        href: "/sign-up?plan=pro",
        popular: true,
    },
    {
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
        cta: "Contact Sales",
        href: "/contact",
        popular: false,
    },
];

const faqs = [
    {
        q: "What's included in the free trial?",
        a: "You get full access to Pro features for 14 days, no credit card required. Cancel anytime.",
    },
    {
        q: "How does the API work?",
        a: "RESTful API with WebSocket support. Access SEC filings, earnings data, and signals programmatically.",
    },
    {
        q: "Can I switch plans later?",
        a: "Yes, upgrade or downgrade anytime. Changes take effect immediately with prorated billing.",
    },
    {
        q: "Is my data secure?",
        a: "SOC 2 compliant with bank-level encryption. We never share or sell your data.",
    },
];

export default function PricingPage() {
    return (
        <main className="min-h-screen bg-background">
            <Navbar />

            {/* Header */}
            <section className="pt-32 pb-16 px-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-4xl mx-auto text-center"
                >
                    <h1 className="text-4xl md:text-5xl font-bold text-text-main mb-4">
                        Simple, Transparent <span className="text-primary">Pricing</span>
                    </h1>
                    <p className="text-text-muted text-lg max-w-2xl mx-auto">
                        Start free and scale as you grow. No hidden fees, cancel anytime.
                    </p>
                </motion.div>
            </section>

            {/* Plans */}
            <section className="pb-24 px-6">
                <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6">
                    {plans.map((plan, i) => (
                        <motion.div
                            key={plan.name}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className={`relative rounded-2xl border p-8 ${plan.popular
                                ? "border-primary bg-gradient-to-b from-primary/10 to-transparent"
                                : "border-border bg-surface"
                                }`}
                        >
                            {plan.popular && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full">
                                    Most Popular
                                </div>
                            )}

                            <h3 className="text-xl font-bold text-text-main mb-2">{plan.name}</h3>
                            <p className="text-text-muted text-sm mb-6">{plan.description}</p>

                            <div className="mb-6">
                                <span className="text-4xl font-bold text-text-main">{plan.price}</span>
                                <span className="text-text-muted">{plan.period}</span>
                            </div>

                            <ul className="space-y-3 mb-8">
                                {plan.features.map((feature, j) => (
                                    <li key={j} className="flex items-start gap-3 text-sm text-text-muted">
                                        <CheckIcon />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <Link href={plan.href}>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className={`w-full py-3 rounded-lg font-semibold transition-all ${plan.popular
                                        ? "bg-primary text-primary-foreground hover:shadow-[0_0_20px_rgba(0,230,118,0.3)]"
                                        : "border border-border text-text-main hover:border-primary/50 hover:bg-white/5"
                                        }`}
                                >
                                    {plan.cta}
                                </motion.button>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* FAQ */}
            <section className="py-24 px-6 border-t border-border">
                <div className="max-w-3xl mx-auto">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-3xl font-bold text-text-main text-center mb-12"
                    >
                        Frequently Asked Questions
                    </motion.h2>

                    <div className="space-y-6">
                        {faqs.map((faq, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="p-6 bg-surface border border-border rounded-xl"
                            >
                                <h4 className="font-semibold text-text-main mb-2">{faq.q}</h4>
                                <p className="text-text-muted text-sm">{faq.a}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-24 px-6 border-t border-border bg-surface/30">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="max-w-3xl mx-auto text-center"
                >
                    <h2 className="text-3xl font-bold text-text-main mb-4">
                        Ready to get started?
                    </h2>
                    <p className="text-text-muted mb-8">
                        Start your 14-day free trial today. No credit card required.
                    </p>
                    <Link href="/sign-up">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="px-8 py-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:shadow-[0_0_30px_rgba(0,230,118,0.4)] transition-all"
                        >
                            Start Free Trial
                        </motion.button>
                    </Link>
                </motion.div>
            </section>

            <Footer />
        </main>
    );
}
