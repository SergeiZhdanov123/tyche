import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import Notification from "@/models/Notification";

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
