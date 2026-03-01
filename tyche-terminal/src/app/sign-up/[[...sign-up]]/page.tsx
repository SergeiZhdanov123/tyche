import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
    return (
        <main className="min-h-screen bg-background flex items-center justify-center p-6">
            <SignUp forceRedirectUrl="/select-plan" signInUrl="/sign-in" />
        </main>
    );
}
