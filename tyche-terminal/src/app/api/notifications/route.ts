import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import Notification from "@/models/Notification";
import { sendEmail } from "@/lib/email";

// GET /api/notifications — Fetch user's notifications
export async function GET() {
    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectToDatabase();
        const notifications = await Notification.find({ userId: user.id })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

        const unreadCount = await Notification.countDocuments({
            userId: user.id,
            read: false,
        });

        return NextResponse.json({
            success: true,
            notifications,
            unreadCount,
        });
    } catch (error) {
        console.error("Failed to fetch notifications:", error);
        return NextResponse.json(
            { error: "Failed to fetch notifications" },
            { status: 500 }
        );
    }
}

// POST /api/notifications — Create a notification or mark as read
export async function POST(req: NextRequest) {
    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        await connectToDatabase();

        // Mark as read
        if (body.action === "mark-read" && body.id) {
            await Notification.findOneAndUpdate(
                { _id: body.id, userId: user.id },
                { read: true }
            );
            return NextResponse.json({ success: true });
        }

        // Mark all as read
        if (body.action === "mark-all-read") {
            await Notification.updateMany(
                { userId: user.id, read: false },
                { read: true }
            );
            return NextResponse.json({ success: true });
        }

        // Create notification (for internal use / testing)
        if (body.title && body.message) {
            const notif = await Notification.create({
                userId: user.id,
                type: body.type || "system",
                title: body.title,
                message: body.message,
                ticker: body.ticker,
            });

            // Fire-and-forget email to user's primary email
            const userEmail = user.emailAddresses?.[0]?.emailAddress;
            if (userEmail) {
                sendEmail(
                    userEmail,
                    `${body.ticker ? `[${body.ticker}] ` : ""}${body.title}`,
                    `<div style="font-family:sans-serif;color:#e4e4e7;background:#0a0a0f;padding:32px;border-radius:12px;">
                        ${body.ticker ? `<div style="display:inline-block;padding:4px 12px;background:rgba(0,230,118,0.1);border:1px solid rgba(0,230,118,0.2);border-radius:8px;font-size:13px;font-weight:700;color:#00e676;font-family:monospace;margin-bottom:16px;">${body.ticker}</div>` : ""}
                        <h2 style="margin:0 0 8px;font-size:16px;color:#e4e4e7;">${body.title}</h2>
                        <p style="margin:0;font-size:14px;color:#71717a;line-height:1.5;">${body.message}</p>
                        <hr style="border:none;border-top:1px solid #27272a;margin:20px 0;">
                        <p style="margin:0;font-size:11px;color:#3f3f46;">Erns — tychefinancials.com</p>
                    </div>`
                ).catch(() => { /* email is non-critical */ });
            }

            return NextResponse.json({ success: true, notification: notif }, { status: 201 });
        }

        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    } catch (error) {
        console.error("Failed to process notification:", error);
        return NextResponse.json(
            { error: "Failed to process notification" },
            { status: 500 }
        );
    }
}
