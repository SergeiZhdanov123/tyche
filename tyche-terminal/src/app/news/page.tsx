"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/dashboard-layout";

interface Article {
    title: string;
    description: string;
    url: string;
    urlToImage: string | null;
    source: { name: string };
    publishedAt: string;
    author: string | null;
}

const CATEGORIES = [
    { id: "earnings", label: "Earnings", query: "earnings report stock" },
    { id: "markets", label: "Markets", query: "stock market wall street" },
    { id: "sec", label: "SEC & Filings", query: "SEC filing regulation" },
    { id: "economy", label: "Economy", query: "economy federal reserve inflation" },
];

export default function NewsPage() {
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState("earnings");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchNews = async () => {
            setLoading(true);
            setError(null);
            const category = CATEGORIES.find((c) => c.id === activeCategory);
            const query = encodeURIComponent(category?.query || "earnings");
            const apiKey = process.env.NEXT_PUBLIC_NEWSAPI_KEY;

            try {
                const res = await fetch(
                    `https://newsapi.org/v2/everything?q=${query}&language=en&sortBy=publishedAt&pageSize=20&apiKey=${apiKey}`
                );
                const data = await res.json();
                if (data.status === "ok") {
                    setArticles(data.articles || []);
                } else {
                    setError(data.message || "Failed to fetch news");
                    setArticles([]);
                }
            } catch {
                setError("Failed to connect to news service");
                setArticles([]);
            } finally {
                setLoading(false);
            }
        };

        fetchNews();
    }, [activeCategory]);

    const timeAgo = (date: string) => {
        const diff = Date.now() - new Date(date).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    return (
        <DashboardLayout title="Market News" subtitle="Real-time financial news and earnings coverage">
            {/* Category Tabs */}
            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
                {CATEGORIES.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${activeCategory === cat.id
                                ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(0,230,118,0.2)]"
                                : "bg-surface border border-border text-text-muted hover:text-text-main hover:border-primary/30"
                            }`}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>

            {error && (
                <div className="mb-6 p-4 bg-loss/10 border border-loss/30 rounded-xl text-loss text-sm">
                    {error}
                </div>
            )}

            {/* News Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {loading
                    ? Array(9).fill(0).map((_, i) => (
                        <div key={i} className="bg-surface border border-border rounded-2xl overflow-hidden animate-pulse">
                            <div className="h-40 bg-white/5" />
                            <div className="p-5">
                                <div className="h-4 bg-white/5 rounded mb-2 w-3/4" />
                                <div className="h-4 bg-white/5 rounded mb-4 w-1/2" />
                                <div className="h-3 bg-white/5 rounded w-full mb-2" />
                                <div className="h-3 bg-white/5 rounded w-2/3" />
                            </div>
                        </div>
                    ))
                    : articles.map((article, i) => (
                        <motion.a
                            key={`${article.url}-${i}`}
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="group bg-surface/80 backdrop-blur-sm border border-border rounded-2xl overflow-hidden hover:border-primary/30 transition-all hover:shadow-[0_0_30px_rgba(0,230,118,0.05)]"
                        >
                            {article.urlToImage && (
                                <div className="h-40 overflow-hidden relative">
                                    <img
                                        src={article.urlToImage}
                                        alt=""
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent" />
                                </div>
                            )}
                            <div className="p-5">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                        {article.source.name}
                                    </span>
                                    <span className="text-[10px] text-text-muted">{timeAgo(article.publishedAt)}</span>
                                </div>
                                <h3 className="font-semibold text-text-main text-sm leading-tight mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                                    {article.title}
                                </h3>
                                <p className="text-xs text-text-muted line-clamp-2">
                                    {article.description}
                                </p>
                            </div>
                        </motion.a>
                    ))}
            </div>

            {!loading && articles.length === 0 && !error && (
                <div className="text-center py-20 text-text-muted">
                    <p className="text-lg mb-2">No articles found</p>
                    <p className="text-sm">Try a different category</p>
                </div>
            )}
        </DashboardLayout>
    );
}
