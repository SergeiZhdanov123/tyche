"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { config } from "@/lib/config";

// Stock data type
interface StockTicker {
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
}

// Fallback data while real quotes load
const fallbackStocks: StockTicker[] = [
    { symbol: "AAPL", price: 0, change: 0, changePercent: 0 },
    { symbol: "NVDA", price: 0, change: 0, changePercent: 0 },
    { symbol: "TSLA", price: 0, change: 0, changePercent: 0 },
    { symbol: "MSFT", price: 0, change: 0, changePercent: 0 },
    { symbol: "GOOGL", price: 0, change: 0, changePercent: 0 },
    { symbol: "AMZN", price: 0, change: 0, changePercent: 0 },
    { symbol: "META", price: 0, change: 0, changePercent: 0 },
    { symbol: "AMD", price: 0, change: 0, changePercent: 0 },
    { symbol: "NFLX", price: 0, change: 0, changePercent: 0 },
    { symbol: "JPM", price: 0, change: 0, changePercent: 0 },
    { symbol: "V", price: 0, change: 0, changePercent: 0 },
    { symbol: "WMT", price: 0, change: 0, changePercent: 0 },
];

const TICKER_SYMBOLS = fallbackStocks.map(s => s.symbol).join(",");

function TickerItem({ stock }: { stock: StockTicker }) {
    const isPositive = stock.change >= 0;
    const loaded = stock.price > 0;

    return (
        <div className="flex items-center gap-3 px-6 whitespace-nowrap">
            <span className="font-mono font-bold text-text-main text-sm">
                {stock.symbol}
            </span>
            <span className="font-mono text-text-muted text-sm">
                {loaded ? `$${stock.price.toFixed(2)}` : "—"}
            </span>
            {loaded && (
                <>
                    <span
                        className={`font-mono text-sm font-medium ${isPositive ? "text-profit" : "text-loss"
                            }`}
                    >
                        {isPositive ? "+" : ""}
                        {stock.change.toFixed(2)} ({isPositive ? "+" : ""}
                        {stock.changePercent.toFixed(2)}%)
                    </span>
                    {/* Trend indicator */}
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className={`w-4 h-4 ${isPositive ? "text-profit" : "text-loss rotate-180"}`}
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4.5 15.75l7.5-7.5 7.5 7.5"
                        />
                    </svg>
                </>
            )}
        </div>
    );
}

export function MarketTape() {
    const [stocks, setStocks] = useState<StockTicker[]>(fallbackStocks);

    useEffect(() => {
        let mounted = true;

        async function fetchQuotes() {
            try {
                const res = await fetch(`${config.apiUrl}/market/quotes?tickers=${TICKER_SYMBOLS}`);
                if (!res.ok) return;
                const data = await res.json();
                if (!mounted || !data.quotes) return;

                // Map API response to our StockTicker format
                const updated: StockTicker[] = data.quotes.map((q: {
                    ticker: string;
                    price: number;
                    change: number;
                    change_pct: number;
                }) => ({
                    symbol: q.ticker,
                    price: q.price || 0,
                    change: q.change || 0,
                    changePercent: q.change_pct || 0,
                }));
                if (updated.length > 0) setStocks(updated);
            } catch {
                // Keep fallback data on error
            }
        }

        // Fetch immediately
        fetchQuotes();
        // Refresh every 60 seconds
        const interval = setInterval(fetchQuotes, 60000);
        return () => { mounted = false; clearInterval(interval); };
    }, []);

    // Double the stocks array for seamless infinite scroll
    const duplicatedStocks = [...stocks, ...stocks];

    return (
        <div className="relative w-full overflow-hidden border-y border-border bg-surface/50 backdrop-blur-sm py-3">
            {/* Fade edges */}
            <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

            {/* Scrolling content */}
            <motion.div
                className="flex"
                animate={{
                    x: [0, -50 * stocks.length * 10],
                }}
                transition={{
                    x: {
                        repeat: Infinity,
                        repeatType: "loop",
                        duration: 60,
                        ease: "linear",
                    },
                }}
            >
                {duplicatedStocks.map((stock, index) => (
                    <TickerItem key={`${stock.symbol}-${index}`} stock={stock} />
                ))}
            </motion.div>

            {/* Live indicator */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 z-20 bg-background/80 backdrop-blur-sm px-2 py-1 rounded">
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                <span className="text-xs font-medium text-primary uppercase tracking-wider">
                    Live
                </span>
            </div>
        </div>
    );
}
