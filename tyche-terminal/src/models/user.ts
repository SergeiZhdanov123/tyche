import mongoose, { Schema, Document, Model } from "mongoose";
import bcrypt from "bcryptjs";

export type SubscriptionPlan = "starter" | "pro" | "enterprise" | null;
export type SubscriptionStatus = "active" | "trialing" | "canceled" | "past_due" | null;

export interface IUser extends Document {
    _id: mongoose.Types.ObjectId;
    email: string;
    password: string;
    name: string;
    // Subscription fields
    plan: SubscriptionPlan;
    subscriptionStatus: SubscriptionStatus;
    subscriptionStartedAt: Date | null;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    welcomeEmailSent: boolean;
    // Timestamps
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
    {
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
        },
        password: {
            type: String,
            select: false,
        },
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
            maxlength: [100, "Name cannot exceed 100 characters"],
        },
        // Subscription fields
        plan: {
            type: String,
            enum: ["starter", "pro", "enterprise"],
            default: undefined,  // undefined means plan selection required
        },
        subscriptionStatus: {
            type: String,
            enum: ["active", "trialing", "canceled", "past_due"],
            default: undefined,
        },
        subscriptionStartedAt: {
            type: Date,
            default: undefined,
        },
        stripeCustomerId: {
            type: String,
            default: undefined,
        },
        stripeSubscriptionId: {
            type: String,
            default: undefined,
        },
        welcomeEmailSent: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// Hash password before saving (Mongoose 8+ async hook)
userSchema.pre("save", async function () {
    if (!this.isModified("password") || !this.password) {
        return;
    }

    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.comparePassword = async function (
    candidatePassword: string
): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
};

// Force fresh model in development to pick up schema changes
if (mongoose.models.User) {
    delete mongoose.models.User;
}
const User: Model<IUser> = mongoose.model<IUser>("User", userSchema);

export default User;
