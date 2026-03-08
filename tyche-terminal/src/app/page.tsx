"use client";

import { motion, useScroll, useTransform, useInView, AnimatePresence } from "framer-motion";
import { MarketTape } from "@/components/market-tape";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ErnsLogo } from "@/components/erns-logo";
import Link from "next/link";
import { useRef, useState, useEffect } from "react";

/* ═══════════════════════════════════════════════════════════════
   ANIMATED COUNTER
   ═══════════════════════════════════════════════════════════════ */
function AnimatedCounter({ value, suffix = "", prefix = "" }: {
  value: number; suffix?: string; prefix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const inc = Math.ceil(value / 40);
    const timer = setInterval(() => {
      start += inc;
      if (start >= value) { setDisplay(value); clearInterval(timer); }
      else setDisplay(start);
    }, 16);
    return () => clearInterval(timer);
  }, [isInView, value]);

  return <span ref={ref}>{prefix}{isInView ? display.toLocaleString() : "0"}{suffix}</span>;
}

/* ═══════════════════════════════════════════════════════════════
   FLOATING PARTICLES — subtle ambient motion
   ═══════════════════════════════════════════════════════════════ */
function FloatingDots() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-primary/20"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: `${2 + Math.random() * 3}px`,
            height: `${2 + Math.random() * 3}px`,
          }}
          animate={{ y: [0, -20, 0], opacity: [0.1, 0.4, 0.1] }}
          transition={{ duration: 4 + Math.random() * 3, repeat: Infinity, delay: Math.random() * 2, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   GLOW ORB — ambient background
   ═══════════════════════════════════════════════════════════════ */
function GlowOrb({ color = "rgba(0,230,118,0.08)", size = 600, top = "50%", left = "50%" }: {
  color?: string; size?: number; top?: string; left?: string;
}) {
  return (
    <div className="absolute pointer-events-none blur-[140px] will-change-transform"
      style={{ background: color, width: size, height: size, top, left, transform: "translate(-50%, -50%)", borderRadius: "50%" }} />
  );
}

/* ═══════════════════════════════════════════════════════════════
   REVEAL — fast scroll-triggered entrance
   ═══════════════════════════════════════════════════════════════ */
function Reveal({ children, className = "", delay = 0 }: {
  children: React.ReactNode; className?: string; delay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number], delay }}
      className={className}
    >{children}</motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STAGGER VARIANTS
   ═══════════════════════════════════════════════════════════════ */
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.02 } },
};
const staggerChild = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
};

/* ═══════════════════════════════════════════════════════════════
   FAQ ACCORDION
   ═══════════════════════════════════════════════════════════════ */
function FaqItem({ question, answer, isOpen, onToggle }: {
  question: string; answer: string; isOpen: boolean; onToggle: () => void;
}) {
  return (
    <motion.div
      className={`border-b border-white/[0.06] transition-colors duration-200 ${isOpen ? "bg-white/[0.02]" : ""}`}
    >
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between py-5 md:py-6 px-2 text-left group"
      >
        <span className={`text-sm md:text-base font-semibold transition-colors duration-150 ${isOpen ? "text-primary" : "text-text-main group-hover:text-primary"}`}>
          {question}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.15 }}
          className="ml-4 flex-shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-full border border-white/[0.1] flex items-center justify-center"
        >
          <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="overflow-hidden"
          >
            <p className="px-2 pb-5 md:pb-6 text-text-muted text-sm leading-relaxed max-w-3xl">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════════════ */
const features = [
  { icon: "⚡", title: "Real-time SEC Filings", description: "10-K, 10-Q, 8-K, and earnings releases the instant they hit EDGAR. Zero delay. Zero missed alpha.", gradient: "from-emerald-500/20 to-emerald-500/5" },
  { icon: "🧠", title: "AI Signal Detection", description: "Machine learning models detect contrarian patterns, earnings surprises, and anomalous sentiment before the market moves.", gradient: "from-cyan-500/20 to-cyan-500/5" },
  { icon: "📅", title: "Earnings Calendar", description: "Track 5,000+ stocks with pre/post-market timing, historical beat rates, and EPS surprise tracking across every quarter.", gradient: "from-violet-500/20 to-violet-500/5" },
  { icon: "📊", title: "Advanced Screener", description: "Filter by earnings surprise, guidance changes, revenue acceleration, margin expansion — build screens that find alpha.", gradient: "from-amber-500/20 to-amber-500/5" },
  { icon: "🔗", title: "Developer API", description: "RESTful endpoints and WebSocket feeds for algorithmic traders. Build custom models on institutional-grade data.", gradient: "from-rose-500/20 to-rose-500/5" },
  { icon: "🛡️", title: "Portfolio Watchlist", description: "Live monitoring with instant alerts on filings, earnings beats/misses, analyst revisions, and unusual volume spikes.", gradient: "from-teal-500/20 to-teal-500/5" },
];

const faqs = [
  { q: "What data does Erns cover?", a: "Erns covers real-time SEC filings (10-K, 10-Q, 8-K), earnings announcements, analyst estimates, and market data for 5,000+ US equities. We parse every filing from EDGAR the moment it's published and extract key metrics automatically." },
  { q: "How fast is the data?", a: "Our infrastructure is optimized for speed. SEC filings are parsed and available within milliseconds of hitting EDGAR. Market data streams in real-time during trading hours, and earnings alerts are delivered instantly via the dashboard and API." },
  { q: "Can I use Erns for free?", a: "Yes. Our Starter plan is completely free and includes a 5-stock watchlist, basic earnings calendar, and limited screener access. It's a great way to explore the platform before upgrading to Pro for unlimited access and AI-powered signals." },
  { q: "How does the API work?", a: "The Erns API provides RESTful endpoints for accessing earnings data, SEC filings, screener results, and AI signals programmatically. Pro plans include 50K API calls per month, and Enterprise plans offer unlimited access with WebSocket streaming." },
  { q: "What makes Erns different?", a: "Erns is purpose-built for earnings intelligence. Unlike general-purpose terminals, every feature is designed around earnings events and SEC filings. Our AI models specifically detect earnings-related patterns, and our screener is built for finding alpha around earnings announcements." },
  { q: "Can I cancel my subscription?", a: "Absolutely. All paid plans come with a 14-day free trial, and you can cancel anytime from your account settings. There are no contracts or cancellation fees. Your access continues until the end of your billing period." },
];

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════ */
export default function Home() {
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.1], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.1], [1, 0.96]);
  const heroY = useTransform(scrollYProgress, [0, 0.1], [0, 50]);

  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <main className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />

      {/* ══════════════════════════════════════════════════════
          HERO — Cinematic entrance
          ══════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 pt-16 pb-32">
        {/* Grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
        <GlowOrb color="rgba(0,230,118,0.14)" size={900} top="25%" left="50%" />
        <GlowOrb color="rgba(0,150,255,0.06)" size={500} top="65%" left="20%" />
        <GlowOrb color="rgba(160,80,255,0.04)" size={400} top="50%" left="80%" />
        <FloatingDots />

        <motion.div
          style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
          className="relative z-10 flex max-w-5xl flex-col items-center text-center"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="mb-8 md:mb-10"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 backdrop-blur-sm px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-primary shadow-[0_0_40px_-5px_rgba(0,230,118,0.35)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              Real-time Earnings Intelligence
            </span>
          </motion.div>

          {/* Headline — responsive sizing */}
          <motion.h1
            initial={{ opacity: 0, y: 30, filter: "blur(12px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tight text-text-main leading-[1.05]"
          >
            Asymmetric Returns.
            <br />
            <span className="text-gradient-green">Institutional Edge.</span>
          </motion.h1>

          {/* Sub */}
          <motion.p
            initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.35, delay: 0.2, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="mt-6 md:mt-8 max-w-2xl text-base sm:text-lg text-text-muted md:text-xl leading-relaxed px-2"
          >
            SEC filings parsed in real-time. AI-powered contrarian signals.
            Earnings intelligence that gives you the edge{" "}
            <span className="text-primary font-medium">before the market moves.</span>
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="mt-10 md:mt-14 flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto"
          >
            <Link href="/sign-up" className="w-full sm:w-auto">
              <motion.button
                whileHover={{ scale: 1.04, boxShadow: "0 0 60px rgba(0,230,118,0.5)" }}
                whileTap={{ scale: 0.97 }}
                className="group relative overflow-hidden rounded-xl bg-primary px-8 sm:px-10 py-3.5 sm:py-4 text-sm sm:text-base font-semibold text-primary-foreground transition-all duration-200 shadow-[0_0_30px_-5px_rgba(0,230,118,0.4)] w-full sm:w-auto"
              >
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Start Free Trial
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </span>
              </motion.button>
            </Link>
            <Link href="#features" className="w-full sm:w-auto">
              <motion.button
                whileHover={{ scale: 1.03, borderColor: "rgba(0,230,118,0.5)" }}
                whileTap={{ scale: 0.97 }}
                className="rounded-xl border border-border bg-white/5 backdrop-blur-sm px-8 sm:px-10 py-3.5 sm:py-4 text-sm sm:text-base font-semibold text-text-main transition-all duration-200 hover:bg-white/10 w-full sm:w-auto"
              >
                Explore Features
              </motion.button>
            </Link>
          </motion.div>

          {/* Stats — responsive */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.35 }}
            className="mt-12 md:mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-12 md:gap-16"
          >
            {[
              { value: 2400, prefix: "$", suffix: "B+", label: "Market Cap Tracked" },
              { value: 15000, suffix: "+", label: "SEC Filings / Day" },
              { value: 50, prefix: "<", suffix: "ms", label: "Data Latency" },
              { value: 5000, suffix: "+", label: "Stocks Covered" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-primary font-mono">
                  <AnimatedCounter value={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
                </p>
                <p className="mt-1.5 text-xs sm:text-sm text-text-muted">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Market Tape */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="absolute bottom-0 left-0 right-0"
        >
          <MarketTape />
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════════
          FEATURES — 3×2 grid with staggered reveals
          ══════════════════════════════════════════════════════ */}
      <section id="features" className="relative py-20 md:py-40 px-4 sm:px-6">
        <GlowOrb color="rgba(0,230,118,0.07)" size={700} top="30%" left="70%" />
        <GlowOrb color="rgba(100,100,255,0.04)" size={500} top="80%" left="20%" />

        <div className="max-w-6xl mx-auto relative z-10">
          <Reveal>
            <div className="text-center mb-12 md:mb-20">
              <span className="inline-block text-primary text-xs sm:text-sm font-semibold tracking-widest uppercase mb-4 md:mb-6">Features</span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-text-main mb-5 md:mb-8 leading-tight">
                Everything You Need to <span className="text-gradient-green">Win</span>
              </h2>
              <p className="text-text-muted max-w-2xl mx-auto text-base md:text-lg leading-relaxed px-2">
                Real-time data, AI intelligence, and institutional-grade analytics in one powerful platform.
              </p>
            </div>
          </Reveal>

          <motion.div variants={stagger} initial="hidden" whileInView="show"
            viewport={{ once: true, margin: "-40px" }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
          >
            {features.map((feature, i) => (
              <motion.div key={i} variants={staggerChild}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                className="group relative p-6 sm:p-8 rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm hover:border-primary/30 hover:bg-white/[0.06] transition-all duration-200"
              >
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-200`} />
                <div className="relative z-10">
                  <div className="text-2xl sm:text-3xl mb-4 sm:mb-5">{feature.icon}</div>
                  <h3 className="text-lg sm:text-xl font-bold text-text-main mb-2 sm:mb-3 group-hover:text-primary transition-colors duration-150">{feature.title}</h3>
                  <p className="text-text-muted text-sm leading-relaxed">{feature.description}</p>
                </div>
                <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          TERMINAL PREVIEW — Product demo
          ══════════════════════════════════════════════════════ */}
      <section className="relative py-20 md:py-32 px-4 sm:px-6 overflow-hidden">
        <div className="max-w-5xl mx-auto relative z-10">
          <Reveal>
            <div className="text-center mb-10 md:mb-16">
              <span className="inline-block text-primary text-xs sm:text-sm font-semibold tracking-widest uppercase mb-3 md:mb-4">Live Preview</span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-text-main mb-4 md:mb-6">
                See <span className="text-gradient-green">Erns.</span> in Action
              </h2>
              <p className="text-text-muted max-w-xl mx-auto text-base md:text-lg px-2">
                A real-time dashboard built for speed and clarity.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.05}>
            <div className="relative rounded-2xl border border-white/[0.08] bg-surface/80 backdrop-blur-xl overflow-hidden shadow-2xl shadow-black/50">
              {/* Terminal header */}
              <div className="flex items-center gap-2 px-4 sm:px-5 py-3 bg-background/80 border-b border-white/[0.06]">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <span className="ml-3 text-xs text-text-muted font-mono hidden sm:block">erns — dashboard</span>
              </div>

              <div className="p-5 sm:p-8 md:p-10">
                {/* Index cards — responsive */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5 mb-6 sm:mb-8">
                  {[
                    { label: "S&P 500", value: "6,025.99", change: "+0.42%", up: true },
                    { label: "NASDAQ", value: "19,643.86", change: "+0.67%", up: true },
                    { label: "VIX", value: "14.23", change: "-3.12%", up: false },
                  ].map((idx, i) => (
                    <motion.div key={i}
                      initial={{ opacity: 0, x: -15 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.03 + i * 0.05, duration: 0.3 }}
                      className="p-4 sm:p-5 rounded-xl bg-background/60 border border-white/[0.04]"
                    >
                      <p className="text-xs text-text-muted mb-1">{idx.label}</p>
                      <p className="text-lg sm:text-xl font-bold text-text-main font-mono">{idx.value}</p>
                      <p className={`text-sm font-mono mt-0.5 ${idx.up ? "text-profit" : "text-loss"}`}>{idx.change}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Chart */}
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1, duration: 0.35 }}
                  className="h-36 sm:h-44 md:h-52 rounded-xl bg-background/40 border border-white/[0.04] overflow-hidden mb-6 sm:mb-8"
                >
                  <svg className="w-full h-full" viewBox="0 0 800 200" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="chartGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="rgba(0,230,118,0.3)" />
                        <stop offset="100%" stopColor="rgba(0,230,118,0)" />
                      </linearGradient>
                    </defs>
                    <motion.path
                      d="M0,160 C50,140 100,155 150,120 C200,85 250,95 300,70 C350,45 400,55 450,40 C500,25 550,35 600,20 C650,30 700,15 750,25 L800,20 L800,200 L0,200 Z"
                      fill="url(#chartGrad)"
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.15, duration: 0.4 }}
                    />
                    <motion.path
                      d="M0,160 C50,140 100,155 150,120 C200,85 250,95 300,70 C350,45 400,55 450,40 C500,25 550,35 600,20 C650,30 700,15 750,25 L800,20"
                      fill="none" stroke="rgba(0,230,118,0.8)" strokeWidth="2.5"
                      initial={{ pathLength: 0 }}
                      whileInView={{ pathLength: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.15, duration: 1, ease: "easeOut" }}
                    />
                  </svg>
                </motion.div>

                {/* Live alerts */}
                <div className="space-y-2 sm:space-y-3">
                  {[
                    { ticker: "NVDA", signal: "Earnings Beat", detail: "EPS $5.16 vs $4.64 est (+11.2%)", time: "2m ago" },
                    { ticker: "AAPL", signal: "SEC Filing", detail: "10-Q filed — revenue guidance raised", time: "8m ago" },
                    { ticker: "TSLA", signal: "Unusual Volume", detail: "3.2x average volume detected", time: "15m ago" },
                  ].map((alert, i) => (
                    <motion.div key={i}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + i * 0.06, duration: 0.25 }}
                      className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3 rounded-lg bg-background/60 border border-white/[0.04]"
                    >
                      <span className="text-xs font-bold text-primary font-mono bg-primary/10 px-2 sm:px-2.5 py-1 rounded">{alert.ticker}</span>
                      <span className="text-xs sm:text-sm font-semibold text-text-main">{alert.signal}</span>
                      <span className="text-xs text-text-muted flex-1 hidden sm:block truncate">{alert.detail}</span>
                      <span className="text-[10px] text-text-muted/60 font-mono">{alert.time}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          HOW IT WORKS — 3 steps
          ══════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="relative py-20 md:py-40 px-4 sm:px-6">
        <GlowOrb color="rgba(0,230,118,0.05)" size={600} top="50%" left="30%" />

        <div className="max-w-5xl mx-auto relative z-10">
          <Reveal>
            <div className="text-center mb-14 md:mb-24">
              <span className="inline-block text-primary text-xs sm:text-sm font-semibold tracking-widest uppercase mb-4 md:mb-6">How It Works</span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-text-main mb-5 md:mb-8 leading-tight">
                Three Steps to Your <span className="text-gradient-green">Edge</span>
              </h2>
              <p className="text-text-muted max-w-2xl mx-auto text-base md:text-lg px-2">
                From raw SEC data to actionable insights — in seconds.
              </p>
            </div>
          </Reveal>

          <div className="grid sm:grid-cols-3 gap-8 sm:gap-12 relative">
            {/* Connector line */}
            <div className="hidden sm:block absolute top-16 left-[16.67%] w-[66.67%] h-px">
              <motion.div
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-primary/60 via-primary/30 to-primary/60 origin-left"
              />
            </div>

            {[
              { step: "01", title: "Connect", description: "Create your account and build a watchlist. We start monitoring your stocks immediately — every filing, every signal.", icon: "🔌" },
              { step: "02", title: "Analyze", description: "Our AI processes every SEC filing, extracts key metrics, detects sentiment shifts, and surfaces what matters.", icon: "🔬" },
              { step: "03", title: "Execute", description: "Get instant alerts with actionable signals. React to market-moving information before anyone else.", icon: "🎯" },
            ].map((item, i) => (
              <Reveal key={i} delay={i * 0.08}>
                <div className="text-center">
                  <motion.div
                    whileHover={{ scale: 1.08, rotate: 3 }}
                    transition={{ duration: 0.15 }}
                    className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 mb-4 sm:mb-6 text-2xl sm:text-3xl shadow-[0_0_30px_-5px_rgba(0,230,118,0.3)]"
                  >
                    {item.icon}
                  </motion.div>
                  <p className="text-xs font-bold text-primary/50 font-mono mb-2 sm:mb-3">{item.step}</p>
                  <h3 className="text-xl sm:text-2xl font-bold text-text-main mb-3 sm:mb-4">{item.title}</h3>
                  <p className="text-text-muted text-sm leading-relaxed max-w-xs mx-auto">{item.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          BUILT FOR — audience personas
          ══════════════════════════════════════════════════════ */}
      <section className="relative py-20 md:py-40 px-4 sm:px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-surface/20 to-transparent" />
        <GlowOrb color="rgba(0,230,118,0.08)" size={700} top="40%" left="80%" />

        <div className="max-w-6xl mx-auto relative z-10">
          <Reveal>
            <div className="text-center mb-12 md:mb-20">
              <span className="inline-block text-primary text-xs sm:text-sm font-semibold tracking-widest uppercase mb-4 md:mb-6">Built For</span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-text-main mb-4 md:mb-6">
                Your <span className="text-gradient-green">Trading Style</span>
              </h2>
              <p className="text-text-muted max-w-2xl mx-auto text-base md:text-lg px-2">
                Whether you trade earnings, build algorithms, or manage a portfolio — Erns adapts to how you work.
              </p>
            </div>
          </Reveal>

          <motion.div variants={stagger} initial="hidden" whileInView="show"
            viewport={{ once: true, margin: "-40px" }}
            className="grid sm:grid-cols-2 gap-4 sm:gap-6"
          >
            {[
              { icon: "📈", title: "Earnings Traders", description: "Track every earnings announcement across 5,000+ stocks. Beat/miss data, EPS surprise history, and post-earnings price moves in one view.", tools: ["Earnings Calendar", "Surprise Tracker", "Post-Earnings Movers"] },
              { icon: "🤖", title: "Algorithmic Traders", description: "Build custom strategies on our RESTful API. Access real-time SEC filings, market data, and AI signals programmatically.", tools: ["REST API", "WebSocket Feeds", "Historical Data"] },
              { icon: "🔍", title: "Fundamental Analysts", description: "Screen thousands of stocks by revenue growth, margin expansion, guidance changes, and analyst sentiment.", tools: ["Advanced Screener", "Guidance Tracker", "Analyst Leaderboard"] },
              { icon: "💼", title: "Portfolio Managers", description: "Monitor your holdings with instant filing alerts, watchlist signals, and curated financial news.", tools: ["Watchlist Alerts", "SEC Filings", "News Feed"] },
            ].map((persona, i) => (
              <motion.div key={i} variants={staggerChild}
                whileHover={{ y: -4, transition: { duration: 0.15 } }}
                className="group p-6 sm:p-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:border-primary/20 hover:bg-white/[0.04] transition-all duration-200"
              >
                <div className="text-2xl sm:text-3xl mb-4 sm:mb-5">{persona.icon}</div>
                <h3 className="text-lg sm:text-xl font-bold text-text-main mb-2 sm:mb-3 group-hover:text-primary transition-colors duration-150">{persona.title}</h3>
                <p className="text-text-muted text-sm leading-relaxed mb-4 sm:mb-5">{persona.description}</p>
                <div className="flex flex-wrap gap-2">
                  {persona.tools.map((tool, j) => (
                    <span key={j} className="text-xs font-medium text-primary/80 bg-primary/10 px-2.5 sm:px-3 py-1 rounded-full">{tool}</span>
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          FAQ — Accordion
          ══════════════════════════════════════════════════════ */}
      <section className="relative py-20 md:py-40 px-4 sm:px-6">
        <GlowOrb color="rgba(0,150,255,0.04)" size={500} top="40%" left="20%" />

        <div className="max-w-3xl mx-auto relative z-10">
          <Reveal>
            <div className="text-center mb-10 md:mb-16">
              <span className="inline-block text-primary text-xs sm:text-sm font-semibold tracking-widest uppercase mb-4 md:mb-6">FAQ</span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-text-main mb-4 md:mb-6">
                Common <span className="text-gradient-green">Questions</span>
              </h2>
              <p className="text-text-muted max-w-xl mx-auto text-base md:text-lg px-2">
                Everything you need to know about Erns.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.03}>
            <div className="border-t border-white/[0.06] rounded-2xl overflow-hidden">
              {faqs.map((faq, i) => (
                <FaqItem
                  key={i}
                  question={faq.q}
                  answer={faq.a}
                  isOpen={openFaq === i}
                  onToggle={() => setOpenFaq(openFaq === i ? null : i)}
                />
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          PRICING
          ══════════════════════════════════════════════════════ */}
      <section className="relative py-20 md:py-40 px-4 sm:px-6">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-surface/20 to-transparent" />

        <div className="max-w-5xl mx-auto relative z-10">
          <Reveal>
            <div className="text-center mb-12 md:mb-20">
              <span className="inline-block text-primary text-xs sm:text-sm font-semibold tracking-widest uppercase mb-4 md:mb-6">Pricing</span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-text-main mb-4 md:mb-6">
                Plans for Every <span className="text-gradient-green">Trader</span>
              </h2>
              <p className="text-text-muted max-w-2xl mx-auto text-base md:text-lg px-2">
                Start free. Upgrade when you&apos;re ready. Cancel anytime.
              </p>
            </div>
          </Reveal>

          <motion.div variants={stagger} initial="hidden" whileInView="show"
            viewport={{ once: true }}
            className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8"
          >
            {[
              { name: "Starter", price: "Free", period: "", features: ["5 watchlist stocks", "Basic earnings calendar", "Limited screener", "Community support"], cta: "Start Free", popular: false },
              { name: "Pro", price: "$49", period: "/mo", features: ["Unlimited watchlist", "AI-powered signals", "Advanced screener", "50K API calls/mo", "Real-time SEC alerts", "Priority support"], cta: "Start 14-Day Trial", popular: true },
              { name: "Enterprise", price: "$299", period: "/mo", features: ["Everything in Pro", "Unlimited API calls", "Custom signal models", "Dedicated support", "SLA guarantees", "Team management"], cta: "Contact Sales", popular: false },
            ].map((plan, i) => (
              <motion.div key={i} variants={staggerChild}
                whileHover={{ y: -6, transition: { duration: 0.15 } }}
                className={`relative p-6 sm:p-8 rounded-2xl border transition-all duration-200 ${plan.popular
                  ? "border-primary/40 bg-gradient-to-b from-primary/10 to-transparent shadow-[0_0_60px_-10px_rgba(0,230,118,0.2)]"
                  : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]"
                  }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">Most Popular</span>
                  </div>
                )}
                <h3 className="text-lg sm:text-xl font-bold text-text-main mb-3">{plan.name}</h3>
                <div className="mb-6 sm:mb-8">
                  <span className="text-3xl sm:text-4xl font-bold text-text-main">{plan.price}</span>
                  <span className="text-text-muted">{plan.period}</span>
                </div>
                <ul className="space-y-2.5 sm:space-y-3 mb-8 sm:mb-10">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-text-muted">
                      <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/sign-up">
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    className={`w-full py-3 sm:py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 ${plan.popular
                      ? "bg-primary text-primary-foreground shadow-[0_0_30px_-5px_rgba(0,230,118,0.4)]"
                      : "border border-white/[0.1] text-text-main hover:border-primary/40 hover:bg-white/[0.04]"
                      }`}
                  >{plan.cta}</motion.button>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          FINAL CTA
          ══════════════════════════════════════════════════════ */}
      <section className="relative py-20 md:py-40 px-4 sm:px-6 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-15" />
        <GlowOrb color="rgba(0,230,118,0.18)" size={1000} top="50%" left="50%" />

        <Reveal>
          <div className="max-w-3xl mx-auto text-center relative z-10">
            <h2 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold text-text-main mb-6 md:mb-8 leading-tight">
              Ready to Get Your
              <br />
              <span className="text-gradient-green">Institutional Edge</span>?
            </h2>

            <p className="text-text-muted text-base md:text-lg mb-10 md:mb-14 max-w-xl mx-auto leading-relaxed px-2">
              Join traders who&apos;ve upgraded their information advantage.
              14-day free trial — <span className="text-primary font-medium">no credit card required.</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 justify-center">
              <Link href="/sign-up">
                <motion.button
                  whileHover={{ scale: 1.04, boxShadow: "0 0 70px rgba(0,230,118,0.5)" }}
                  whileTap={{ scale: 0.97 }}
                  className="group relative overflow-hidden rounded-xl bg-primary px-10 sm:px-12 py-4 sm:py-5 text-base sm:text-lg font-bold text-primary-foreground shadow-[0_0_40px_-5px_rgba(0,230,118,0.4)]"
                >
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    Launch Terminal
                    <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </span>
                </motion.button>
              </Link>
              <Link href="/pricing">
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  className="rounded-xl border border-white/[0.1] bg-white/[0.04] backdrop-blur-sm px-10 sm:px-12 py-4 sm:py-5 text-base sm:text-lg font-semibold text-text-main hover:border-primary/40 transition-all duration-200"
                >
                  View Plans
                </motion.button>
              </Link>
            </div>

            <p className="mt-10 md:mt-12 text-text-muted/60 text-xs sm:text-sm flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-primary/50" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                Bank-level encryption
              </span>
              <span>·</span>
              <span>SOC 2 Compliant</span>
              <span>·</span>
              <span>Cancel anytime</span>
            </p>
          </div>
        </Reveal>
      </section>

      {/* ══════════════════════════════════════════════════════
          FOOTER — shared component
          ══════════════════════════════════════════════════════ */}
      <Footer />
    </main>
  );
}
