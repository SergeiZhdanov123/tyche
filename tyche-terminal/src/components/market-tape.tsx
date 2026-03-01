"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

// Stock data type
interface StockTicker {
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
}

// Mock stock data - in production this would come from a real API
const mockStocks: StockTicker[] = [
    { symbol: "AAPL", price: 178.72, change: 2.34, changePercent: 1.33 },
    { symbol: "NVDA", price: 721.28, change: 15.67, changePercent: 2.22 },
    { symbol: "TSLA", price: 248.50, change: -4.23, changePercent: -1.67 },
    { symbol: "MSFT", price: 415.32, change: 3.21, changePercent: 0.78 },
    { symbol: "GOOGL", price: 141.80, change: 1.45, changePercent: 1.03 },
    { symbol: "AMZN", price: 178.25, change: 2.89, changePercent: 1.65 },
    { symbol: "META", price: 485.39, change: -2.11, changePercent: -0.43 },
    { symbol: "AMD", price: 164.72, change: 4.56, changePercent: 2.85 },
    { symbol: "NFLX", price: 628.90, change: 8.34, changePercent: 1.34 },
    { symbol: "JPM", price: 198.45, change: -1.23, changePercent: -0.62 },
    { symbol: "V", price: 278.90, change: 1.87, changePercent: 0.67 },
    { symbol: "WMT", price: 165.23, change: 0.45, changePercent: 0.27 },
];

function TickerItem({ stock }: { stock: StockTicker }) {
    const isPositive = stock.change >= 0;

    return (
        <div className="flex items-center gap-3 px-6 whitespace-nowrap">
            <span className="font-mono font-bold text-text-main text-sm">
                {stock.symbol}
            </span>
            <span className="font-mono text-text-muted text-sm">
                ${stock.price.toFixed(2)}
            </span>
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
        </div>
    );
}

export function MarketTape() {
    const [stocks, setStocks] = useState<StockTicker[]>(mockStocks);

    // Simulate real-time updates
    useEffect(() => {
        const interval = setInterval(() => {
            setStocks((prevStocks) =>
                prevStocks.map((stock) => {
                    // Random price fluctuation between -0.5% and +0.5%
                    const fluctuation = (Math.random() - 0.5) * 0.01;
                    const newPrice = stock.price * (1 + fluctuation);
                    const newChange = newPrice - (stock.price - stock.change);
                    const newChangePercent = (newChange / (newPrice - newChange)) * 100;

                    return {
                        ...stock,
                        price: newPrice,
                        change: newChange,
                        changePercent: newChangePercent,
                    };
                })
            );
        }, 3000);

        return () => clearInterval(interval);
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
