"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ErnsChat } from "@/components/erns-chat";
import { OnboardingModal } from "@/components/onboarding-modal";
import { ErnsLogo } from "@/components/erns-logo";
import { config } from "@/lib/config";

// Icon Components
const Icons = {
    Dashboard: () => (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
    ),
    Screener: () => (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
        </svg>
    ),
    Calendar: () => (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
    ),
    Chart: () => (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
    ),
    Signals: () => (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        </svg>
    ),
    Watchlist: () => (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
    ),
    API: () => (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
        </svg>
    ),
    Settings: () => (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    ),
    Logout: () => (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
        </svg>
    ),
    Bell: () => (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
    ),
    Search: () => (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
    ),
    ChevronUp: () => (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
        </svg>
    ),
    News: () => (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
        </svg>
    ),
    Blog: () => (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
        </svg>
    ),
    Playground: () => (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
        </svg>
    ),
};

import { useUser, useClerk } from "@clerk/nextjs";
import { useSubscription } from "@/hooks/useSubscription";
import { UpgradeBanner } from "@/components/upgrade-banner";

// ... existing code ...
interface DashboardLayoutProps {
    children: React.ReactNode;
    title: string;
    subtitle?: string;
    headerRight?: React.ReactNode;
}

const sidebarItems = [
    { icon: Icons.Dashboard, label: "Dashboard", href: "/dashboard" },
    { icon: Icons.Screener, label: "Screener", href: "/screener" },
    { icon: Icons.Chart, label: "Chart", href: "/chart" },
    { icon: Icons.Calendar, label: "Earnings", href: "/earnings" },
    { icon: Icons.Signals, label: "Signals", href: "/signals", badge: "PRO" },
    {
        icon: () => (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
        ), label: "Live Earnings", href: "/live-earnings", badge: "PRO"
    },
    { icon: Icons.Watchlist, label: "Watchlist", href: "/watchlist" },
    {
        icon: () => (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
        ), label: "Filings", href: "/filings"
    },
    { icon: Icons.News, label: "News", href: "/news" },
    { icon: Icons.Blog, label: "Blogs", href: "/blogs" },
    {
        icon: () => (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 01-2.77.672c-.99 0-1.932-.223-2.77-.672" />
            </svg>
        ), label: "Analyst Board", href: "/analyst-leaderboard"
    },
    {
        icon: () => (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
            </svg>
        ), label: "Surprises", href: "/earnings-surprises", badge: "PRO"
    },
    {
        icon: () => (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
        ), label: "Movers", href: "/post-earnings-movers", badge: "PRO"
    },
    {
        icon: () => (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
            </svg>
        ), label: "Guidance", href: "/guidance-tracker", badge: "PRO"
    },
    {
        icon: () => (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
        ), label: "Sentiment", href: "/earnings-sentiment"
    },
    { icon: Icons.API, label: "API Access", href: "/api-access", badge: "PRO" },
    { icon: Icons.Playground, label: "API Playground", href: "/api-playground" },
];

export function DashboardLayout({ children, title, subtitle, headerRight }: DashboardLayoutProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, isLoaded, isSignedIn } = useUser();
    const { signOut } = useClerk();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const { plan, isStarter } = useSubscription();

    // Search state
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<{ ticker: string; name: string; market: string }[]>([]);
    const [searchOpen, setSearchOpen] = useState(false);
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const searchRef = useRef<HTMLDivElement>(null);

    // Notifications state
    const [notifOpen, setNotifOpen] = useState(false);
    const [notifications, setNotifications] = useState<{ _id: string; type: string; title: string; message: string; read: boolean; createdAt: string; ticker?: string }[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const notifRef = useRef<HTMLDivElement>(null);

    // Onboarding state
    const [showOnboarding, setShowOnboarding] = useState(false);

    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            router.push("/sign-in");
        }
    }, [isLoaded, isSignedIn, router]);

    // Check first-time user — keyed per user so tutorial plays on first login
    useEffect(() => {
        if (isLoaded && isSignedIn && user?.id) {
            const completed = localStorage.getItem(`onboarding-completed-${user.id}`);
            if (!completed) {
                setShowOnboarding(true);
            }
        }
    }, [isLoaded, isSignedIn, user?.id]);

    // Fetch notifications
    const fetchNotifications = useCallback(async () => {
        try {
            const res = await fetch("/api/notifications");
            const data = await res.json();
            if (data.success) {
                setNotifications(data.notifications || []);
                setUnreadCount(data.unreadCount || 0);
            }
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        if (isLoaded && isSignedIn) {
            fetchNotifications();
            const interval = setInterval(fetchNotifications, 60000); // poll every 60s
            return () => clearInterval(interval);
        }
    }, [isLoaded, isSignedIn, fetchNotifications]);

    // Search handler (debounced)
    const handleSearch = useCallback((query: string) => {
        setSearchQuery(query);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        if (!query.trim()) {
            setSearchResults([]);
            setSearchOpen(false);
            return;
        }
        searchTimeout.current = setTimeout(async () => {
            try {
                const res = await fetch(`${config.apiUrl}/market/search?q=${encodeURIComponent(query)}&limit=8`);
                const data = await res.json();
                setSearchResults(data.results || []);
                setSearchOpen(true);
            } catch {
                setSearchResults([]);
            }
        }, 300);
    }, []);

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    // Mark all notifications as read
    const markAllRead = async () => {
        try {
            await fetch("/api/notifications", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "mark-all-read" }),
            });
            setNotifications(n => n.map(x => ({ ...x, read: true })));
            setUnreadCount(0);
        } catch { /* ignore */ }
    };

    const handleOnboardingComplete = () => {
        setShowOnboarding(false);
        if (user?.id) {
            localStorage.setItem(`onboarding-completed-${user.id}`, "true");
        }
    };

    const handleLogout = async () => {
        await signOut();
        router.push("/");
    };

    if (!isLoaded || !isSignedIn) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex items-center gap-3 text-primary">
                    <svg className="animate-spin h-8 w-8" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="font-mono text-lg">Initializing Terminal...</span>
                </div>
            </div>
        );
    }

    // Convert Clerk user to our expected format
    const displayUser = {
        name: user.fullName || "User",
        email: user.primaryEmailAddress?.emailAddress || ""
    };

    return (
        <div className="min-h-screen bg-background flex">
            {/* Sidebar */}
            <motion.aside
                initial={{ x: -280 }}
                animate={{ x: 0, width: sidebarCollapsed ? 72 : 256 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="fixed left-0 top-0 bottom-0 bg-surface border-r border-border z-40 flex flex-col"
            >
                {/* Logo */}
                <div className="h-16 px-4 flex items-center justify-between border-b border-border">
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <ErnsLogo size="sm" showText={!sidebarCollapsed} />
                    </Link>
                    <button
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        className="p-1.5 text-text-muted hover:text-text-main hover:bg-white/5 rounded-md transition-colors"
                    >
                        <svg className={`w-4 h-4 transition-transform ${sidebarCollapsed ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                        </svg>
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
                    {sidebarItems.map((item) => {
                        const href = (item as any).href;
                        const Icon = (item as any).icon;
                        const badge = (item as any).badge;
                        const isProItem = !!badge;
                        const isActive = pathname === href;
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${isActive
                                    ? isProItem
                                        ? "bg-white/10 text-cyan-400"
                                        : "bg-primary text-primary-foreground"
                                    : "text-text-muted hover:text-text-main hover:bg-white/5"
                                    }`}
                            >
                                {Icon && <Icon />}
                                <AnimatePresence>
                                    {!sidebarCollapsed && (
                                        <motion.span
                                            initial={{ opacity: 0, width: 0 }}
                                            animate={{ opacity: 1, width: "auto" }}
                                            exit={{ opacity: 0, width: 0 }}
                                            className="text-sm font-medium overflow-hidden whitespace-nowrap flex items-center gap-2"
                                        >
                                            {item.label}
                                            {badge && (
                                                <span className="text-[8px] font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded-full leading-none">
                                                    {badge}
                                                </span>
                                            )}
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </Link>
                        );
                    })}
                </nav>

                {/* Upgrade Banner for Starter */}
                {isStarter && !sidebarCollapsed && (
                    <UpgradeBanner compact />
                )}

                {/* User Profile Section - Bottom Left */}
                <div className="p-2 border-t border-border">
                    {/* User Profile Button */}
                    <div className="relative">
                        <button
                            onClick={() => setUserMenuOpen(!userMenuOpen)}
                            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-text-main hover:bg-white/5 transition-all"
                        >
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-semibold text-sm flex-shrink-0">
                                {displayUser.name.charAt(0).toUpperCase()}
                            </div>
                            <AnimatePresence>
                                {!sidebarCollapsed && (
                                    <motion.div
                                        initial={{ opacity: 0, width: 0 }}
                                        animate={{ opacity: 1, width: "auto" }}
                                        exit={{ opacity: 0, width: 0 }}
                                        className="flex-1 text-left overflow-hidden"
                                    >
                                        <p className="text-sm font-medium truncate">{displayUser.name}</p>
                                        <p className="text-xs text-text-muted truncate flex items-center gap-1">
                                            <span className={`inline-block w-1.5 h-1.5 rounded-full ${plan === 'pro' ? 'bg-primary' : plan === 'enterprise' ? 'bg-cyan-400' : 'bg-text-muted'}`} />
                                            {(plan || 'starter').charAt(0).toUpperCase() + (plan || 'starter').slice(1)}
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            {!sidebarCollapsed && (
                                <motion.div
                                    animate={{ rotate: userMenuOpen ? 180 : 0 }}
                                    className="text-text-muted"
                                >
                                    <Icons.ChevronUp />
                                </motion.div>
                            )}
                        </button>

                        {/* User Dropdown Menu */}
                        <AnimatePresence>
                            {userMenuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute bottom-full left-0 right-0 mb-2 bg-surface border border-border rounded-lg shadow-xl overflow-hidden"
                                >
                                    <Link
                                        href="/settings"
                                        onClick={() => setUserMenuOpen(false)}
                                        className="flex items-center gap-3 px-4 py-3 text-sm text-text-muted hover:text-text-main hover:bg-white/5 transition-all"
                                    >
                                        <Icons.Settings />
                                        <span>Settings</span>
                                    </Link>
                                    <button
                                        onClick={() => {
                                            setUserMenuOpen(false);
                                            handleLogout();
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-loss hover:bg-loss/10 transition-all border-t border-border"
                                    >
                                        <Icons.Logout />
                                        <span>Sign Out</span>
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.aside>

            {/* Main Content */}
            <main className="flex-1 transition-all duration-300" style={{ marginLeft: sidebarCollapsed ? 72 : 256 }}>
                {/* Top Bar */}
                <header className="h-16 border-b border-border bg-surface/50 backdrop-blur-sm sticky top-0 z-30 px-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <motion.h1
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-xl font-bold text-text-main"
                        >
                            {title}
                        </motion.h1>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Search Bar with Autocomplete */}
                        <div className="relative" ref={searchRef}>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                                placeholder="Search tickers..."
                                className="pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm text-text-main placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary w-48 lg:w-64 transition-all"
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
                                <Icons.Search />
                            </div>

                            {/* Search Results Dropdown */}
                            <AnimatePresence>
                                {searchOpen && searchResults.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -5 }}
                                        className="absolute top-full mt-2 left-0 right-0 bg-surface border border-border rounded-lg shadow-2xl overflow-hidden z-50 max-h-[320px] overflow-y-auto"
                                    >
                                        {searchResults.map((r, i) => (
                                            <button
                                                key={`${r.ticker}-${i}`}
                                                onClick={() => {
                                                    router.push(`/chart?ticker=${r.ticker}`);
                                                    setSearchQuery("");
                                                    setSearchOpen(false);
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left"
                                            >
                                                <span className="text-sm font-bold text-primary font-mono w-16 shrink-0">{r.ticker}</span>
                                                <span className="text-sm text-text-main truncate flex-1">{r.name}</span>
                                                <span className="text-[10px] text-text-muted">{r.market}</span>
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        <kbd className="hidden lg:inline-flex items-center gap-1 px-2 py-1 text-xs text-text-muted bg-background border border-border rounded">
                            <span>⌘</span><span>K</span>
                        </kbd>

                        {/* Notifications Bell */}
                        <div className="relative" ref={notifRef}>
                            <button
                                onClick={() => setNotifOpen(!notifOpen)}
                                className="relative p-2 text-text-muted hover:text-text-main hover:bg-white/5 rounded-lg transition-colors"
                            >
                                <Icons.Bell />
                                {unreadCount > 0 && (
                                    <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 bg-primary rounded-full flex items-center justify-center text-[9px] font-bold text-primary-foreground px-1">
                                        {unreadCount > 9 ? "9+" : unreadCount}
                                    </span>
                                )}
                            </button>

                            {/* Notification Dropdown */}
                            <AnimatePresence>
                                {notifOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -5 }}
                                        className="absolute top-full mt-2 right-0 w-80 bg-surface border border-border rounded-xl shadow-2xl overflow-hidden z-50"
                                    >
                                        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                                            <h3 className="text-sm font-semibold text-text-main">Notifications</h3>
                                            {unreadCount > 0 && (
                                                <button
                                                    onClick={markAllRead}
                                                    className="text-xs text-primary hover:text-primary/80 font-medium"
                                                >
                                                    Mark all read
                                                </button>
                                            )}
                                        </div>
                                        <div className="max-h-[320px] overflow-y-auto divide-y divide-border/50">
                                            {notifications.length === 0 ? (
                                                <div className="px-4 py-8 text-center">
                                                    <Icons.Bell />
                                                    <p className="text-xs text-text-muted mt-2">No notifications yet</p>
                                                </div>
                                            ) : (
                                                notifications.slice(0, 10).map((n) => (
                                                    <div
                                                        key={n._id}
                                                        className={`px-4 py-3 transition-colors ${!n.read ? "bg-primary/5" : ""}`}
                                                    >
                                                        <div className="flex items-start gap-2">
                                                            <span className="text-xs mt-0.5">
                                                                {n.type === "earnings" ? "📊" : n.type === "signal" ? "⚡" : n.type === "watchlist" ? "👁" : "🔔"}
                                                            </span>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs font-medium text-text-main truncate">{n.title}</p>
                                                                <p className="text-xs text-text-muted truncate">{n.message}</p>
                                                                <p className="text-[10px] text-text-muted mt-1">
                                                                    {new Date(n.createdAt).toLocaleDateString()} · {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                                </p>
                                                            </div>
                                                            {!n.read && <span className="w-2 h-2 bg-primary rounded-full mt-1.5 shrink-0" />}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="p-6">
                    {subtitle && (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-text-muted mb-6"
                        >
                            {subtitle}
                        </motion.p>
                    )}
                    {children}
                </div>
            </main>

            {/* Erns AI Chat Widget */}
            <ErnsChat />

            {/* Onboarding Modal — First time only */}
            {showOnboarding && <OnboardingModal onComplete={handleOnboardingComplete} />}
        </div>
    );
}
