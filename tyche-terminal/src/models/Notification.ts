import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
    userId: string;
    type: "earnings" | "signal" | "system" | "watchlist";
    title: string;
    message: string;
    ticker?: string;
    read: boolean;
    createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
    {
        userId: { type: String, required: true, index: true },
        type: {
            type: String,
            enum: ["earnings", "signal", "system", "watchlist"],
            default: "system",
        },
        title: { type: String, required: true },
        message: { type: String, required: true },
        ticker: { type: String },
        read: { type: Boolean, default: false },
    },
    { timestamps: true }
);

// Index for efficient queries
NotificationSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.Notification ||
    mongoose.model<INotification>("Notification", NotificationSchema);
