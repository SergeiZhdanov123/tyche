import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/user";
import { signToken, AUTH_COOKIE_NAME, COOKIE_OPTIONS } from "@/lib/auth";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, password } = body;

        // Validate input
        if (!email || !password) {
            return NextResponse.json(
                { error: "Email and password are required" },
                { status: 400 }
            );
        }

        // Connect to database
        await connectToDatabase();

        // Find user and include password field
        const user = await User.findOne({ email: email.toLowerCase() }).select(
            "+password"
        );

        if (!user) {
            return NextResponse.json(
                { error: "Invalid email or password" },
                { status: 401 }
            );
        }

        // Compare password
        const isPasswordValid = await user.comparePassword(password);

        if (!isPasswordValid) {
            return NextResponse.json(
                { error: "Invalid email or password" },
                { status: 401 }
            );
        }

        // Generate JWT token
        const token = signToken({
            userId: user._id.toString(),
            email: user.email,
            name: user.name,
        });

        // Create response with cookie
        const response = NextResponse.json(
            {
                success: true,
                user: {
                    id: user._id.toString(),
                    email: user.email,
                    name: user.name,
                    plan: user.plan || null,
                },
                requiresPlanSelection: !user.plan,
            },
            { status: 200 }
        );

        // Set auth cookie
        response.cookies.set(AUTH_COOKIE_NAME, token, COOKIE_OPTIONS);

        return response;
    } catch (error) {
        console.error("Login error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
