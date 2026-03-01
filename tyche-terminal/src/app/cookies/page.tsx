import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export default function CookiesPage() {
    return (
        <main className="min-h-screen bg-background">
            <Navbar />
            <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-28 sm:pt-32 pb-16 sm:pb-20">
                <h1 className="text-3xl sm:text-4xl font-bold text-text-main mb-2">Cookie Policy</h1>
                <p className="text-text-muted text-sm mb-10">Last updated: March 1, 2026</p>

                <div className="prose prose-invert prose-sm max-w-none space-y-8 text-text-muted leading-relaxed">
                    <section>
                        <h2 className="text-xl font-semibold text-text-main mb-3">1. What Are Cookies</h2>
                        <p>Cookies are small text files stored on your device when you visit our website. They help us provide, protect, and improve our services by remembering your preferences and understanding how you use our platform.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-text-main mb-3">2. Types of Cookies We Use</h2>
                        <p><strong className="text-text-main">Essential Cookies:</strong> Required for the platform to function. These handle authentication, session management, and security. You cannot opt out of these.</p>
                        <p className="mt-3"><strong className="text-text-main">Analytics Cookies:</strong> Help us understand how users interact with our platform. We use this data to improve performance and user experience. These are anonymized and aggregated.</p>
                        <p className="mt-3"><strong className="text-text-main">Preference Cookies:</strong> Remember your settings such as theme (dark/light), timezone, and notification preferences.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-text-main mb-3">3. Third-Party Cookies</h2>
                        <p>We use the following third-party services that may set cookies: Clerk (authentication), Stripe (payment processing), and analytics providers. Each has their own privacy and cookie policy.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-text-main mb-3">4. Managing Cookies</h2>
                        <p>Most browsers allow you to control cookies through their settings. You can delete existing cookies and set preferences for future cookies. Note that disabling essential cookies may affect the functionality of the platform.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-text-main mb-3">5. Contact Us</h2>
                        <p>For questions about our cookie practices, contact us at <span className="text-primary">privacy@tychefinancials.com</span>.</p>
                    </section>
                </div>
            </div>
            <Footer />
        </main>
    );
}
