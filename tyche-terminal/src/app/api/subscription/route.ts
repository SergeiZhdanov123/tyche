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
            // Auto-create with starter plan so returning users never get stuck
            user = await User.create({
                email,
                name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || email.split("@")[0],
                plan: "starter",
                subscriptionStatus: "active",
                subscriptionStartedAt: new Date(),
            });
        }

        return NextResponse.json({
            success: true,
            plan: user.plan || "starter",
            subscriptionStatus: user.subscriptionStatus || "active",
            subscriptionStartedAt: user.subscriptionStartedAt,
            hasSelectedPlan: true,
        });
    } catch (error) {
        console.error("Subscription status error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
