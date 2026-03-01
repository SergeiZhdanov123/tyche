/**
 * Centralized app configuration.
 * Reads NEXT_PUBLIC_PRODUCTION from env to switch between dev and production URLs.
 *
 * Usage:
 *   import { config } from "@/lib/config";
 *   fetch(`${config.apiUrl}/market/quote/AAPL`)
 */

const isProduction = process.env.NEXT_PUBLIC_PRODUCTION === "true";

export const config = {
    /** Whether the app is running in production mode */
    isProduction,

    /** Frontend app URL */
    appUrl: isProduction
        ? "https://tychefinancials.com"
        : (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),

    /** Backend API URL */
    apiUrl: isProduction
        ? "https://api.tychefinancials.com"
        : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"),

    /** Stripe publishable key */
    stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
} as const;
