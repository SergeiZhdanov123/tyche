"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/dashboard-layout";
import { UserProfile } from "@clerk/nextjs";
import { useSubscription } from "@/hooks/useSubscription";
import { UpgradeBanner } from "@/components/upgrade-banner";
import Link from "next/link";

const UserIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
);

const BellIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
);

const PaletteIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z" />
    </svg>
);

const CreditCardIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
    </svg>
);

const tabs = [
    { id: "account", label: "Account", icon: UserIcon },
    { id: "notifications", label: "Notifications", icon: BellIcon },
    { id: "appearance", label: "Appearance", icon: PaletteIcon },
    { id: "billing", label: "Billing", icon: CreditCardIcon },
];

const planDetails: Record<string, { name: string; price: string; features: string[] }> = {
    starter: {
        name: "Starter",
        price: "Free",
        features: ["Basic earnings data", "5 API calls/day", "3 watchlist stocks", "Community access"],
    },
    pro: {
        name: "Pro",
        price: "$49/mo",
        features: ["Full earnings intelligence", "Unlimited API calls", "Unlimited watchlist", "AI-powered signals", "Priority support"],
    },
    enterprise: {
        name: "Enterprise",
        price: "$299/mo",
        features: ["Everything in Pro", "Unlimited API calls", "Custom signal models", "Dedicated support", "SLA guarantees"],
    },
};

const TIMEZONES = [
    { value: "America/New_York", label: "Eastern (ET)" },
    { value: "America/Chicago", label: "Central (CT)" },
    { value: "America/Denver", label: "Mountain (MT)" },
    { value: "America/Los_Angeles", label: "Pacific (PT)" },
    { value: "America/Anchorage", label: "Alaska (AKT)" },
    { value: "Pacific/Honolulu", label: "Hawaii (HST)" },
    { value: "Europe/London", label: "London (GMT/BST)" },
    { value: "Europe/Berlin", label: "Central Europe (CET)" },
    { value: "Asia/Tokyo", label: "Tokyo (JST)" },
    { value: "Asia/Shanghai", label: "Shanghai (CST)" },
    { value: "Asia/Kolkata", label: "India (IST)" },
    { value: "Australia/Sydney", label: "Sydney (AEST)" },
];

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState("account");
    const { plan, subscriptionStatus, isStarter, isPaid, loading: subLoading } = useSubscription();
    const [portalLoading, setPortalLoading] = useState(false);
    const [theme, setTheme] = useState("dark");
    const [timezone, setTimezone] = useState("America/New_York");
    const [formData, setFormData] = useState({
        emailAlerts: true,
        pushAlerts: true,
        earningsAlerts: true,
        signalAlerts: true,
    });

    // Load saved settings from localStorage
    useEffect(() => {
        try {
            const savedTheme = localStorage.getItem("tyche-theme") || "dark";
            setTheme(savedTheme);
            const savedTz = localStorage.getItem("tyche-timezone") || "America/New_York";
            setTimezone(savedTz);
            const savedNotifs = localStorage.getItem("tyche-notifications");
            if (savedNotifs) {
                setFormData(JSON.parse(savedNotifs));
            }
        } catch { /* ignore */ }
    }, []);

    // Apply theme changes
    const applyTheme = (newTheme: string) => {
        setTheme(newTheme);
        localStorage.setItem("tyche-theme", newTheme);
        let resolvedTheme = newTheme;
        if (newTheme === "system") {
            resolvedTheme = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
        }
        if (resolvedTheme === "light") {
            document.documentElement.setAttribute("data-theme", "light");
        } else {
            document.documentElement.removeAttribute("data-theme");
        }
    };

    // Save timezone
    const handleTimezoneChange = (tz: string) => {
        setTimezone(tz);
        localStorage.setItem("tyche-timezone", tz);
    };

    // Save notification preferences
    const toggleNotif = (key: string) => {
        const updated = { ...formData, [key]: !(formData as Record<string, boolean>)[key] };
        setFormData(updated);
        localStorage.setItem("tyche-notifications", JSON.stringify(updated));
    };

    const handleManageBilling = async () => {
        setPortalLoading(true);
        try {
            const res = await fetch("/api/subscription/portal", { method: "POST" });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            }
        } catch (err) {
            console.error("Failed to open billing portal:", err);
        } finally {
            setPortalLoading(false);
        }
    };

    const currentPlan = plan ? planDetails[plan] : planDetails.starter;
    const statusLabel = subscriptionStatus === "trialing" ? "Trial"
        : subscriptionStatus === "past_due" ? "Past Due"
            : subscriptionStatus === "canceled" ? "Canceled"
                : "Active";
    const statusColor = subscriptionStatus === "active" ? "bg-profit/20 text-profit"
        : subscriptionStatus === "trialing" ? "bg-primary/20 text-primary"
            : subscriptionStatus === "past_due" ? "bg-amber-500/20 text-amber-400"
                : subscriptionStatus === "canceled" ? "bg-loss/20 text-loss"
                    : "bg-profit/20 text-profit";

    return (
        <DashboardLayout title="Settings" subtitle="Manage your account preferences">
            <div className="flex flex-col lg:flex-row gap-6">
                {/* Sidebar Tabs */}
                <motion.nav
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="lg:w-56 space-y-1 shrink-0"
                >
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-all ${activeTab === tab.id
                                ? "bg-primary text-primary-foreground"
                                : "text-text-muted hover:text-text-main hover:bg-white/5"
                                }`}
                        >
                            <tab.icon />
                            <span className="text-sm font-medium">{tab.label}</span>
                        </button>
                    ))}
                </motion.nav>

                {/* Content */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex-1 rounded-xl"
                >
                    {activeTab === "account" && (
                        <div className="flex justify-start">
                            <UserProfile routing="hash" />
                        </div>
                    )}

                    {activeTab === "notifications" && (
                        <div className="space-y-6 bg-surface border border-border rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-text-main">Notification Preferences</h3>
                            <div className="space-y-4">
                                {[
                                    { key: "emailAlerts", label: "Email Alerts", desc: "Receive notifications via email" },
                                    { key: "pushAlerts", label: "Push Notifications", desc: "Browser push notifications" },
                                    { key: "earningsAlerts", label: "Earnings Alerts", desc: "Watchlist earnings announcements" },
                                    { key: "signalAlerts", label: "Signal Alerts", desc: "AI-powered trading signals" },
                                ].map(({ key, label, desc }) => (
                                    <div key={key} className="flex items-center justify-between p-4 bg-background rounded-lg border border-border">
                                        <div>
                                            <p className="font-medium text-text-main">{label}</p>
                                            <p className="text-sm text-text-muted">{desc}</p>
                                        </div>
                                        <button
                                            onClick={() => toggleNotif(key)}
                                            className={`w-12 h-6 rounded-full transition-colors ${(formData as Record<string, boolean>)[key] ? "bg-primary" : "bg-border"}`}
                                        >
                                            <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${(formData as Record<string, boolean>)[key] ? "translate-x-6" : "translate-x-0.5"}`} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === "appearance" && (
                        <div className="space-y-6 bg-surface border border-border rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-text-main">Appearance</h3>

                            {/* Theme Selection */}
                            <div>
                                <p className="text-sm font-medium text-text-main mb-3">Theme</p>
                                <div className="grid grid-cols-3 gap-4">
                                    {[
                                        { id: "dark", bg: "bg-[#020202] border-white/10", label: "Dark" },
                                        { id: "light", bg: "bg-white border-gray-200", label: "Light" },
                                        { id: "system", bg: "bg-gradient-to-r from-[#020202] to-white border-white/10", label: "System" },
                                    ].map(({ id, bg, label }) => (
                                        <button
                                            key={id}
                                            onClick={() => applyTheme(id)}
                                            className={`p-4 rounded-lg border-2 transition-all ${theme === id ? "border-primary" : "border-border hover:border-primary/50"}`}
                                        >
                                            <div className={`w-full h-20 rounded ${bg} border mb-3`} />
                                            <p className="text-sm font-medium text-text-main">{label}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Timezone Selection */}
                            <div>
                                <p className="text-sm font-medium text-text-main mb-3">Timezone</p>
                                <select
                                    value={timezone}
                                    onChange={(e) => handleTimezoneChange(e.target.value)}
                                    className="w-full max-w-sm px-4 py-2.5 bg-background border border-border rounded-lg text-text-main text-sm focus:outline-none focus:border-primary transition-colors"
                                >
                                    {TIMEZONES.map((tz) => (
                                        <option key={tz.value} value={tz.value}>{tz.label}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-text-muted mt-2">Affects displayed times across the dashboard</p>
                            </div>
                        </div>
                    )}

                    {activeTab === "billing" && (
                        <div className="space-y-6">
                            {/* Current Plan */}
                            <div className="bg-surface border border-border rounded-xl p-6">
                                <h3 className="text-lg font-semibold text-text-main mb-4">Billing & Subscription</h3>

                                {subLoading ? (
                                    <div className="h-32 bg-white/5 rounded-lg animate-pulse" />
                                ) : (
                                    <>
                                        {/* Plan Card */}
                                        <div className={`p-4 rounded-lg border ${isStarter ? "bg-background border-border" : "bg-primary/10 border-primary/30"}`}>
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isStarter ? "bg-white/10 text-text-muted" : "bg-primary/20 text-primary"}`}>
                                                        <CreditCardIcon />
                                                    </div>
                                                    <div>
                                                        <p className={`font-bold text-lg ${isStarter ? "text-text-main" : "text-primary"}`}>
                                                            {currentPlan.name} Plan
                                                        </p>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm text-text-muted">{currentPlan.price}</span>
                                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusColor}`}>
                                                                {statusLabel}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {isPaid ? (
                                                    <button
                                                        onClick={handleManageBilling}
                                                        disabled={portalLoading}
                                                        className="px-4 py-2 border border-border rounded-lg text-sm text-text-main hover:border-primary/50 hover:bg-white/5 transition-all disabled:opacity-50"
                                                    >
                                                        {portalLoading ? "Loading..." : "Manage Plan"}
                                                    </button>
                                                ) : (
                                                    <Link href="/select-plan">
                                                        <motion.button
                                                            whileHover={{ scale: 1.02 }}
                                                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:shadow-[0_0_16px_rgba(0,230,118,0.3)] transition-all"
                                                        >
                                                            Upgrade
                                                        </motion.button>
                                                    </Link>
                                                )}
                                            </div>

                                            {/* Plan Features */}
                                            <div className="grid grid-cols-2 gap-1.5 mt-3">
                                                {currentPlan.features.map((f, i) => (
                                                    <p key={i} className="text-xs text-text-muted flex items-center gap-1.5">
                                                        <svg className="w-3 h-3 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                                        </svg>
                                                        {f}
                                                    </p>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Past due warning */}
                                        {subscriptionStatus === "past_due" && (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg"
                                            >
                                                <p className="text-sm font-semibold text-amber-400 mb-1">⚠️ Payment Past Due</p>
                                                <p className="text-xs text-amber-400/70">
                                                    Your last payment failed. Please update your payment method to avoid losing access.
                                                </p>
                                                <button
                                                    onClick={handleManageBilling}
                                                    className="mt-2 px-3 py-1.5 bg-amber-500 text-black rounded-lg text-xs font-semibold hover:bg-amber-400 transition-colors"
                                                >
                                                    Update Payment
                                                </button>
                                            </motion.div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Upgrade Banner for Starter */}
                            {isStarter && !subLoading && (
                                <UpgradeBanner
                                    title="Unlock Full Access"
                                    description="You're on the free plan. Upgrade to unlock all features."
                                />
                            )}
                        </div>
                    )}
                </motion.div>
            </div>
        </DashboardLayout>
    );
}
