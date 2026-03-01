import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/user";
import { currentUser } from "@clerk/nextjs/server";

export async function GET(request: NextRequest) {
    try {
        const clerkUser = await currentUser();

        if (!clerkUser) {
            return NextResponse.json(
                { error: "Not authenticated" },
                { status: 401 }
            );
        }

        const email = clerkUser.primaryEmailAddress?.emailAddress;

        if (!email) {
            return NextResponse.json(
                { error: "No email address found" },
                { status: 400 }
            );
        }

        await connectToDatabase();

        let user = await User.findOne({ email });

        if (!user) {
            user = await User.create({
                email,
                name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || email.split("@")[0],
                plan: "starter",
                subscriptionStatus: "active",
                subscriptionStartedAt: new Date(),
            });
        }

        const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
        const userEmail = user.email?.toLowerCase();
        const admin = userEmail ? ADMIN_EMAILS.includes(userEmail) : false;

        return NextResponse.json({
            success: true,
            user: {
                id: clerkUser.id,  // Clerk userId — matches blog.author.id
                mongoId: user._id.toString(),
                email: user.email,
                name: user.name,
                plan: user.plan,
                subscriptionStatus: user.subscriptionStatus,
                subscriptionStartedAt: user.subscriptionStartedAt,
                isAdmin: admin,
            },
            requiresPlanSelection: !user.plan,
        });
    } catch (error) {
        console.error("Auth check error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

