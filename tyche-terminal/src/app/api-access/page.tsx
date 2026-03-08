"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardLayout } from "@/components/dashboard-layout";
import { createAPIKey, listAPIKeys, revokeAPIKey, type APIKeyInfo } from "@/lib/api";
import Link from "next/link";
import { useSubscription } from "@/hooks/useSubscription";
import { UpgradeBanner } from "@/components/upgrade-banner";
import { config } from "@/lib/config";

function CopyIcon() {
    return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
        </svg>
    );
}

function KeyIcon() {
    return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
        </svg>
    );
}

function CheckIcon() {
    return (
        <svg className="w-5 h-5 text-profit" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
    );
}

function TrashIcon() {
    return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
    );
}

export default function APIAccessPage() {
    const [keys, setKeys] = useState<APIKeyInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [newKey, setNewKey] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { plan: userPlan, isStarter } = useSubscription();
    const [userEmail, setUserEmail] = useState<string>("");

    useEffect(() => {
        fetch("/api/auth/me")
            .then((res) => res.json())
            .then((data) => {
                if (data.success && data.user) {
                    setUserEmail(data.user.email);
                }
            })
            .catch(console.error);

        fetchKeys();
    }, []);

    const fetchKeys = async () => {
        setLoading(true);
        try {
            const data = await listAPIKeys(userEmail);
            setKeys(data.keys);
        } catch {
            setKeys([]);
        } finally {
            setLoading(false);
        }
    };

    const isStarterUser = isStarter;

    const handleGenerateKey = async () => {
        if (isStarterUser) {
            setError("Upgrade to Pro or Enterprise to generate API keys.");
            return;
        }
        setGenerating(true);
        setError(null);
        try {
            const data = await createAPIKey(userEmail, (userPlan || "pro") as "starter" | "premium" | "enterprise");
            setNewKey(data.api_key);
            fetchKeys();
        } catch {
            setError("Failed to generate API key. Is the backend running?");
        } finally {
            setGenerating(false);
        }
    };

    const handleRevokeKey = async (keyPrefix: string) => {
        try {
            await revokeAPIKey(userEmail, keyPrefix);
            fetchKeys();
        } catch {
            console.error("Failed to revoke key");
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <DashboardLayout title="API Access" subtitle="Generate keys and manage API access">
            {/* New Key Modal */}
            <AnimatePresence>
                {newKey && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-surface border border-border rounded-2xl p-6 max-w-xl w-full mx-4 shadow-2xl"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-xl bg-profit/20 flex items-center justify-center">
                                    <CheckIcon />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-text-main">API Key Generated!</h3>
                                    <p className="text-sm text-text-muted">Copy this key now — you won&apos;t see it again</p>
                                </div>
                            </div>
                            <div className="bg-background border border-profit/30 rounded-xl p-4 mb-4">
                                <code className="text-sm font-mono text-profit break-all">{newKey}</code>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => copyToClipboard(newKey)}
                                    className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                                >
                                    {copied ? <><CheckIcon /> Copied!</> : <><CopyIcon /> Copy Key</>}
                                </button>
                                <button
                                    onClick={() => setNewKey(null)}
                                    className="px-4 py-2.5 border border-border rounded-lg text-text-muted hover:text-text-main transition-colors"
                                >
                                    Done
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                    {/* Generate Key */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-surface border border-border rounded-2xl p-5"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-lg bg-primary-dim/50 flex items-center justify-center text-primary">
                                <KeyIcon />
                            </div>
                            <div>
                                <h3 className="font-semibold text-text-main">Generate API Key</h3>
                                <p className="text-xs text-text-muted">
                                    Plan: <span className="text-primary font-medium capitalize">{userPlan || "Loading..."}</span>
                                </p>
                            </div>
                        </div>

                        {isStarterUser && (
                            <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs">
                                <p className="font-semibold mb-1 text-amber-400">Starter Plan — API Keys Locked</p>
                                <p className="text-amber-400/70 mb-2">You can test endpoints in the <Link href="/api-playground" className="text-primary underline hover:text-primary/80">API Playground</Link> for free, but generating API keys requires Pro or Enterprise.</p>
                                <div className="flex items-center gap-2 mt-2">
                                    <Link
                                        href="/select-plan"
                                        className="px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-primary text-white rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
                                    >
                                        Upgrade for API Access →
                                    </Link>
                                    <span className="text-text-muted/50">Pro: 50K calls/mo • Enterprise: Unlimited</span>
                                </div>
                            </div>
                        )}

                        {error && <p className="text-sm text-loss mb-3">{error}</p>}

                        <button
                            onClick={handleGenerateKey}
                            disabled={generating || isStarterUser}
                            className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {generating ? "Generating..." : "Generate API Key"}
                        </button>
                    </motion.div>

                    {/* Existing Keys */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-surface border border-border rounded-2xl p-5"
                    >
                        <h3 className="font-semibold text-text-main mb-4">Your API Keys</h3>
                        {loading ? (
                            <div className="space-y-2">
                                {Array(2).fill(0).map((_, i) => (
                                    <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse" />
                                ))}
                            </div>
                        ) : keys.length === 0 ? (
                            <div className="text-center text-text-muted py-6">
                                <p className="text-sm">No API keys yet</p>
                                <p className="text-xs mt-1">Generate one above to get started</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {keys.map((key) => (
                                    <div key={key.key_prefix} className={`p-3 rounded-xl border ${key.is_active ? "border-border" : "border-loss/30 bg-loss/5"}`}>
                                        <div className="flex items-center justify-between mb-1">
                                            <code className="text-sm font-mono text-text-main">{key.masked_key}</code>
                                            {key.is_active && (
                                                <button onClick={() => handleRevokeKey(key.key_prefix)} className="p-1.5 text-text-muted hover:text-loss transition-colors" title="Revoke key">
                                                    <TrashIcon />
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className={`px-1.5 py-0.5 rounded ${key.is_active ? "bg-profit/20 text-profit" : "bg-loss/20 text-loss"}`}>
                                                {key.is_active ? "Active" : "Revoked"}
                                            </span>
                                            <span className="text-text-muted">{key.plan} • {key.total_requests} requests</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                </div>

                {/* Right Column — Quick Start & Links */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Quick Start */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="bg-gradient-to-br from-primary/10 to-cyan-500/5 border border-primary/20 rounded-2xl p-5"
                    >
                        <h3 className="font-semibold text-text-main mb-3">Quick Start</h3>
                        <div className="bg-background/80 rounded-xl p-4 font-mono text-sm">
                            <p className="text-text-muted mb-2"># Get a real-time stock quote</p>
                            <code className="text-primary">curl &quot;{config.apiUrl}/market/quote/AAPL&quot;</code>
                        </div>
                        <p className="text-xs text-text-muted mt-3">
                            Backend: <code className="text-primary">cd backend && uvicorn api:app --reload</code>
                        </p>
                    </motion.div>

                    {/* Links */}
                    <div className="grid sm:grid-cols-2 gap-4">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                            <Link href="/docs" className="block bg-surface border border-border rounded-2xl p-5 hover:border-primary/30 transition-all group">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.331 0 4.478.89 6.078 2.357M12 6.042c1.634-1.467 3.747-2.292 6-2.292 1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18c-2.331 0-4.478.89-6.078 2.357" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-text-main group-hover:text-primary transition-colors">API Documentation</h4>
                                        <p className="text-xs text-text-muted">Full endpoint reference</p>
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                            <Link href="/api-playground" className="block bg-surface border border-border rounded-2xl p-5 hover:border-primary/30 transition-all group">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-text-main group-hover:text-primary transition-colors">API Playground</h4>
                                        <p className="text-xs text-text-muted">Test endpoints live</p>
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                    </div>

                    {/* Rate Limits */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-surface border border-border rounded-2xl p-5"
                    >
                        <h3 className="font-semibold text-text-main mb-4">Plan Rate Limits</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-text-muted border-b border-border">
                                        <th className="pb-3 font-medium">Plan</th>
                                        <th className="pb-3 font-medium">Rate Limit</th>
                                        <th className="pb-3 font-medium">Monthly Calls</th>
                                        <th className="pb-3 font-medium">API Keys</th>
                                    </tr>
                                </thead>
                                <tbody className="text-text-main">
                                    <tr className={`border-b border-border/50 ${userPlan === "starter" ? "bg-primary/5" : ""}`}>
                                        <td className="py-3 flex items-center gap-2">Starter {userPlan === "starter" && <span className="text-[10px] text-primary bg-primary/20 px-1.5 py-0.5 rounded">Current</span>}</td>
                                        <td>30 req/min</td><td>1,000</td><td className="text-text-muted">—</td>
                                    </tr>
                                    <tr className={`border-b border-border/50 ${userPlan === "pro" ? "bg-primary/5" : ""}`}>
                                        <td className="py-3 flex items-center gap-2">Pro {userPlan === "pro" && <span className="text-[10px] text-primary bg-primary/20 px-1.5 py-0.5 rounded">Current</span>}</td>
                                        <td>120 req/min</td><td>50,000</td><td>3 keys</td>
                                    </tr>
                                    <tr className={userPlan === "enterprise" ? "bg-primary/5" : ""}>
                                        <td className="py-3 flex items-center gap-2">Enterprise {userPlan === "enterprise" && <span className="text-[10px] text-primary bg-primary/20 px-1.5 py-0.5 rounded">Current</span>}</td>
                                        <td>600 req/min</td><td>Unlimited</td><td>Unlimited</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                </div>
            </div>
        </DashboardLayout>
    );
}
