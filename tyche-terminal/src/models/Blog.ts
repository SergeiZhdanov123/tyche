import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBlog extends Document {
    title: string;
    content: string;
    excerpt: string;
    author: {
        id: string;
        name: string;
        email: string;
    };
    tags: string[];
    published: boolean;
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

const blogSchema = new Schema<IBlog>(
    {
        title: {
            type: String,
            required: [true, "Title is required"],
            trim: true,
            maxlength: 200,
        },
        content: {
            type: String,
            required: [true, "Content is required"],
        },
        excerpt: {
            type: String,
            default: "",
            maxlength: 500,
        },
        author: {
            id: { type: String, required: true },
            name: { type: String, required: true },
            email: { type: String, required: true },
        },
        tags: {
            type: [String],
            default: [],
        },
        published: {
            type: Boolean,
            default: false,
        },
        publishedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// Force model recreation in dev
if (mongoose.models.Blog) {
    delete mongoose.models.Blog;
}

const Blog: Model<IBlog> = mongoose.model<IBlog>("Blog", blogSchema);

export default Blog;
