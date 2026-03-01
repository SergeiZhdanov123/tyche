import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/user";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
    apiVersion: "2025-01-27.acacia" as any,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
    try {
        const body = await req.text();
        const signature = req.headers.get("stripe-signature");

        let event: Stripe.Event;

        // If webhook secret is set, verify signature; otherwise trust the event (dev mode)
        if (webhookSecret) {
            if (!signature) {
                return NextResponse.json({ error: "Missing signature" }, { status: 400 });
            }
            try {
                event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
            } catch (err: any) {
                console.error(`Webhook signature verification failed: ${err.message}`);
                return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
            }
        } else {
            // Dev mode — no signature check, parse event directly
            event = JSON.parse(body) as Stripe.Event;
            console.warn("[Stripe Webhook] No webhook secret set — accepting event without verification (dev mode)");
        }

        await connectToDatabase();
        console.log(`[Stripe Webhook] Received: ${event.type}`);

        switch (event.type) {
            // ─── Checkout completed ───────────────────────────────
            case "checkout.session.completed": {
                const session = event.data.object as Stripe.Checkout.Session;
                const { plan, userId } = session.metadata || {};
                const customerEmail = session.customer_details?.email || session.customer_email;
                const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
                const subscriptionId = typeof session.subscription === "string" ? session.subscription : (session.subscription as any)?.id;

                // Find user by metadata userId, or by email
                let user = userId ? await User.findById(userId) : null;
                if (!user && customerEmail) {
                    user = await User.findOne({ email: customerEmail });
                }

                if (user) {
                    if (plan) user.plan = plan as any;
                    user.subscriptionStatus = "active";
                    if (customerId) user.stripeCustomerId = customerId;
                    if (subscriptionId) user.stripeSubscriptionId = subscriptionId;
                    await user.save();
                    console.log(`[Stripe Webhook] ✅ User ${user.email} → plan=${plan}, status=active`);
                } else {
                    console.error(`[Stripe Webhook] User not found for checkout session`);
                }
                break;
            }

            // ─── Subscription updated (plan change, trial end, etc.) ──
            case "customer.subscription.updated": {
                const subscription = event.data.object as Stripe.Subscription;
                const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
                const { plan, userId } = subscription.metadata || {};

                let user = userId ? await User.findById(userId) : null;
                if (!user && customerId) {
                    user = await User.findOne({ stripeCustomerId: customerId });
                }

                if (user) {
                    // Sync subscription status
                    user.stripeSubscriptionId = subscription.id;
                    user.subscriptionStatus = subscription.status === "active" ? "active"
                        : subscription.status === "trialing" ? "trialing"
                            : subscription.status === "past_due" ? "past_due"
                                : subscription.status === "canceled" ? "canceled"
                                    : "active";

                    // If plan is in metadata, update it
                    if (plan) {
                        user.plan = plan as any;
                    } else {
                        // Try to determine plan from price amount
                        const priceAmount = subscription.items?.data?.[0]?.price?.unit_amount;
                        if (priceAmount === 4900) user.plan = "pro";
                        else if (priceAmount === 29900) user.plan = "enterprise";
                    }

                    await user.save();
                    console.log(`[Stripe Webhook] ✅ Subscription updated: ${user.email} → status=${user.subscriptionStatus}, plan=${user.plan}`);
                }
                break;
            }

            // ─── Subscription deleted (canceled at end of period) ─────
            case "customer.subscription.deleted": {
                const subscription = event.data.object as Stripe.Subscription;
                const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
                const { userId } = subscription.metadata || {};

                let user = userId ? await User.findById(userId) : null;
                if (!user && customerId) {
                    user = await User.findOne({ stripeCustomerId: customerId });
                }

                if (user) {
                    user.plan = "starter";
                    user.subscriptionStatus = "canceled";
                    user.stripeSubscriptionId = undefined as any;
                    await user.save();
                    console.log(`[Stripe Webhook] ⚠️ Subscription canceled: ${user.email} → downgraded to starter`);
                }
                break;
            }

            // ─── Payment failed ──────────────────────────────────
            case "invoice.payment_failed": {
                const invoice = event.data.object as Stripe.Invoice;
                const customerId = typeof invoice.customer === "string" ? invoice.customer : (invoice.customer as any)?.id;

                if (customerId) {
                    const user = await User.findOne({ stripeCustomerId: customerId });
                    if (user) {
                        user.subscriptionStatus = "past_due";
                        await user.save();
                        console.log(`[Stripe Webhook] ⚠️ Payment failed: ${user.email} → past_due`);
                    }
                }
                break;
            }

            // ─── Payment succeeded (recovers from past_due) ──────
            case "invoice.payment_succeeded": {
                const invoice = event.data.object as Stripe.Invoice;
                const customerId = typeof invoice.customer === "string" ? invoice.customer : (invoice.customer as any)?.id;

                if (customerId) {
                    const user = await User.findOne({ stripeCustomerId: customerId });
                    if (user && user.subscriptionStatus === "past_due") {
                        user.subscriptionStatus = "active";
                        await user.save();
                        console.log(`[Stripe Webhook] ✅ Payment recovered: ${user.email} → active`);
                    }
                }
                break;
            }

            default:
                console.log(`[Stripe Webhook] Unhandled event: ${event.type}`);
        }

        return NextResponse.json({ received: true });
    } catch (err) {
        console.error("Webhook processing error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
