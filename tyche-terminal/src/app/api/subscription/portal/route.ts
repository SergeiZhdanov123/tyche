import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/user";
import { currentUser } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { config } from "@/lib/config";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
    apiVersion: "2025-01-27.acacia" as any,
});

export async function POST(request: NextRequest) {
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
        const user = await User.findOne({ email });

        if (!user) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        if (!user.stripeCustomerId) {
            return NextResponse.json(
                { error: "No billing account found. Please subscribe to a plan first." },
                { status: 400 }
            );
        }

        // Create Stripe Billing Portal session
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: user.stripeCustomerId,
            return_url: `${config.appUrl}/settings`,
        });

        return NextResponse.json({
            success: true,
            url: portalSession.url,
        });
    } catch (error) {
        console.error("Billing portal error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}
