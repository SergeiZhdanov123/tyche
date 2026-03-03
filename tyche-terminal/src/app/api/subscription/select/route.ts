import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/user";
import { currentUser } from "@clerk/nextjs/server";
import { sendEmail, welcomeEmailHtml } from "@/lib/email";
import Stripe from "stripe";
import { config } from "@/lib/config";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
    apiVersion: "2025-01-27.acacia" as any,
});

async function getOrCreateStripeCustomer(email: string, name: string, userId: string) {
    // Check if user already has a Stripe customer
    await connectToDatabase();
    const user = await User.findById(userId);
    if (user?.stripeCustomerId) {
        return user.stripeCustomerId;
    }

    // Search for existing Stripe customer by email
    const existingCustomers = await stripe.customers.list({ email, limit: 1 });
    if (existingCustomers.data.length > 0) {
        const customerId = existingCustomers.data[0].id;
        if (user) {
            user.stripeCustomerId = customerId;
            await user.save();
        }
        return customerId;
    }

    // Create new Stripe customer
    const customer = await stripe.customers.create({
        email,
        name,
        metadata: { userId },
    });

    if (user) {
        user.stripeCustomerId = customer.id;
        await user.save();
    }

    return customer.id;
}

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

        const body = await request.json();
        const { plan } = body;

        if (!plan || !["starter", "pro", "enterprise"].includes(plan)) {
            return NextResponse.json(
                { error: "Invalid plan. Must be starter, pro, or enterprise." },
                { status: 400 }
            );
        }

        await connectToDatabase();
        let user = await User.findOne({ email });

        if (!user) {
            user = await User.create({
                email,
                name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || email.split("@")[0],
            });
        }

        const userName = `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || user.name || email;

        // For Starter plan — just save and redirect
        if (plan === "starter") {
            user.plan = plan;
            user.subscriptionStatus = "active";
            user.subscriptionStartedAt = new Date();
            await user.save();

            // Send welcome email only once (fire-and-forget)
            if (!user.welcomeEmailSent) {
                const firstName = clerkUser.firstName || user.name?.split(" ")[0] || "there";
                user.welcomeEmailSent = true;
                await user.save();
                sendEmail(email, `Welcome to Erns, ${firstName}! 🚀`, welcomeEmailHtml(firstName, plan))
                    .catch(err => console.error("[Welcome Email] Error:", err));
            }

            return NextResponse.json({
                success: true,
                plan,
                message: "Welcome to Erns! You're on the Starter plan.",
            });
        }

        // For paid plans — create Stripe Checkout Session
        const stripeKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeKey) {
            return NextResponse.json(
                { error: "Stripe is not configured" },
                { status: 500 }
            );
        }

        // Get or create Stripe customer
        const customerId = await getOrCreateStripeCustomer(email, userName, user._id.toString());

        const isPro = plan === "pro";
        const unitAmount = isPro ? 4900 : 29900; // $49 or $299
        const productName = isPro ? "Erns Pro" : "Erns Enterprise";
        const productDescription = isPro
            ? "Unlimited API access, Real-time signals, Advanced screener, AI-powered insights"
            : "Everything in Pro + Unlimited API calls, Custom signal models, Dedicated support, SLA";

        const checkoutSession = await stripe.checkout.sessions.create({
            mode: "subscription",
            payment_method_types: ["card"],
            customer: customerId,
            client_reference_id: user._id.toString(),
            metadata: {
                userId: user._id.toString(),
                plan,
            },
            subscription_data: {
                metadata: {
                    userId: user._id.toString(),
                    plan,
                },
                trial_period_days: 14,
            },
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        recurring: { interval: "month" },
                        product_data: {
                            name: productName,
                            description: productDescription,
                        },
                        unit_amount: unitAmount,
                    },
                    quantity: 1,
                },
            ],
            success_url: `${config.appUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
            cancel_url: `${config.appUrl}/select-plan`,
            allow_promotion_codes: true,
        });

        // Update user plan optimistically (webhook will confirm)
        user.plan = plan;
        user.subscriptionStatus = "trialing";
        user.subscriptionStartedAt = new Date();
        await user.save();

        return NextResponse.json({
            success: true,
            url: checkoutSession.url,
        });
    } catch (error) {
        console.error("Plan selection error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}
