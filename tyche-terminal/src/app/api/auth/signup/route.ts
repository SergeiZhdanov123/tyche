import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/user";
import { signToken, AUTH_COOKIE_NAME, COOKIE_OPTIONS } from "@/lib/auth";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, password, name } = body;

        // Validate input
        if (!email || !password || !name) {
            return NextResponse.json(
                { error: "Email, password, and name are required" },
                { status: 400 }
            );
        }

        if (password.length < 8) {
            return NextResponse.json(
                { error: "Password must be at least 8 characters" },
                { status: 400 }
            );
        }

        // Connect to database
        await connectToDatabase();

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return NextResponse.json(
                { error: "Email already registered" },
                { status: 409 }
            );
        }

        // Create new user
        const user = await User.create({
            email: email.toLowerCase(),
            password,
            name,
        });

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
                    plan: null,  // New users need to select a plan
                },
                requiresPlanSelection: true,  // Redirect to plan selection
            },
            { status: 201 }
        );

        // Set auth cookie
        response.cookies.set(AUTH_COOKIE_NAME, token, COOKIE_OPTIONS);

        return response;
    } catch (error) {
        console.error("Signup error:", error);

        // Handle mongoose validation errors
        if (error instanceof Error && error.name === "ValidationError") {
            return NextResponse.json(
                { error: error.message },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
