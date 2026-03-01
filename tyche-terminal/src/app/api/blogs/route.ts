import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import Blog from "@/models/Blog";

// GET /api/blogs - List all published blogs
export async function GET() {
    try {
        await connectToDatabase();
        const blogs = await Blog.find({ published: true })
            .sort({ publishedAt: -1 })
            .limit(50)
            .lean();
        return NextResponse.json({ success: true, blogs });
    } catch (error) {
        console.error("Failed to fetch blogs:", error);
        return NextResponse.json({ error: "Failed to fetch blogs" }, { status: 500 });
    }
}

// POST /api/blogs - Create a new blog post
export async function POST(req: NextRequest) {
    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { title, content, excerpt, tags, published } = body;

        if (!title || !content) {
            return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
        }

        await connectToDatabase();
        const blog = await Blog.create({
            title,
            content,
            excerpt: excerpt || content.substring(0, 200) + "...",
            author: {
                id: user.id,
                name: user.fullName || "Author",
                email: user.primaryEmailAddress?.emailAddress || "",
            },
            tags: tags || [],
            published: published ?? true,
            publishedAt: published !== false ? new Date() : null,
        });

        return NextResponse.json({ success: true, blog }, { status: 201 });
    } catch (error) {
        console.error("Failed to create blog:", error);
        return NextResponse.json({ error: "Failed to create blog" }, { status: 500 });
    }
}
