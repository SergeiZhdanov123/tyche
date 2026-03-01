"use client";

interface ClerkThemeProviderProps {
    children: React.ReactNode;
}

// Simple passthrough provider - Clerk has been replaced with custom MongoDB auth
export function ClerkThemeProvider({ children }: ClerkThemeProviderProps) {
    return <>{children}</>;
}

// This is no longer used - kept for backwards compatibility
export const clerkEnabled = false;
