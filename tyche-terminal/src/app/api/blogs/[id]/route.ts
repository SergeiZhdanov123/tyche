import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import Blog from "@/models/Blog";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);

async function isAdmin(): Promise<boolean> {
    const user = await currentUser();
    if (!user) return false;
    const email = user.primaryEmailAddress?.emailAddress?.toLowerCase();
    return email ? ADMIN_EMAILS.includes(email) : false;
}

// GET /api/blogs/[id] - Get a single blog
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await connectToDatabase();
        const blog = await Blog.findById(id).lean();
        if (!blog) {
            return NextResponse.json({ error: "Blog not found" }, { status: 404 });
        }
        return NextResponse.json({ success: true, blog });
    } catch (error) {
        console.error("Failed to fetch blog:", error);
        return NextResponse.json({ error: "Failed to fetch blog" }, { status: 500 });
    }
}

// PUT /api/blogs/[id] - Update a blog
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();
        await connectToDatabase();

        const blog = await Blog.findById(id);
        if (!blog) {
            return NextResponse.json({ error: "Blog not found" }, { status: 404 });
        }

        const admin = await isAdmin();
        if (blog.author.id !== userId && !admin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const updates: Record<string, unknown> = {};
        if (body.title !== undefined) updates.title = body.title;
        if (body.content !== undefined) updates.content = body.content;
        if (body.excerpt !== undefined) updates.excerpt = body.excerpt;
        if (body.tags !== undefined) updates.tags = body.tags;
        if (body.published !== undefined) {
            updates.published = body.published;
            if (body.published && !blog.publishedAt) {
                updates.publishedAt = new Date();
            }
        }

        const updated = await Blog.findByIdAndUpdate(id, updates, { new: true }).lean();
        return NextResponse.json({ success: true, blog: updated });
    } catch (error) {
        console.error("Failed to update blog:", error);
        return NextResponse.json({ error: "Failed to update blog" }, { status: 500 });
    }
}

// DELETE /api/blogs/[id] - Delete a blog (owner or admin)
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        await connectToDatabase();

        const blog = await Blog.findById(id);
        if (!blog) {
            return NextResponse.json({ error: "Blog not found" }, { status: 404 });
        }

        const admin = await isAdmin();
        if (blog.author.id !== userId && !admin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await Blog.findByIdAndDelete(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete blog:", error);
        return NextResponse.json({ error: "Failed to delete blog" }, { status: 500 });
    }
}

