"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useState } from "react";
import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

import { ErnsLogo } from "@/components/erns-logo";

const navLinks = [
    { href: "/features", label: "Features" },
    { href: "/api-overview", label: "API" },
    { href: "/pricing", label: "Pricing" },
];

export function Navbar() {
    const [hoveredLink, setHoveredLink] = useState<string | null>(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Blur on scroll
    const { scrollY } = useScroll();
    const backdropBlur = useTransform(scrollY, [0, 100], ["blur(0px)", "blur(12px)"]);
    const backgroundColor = useTransform(
        scrollY,
        [0, 100],
        ["rgba(2, 2, 2, 0.5)", "rgba(2, 2, 2, 0.85)"]
    );

    return (
        <motion.header
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{ backdropFilter: backdropBlur, backgroundColor }}
            className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-white/10"
        >
            <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
                {/* Logo */}
                <Link href="/" className="group flex items-center gap-2">
                    <ErnsLogo size="md" />
                </Link>

                {/* Navigation Links - Desktop */}
                <nav className="hidden md:flex items-center gap-1">
                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            onMouseEnter={() => setHoveredLink(link.href)}
                            onMouseLeave={() => setHoveredLink(null)}
                            className="relative px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:text-text-main"
                        >
                            {hoveredLink === link.href && (
                                <motion.span
                                    layoutId="navbar-hover"
                                    className="absolute inset-0 rounded-md bg-white/5"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                />
                            )}
                            <span className="relative z-10">{link.label}</span>
                        </Link>
                    ))}
                </nav>

                {/* Auth Buttons */}
                <div className="flex items-center gap-3">
                    <SignedOut>
                        <SignInButton mode="modal" forceRedirectUrl="/dashboard">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="hidden md:block px-4 py-2 text-sm font-medium text-text-muted hover:text-text-main transition-colors"
                            >
                                Sign In
                            </motion.button>
                        </SignInButton>

                        <SignUpButton mode="modal" forceRedirectUrl="/select-plan">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="group relative overflow-hidden rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,230,118,0.3)]"
                            >
                                <span className="relative z-10">Get Started</span>
                            </motion.button>
                        </SignUpButton>
                    </SignedOut>

                    <SignedIn>
                        <Link href="/dashboard">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="hidden md:block px-4 py-2 text-sm font-medium text-text-muted hover:text-text-main transition-colors mr-2"
                            >
                                Dashboard
                            </motion.button>
                        </Link>
                        <UserButton afterSignOutUrl="/" />
                    </SignedIn>

                    {/* Mobile menu button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden p-2 text-text-muted hover:text-text-main transition-colors"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-6 h-6"
                        >
                            {mobileMenuOpen ? (
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            ) : (
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                                />
                            )}
                        </svg>
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="md:hidden absolute top-16 left-0 right-0 bg-surface/95 backdrop-blur-md border-b border-border"
                >
                    <nav className="flex flex-col p-4 gap-2">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setMobileMenuOpen(false)}
                                className="px-4 py-3 text-sm font-medium text-text-muted hover:text-text-main hover:bg-white/5 rounded-md transition-colors"
                            >
                                {link.label}
                            </Link>
                        ))}
                        <div className="pt-2 border-t border-border mt-2 space-y-2">
                            <SignedOut>
                                <div onClick={() => setMobileMenuOpen(false)}>
                                    <SignInButton mode="modal">
                                        <button className="block w-full px-4 py-3 text-sm font-medium text-text-muted hover:text-text-main hover:bg-white/5 rounded-md transition-colors text-left">
                                            Sign In
                                        </button>
                                    </SignInButton>
                                </div>
                                <div onClick={() => setMobileMenuOpen(false)}>
                                    <SignUpButton mode="modal">
                                        <button className="block w-full px-4 py-3 text-sm font-medium text-center text-primary-foreground bg-primary rounded-md transition-colors">
                                            Get Started Free
                                        </button>
                                    </SignUpButton>
                                </div>
                            </SignedOut>
                            <SignedIn>
                                <Link
                                    href="/dashboard"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="block w-full px-4 py-3 text-sm font-medium text-center text-primary-foreground bg-primary rounded-md transition-colors"
                                >
                                    Dashboard
                                </Link>
                            </SignedIn>
                        </div>
                    </nav>
                </motion.div>
            )}
        </motion.header>
    );
}
