import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/user";
import { sendEmail, promoEmailHtml } from "@/lib/email";

/**
 * Daily promo email cron job for Starter plan users.
 * Rotates through 4 email versions based on the day of the year.
 * 
 * Trigger this endpoint daily via:
 * - Vercel Cron: Add to vercel.json
 * - External cron service (e.g. cron-job.org)
 * - Local: curl http://localhost:3000/api/cron/daily-promo
 * 
 * Security: Requires CRON_SECRET header in production.
 */
export async function GET(request: NextRequest) {
    // Optional security: verify cron secret in production
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
        const authHeader = request.headers.get("authorization");
        if (authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
    }

    try {
        await connectToDatabase();

        // Find all active starter plan users
        const starterUsers = await User.find({
            plan: "starter",
            subscriptionStatus: "active",
        }).select("email name").lean();

        if (!starterUsers || starterUsers.length === 0) {
            return NextResponse.json({
                success: true,
                message: "No starter plan users found",
                sent: 0,
            });
        }

        // Determine which email version to send (rotates by day of year)
        const dayOfYear = Math.floor(
            (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
        );
        const version = dayOfYear % 4;

        let sent = 0;
        const errors: string[] = [];

        for (const user of starterUsers) {
            try {
                const firstName = (user.name || "").split(" ")[0] || "there";
                const { subject, html } = promoEmailHtml(version, firstName);
                await sendEmail(user.email, subject, html);
                sent++;
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (err) {
                errors.push(`${user.email}: ${err instanceof Error ? err.message : "unknown"}`);
            }
        }

        console.log(`[Daily Promo] Sent ${sent}/${starterUsers.length} emails (version ${version})`);

        return NextResponse.json({
            success: true,
            total: starterUsers.length,
            sent,
            version,
            errors: errors.length > 0 ? errors : undefined,
        });
    } catch (error) {
        console.error("[Daily Promo] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}
