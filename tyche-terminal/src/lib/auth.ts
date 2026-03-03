import jwt from "jsonwebtoken";
import { jwtVerify } from "jose";

// Legacy JWT auth — Clerk now handles authentication.
// JWT_SECRET is only needed if the old /api/auth/login or /signup routes are used.
const JWT_SECRET = process.env.JWT_SECRET || "unused-clerk-handles-auth";

export interface JWTPayload {
    userId: string;
    email: string;
    name: string;
}

// Sign JWT token (for API routes - Node.js runtime)
export function signToken(payload: JWTPayload): string {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: "7d",
    });
}

// Verify JWT token (for API routes - Node.js runtime)
export function verifyToken(token: string): JWTPayload | null {
    try {
        return jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch {
        return null;
    }
}

// Verify JWT token (for middleware - Edge runtime)
export async function verifyTokenEdge(token: string): Promise<JWTPayload | null> {
    try {
        const secret = new TextEncoder().encode(JWT_SECRET);
        const { payload } = await jwtVerify(token, secret);
        return payload as unknown as JWTPayload;
    } catch {
        return null;
    }
}

// Cookie name for auth token
export const AUTH_COOKIE_NAME = "erns_auth_token";

// Cookie options
export const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
};
