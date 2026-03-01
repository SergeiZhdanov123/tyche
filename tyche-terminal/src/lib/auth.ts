import jwt from "jsonwebtoken";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET!;

if (!JWT_SECRET) {
    throw new Error("Please define the JWT_SECRET environment variable");
}

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
export const AUTH_COOKIE_NAME = "tyche_auth_token";

// Cookie options
export const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
};
