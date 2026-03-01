import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
    return (
        <main className="min-h-screen bg-background flex items-center justify-center p-6">
            <SignIn fallbackRedirectUrl="/dashboard" signUpUrl="/sign-up" />
        </main>
    );
}
