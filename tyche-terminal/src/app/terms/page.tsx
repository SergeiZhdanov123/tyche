import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export default function TermsPage() {
    return (
        <main className="min-h-screen bg-background">
            <Navbar />
            <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-28 sm:pt-32 pb-16 sm:pb-20">
                <h1 className="text-3xl sm:text-4xl font-bold text-text-main mb-2">Terms of Service</h1>
                <p className="text-text-muted text-sm mb-10">Last updated: March 1, 2026</p>

                <div className="prose prose-invert prose-sm max-w-none space-y-8 text-text-muted leading-relaxed">
                    <section>
                        <h2 className="text-xl font-semibold text-text-main mb-3">1. Acceptance of Terms</h2>
                        <p>By accessing or using Erns (&quot;the Service&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use the Service.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-text-main mb-3">2. Description of Service</h2>
                        <p>Erns provides a financial data platform offering earnings intelligence, SEC filing analysis, AI-powered trading signals, and related data services. The Service is intended for informational purposes only and does not constitute financial advice.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-text-main mb-3">3. Account Registration</h2>
                        <p>You must provide accurate and complete information when creating an account. You are responsible for maintaining the security of your account credentials. You must be at least 18 years old to use the Service.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-text-main mb-3">4. Subscriptions and Billing</h2>
                        <p>Paid plans are billed monthly or annually. You may cancel at any time; access continues until the end of the billing period. Refunds are handled on a case-by-case basis. We reserve the right to change pricing with 30 days&apos; notice.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-text-main mb-3">5. Acceptable Use</h2>
                        <p>You may not use the Service to: (a) redistribute data without authorization, (b) attempt to reverse engineer the platform, (c) violate any applicable law or regulation, (d) interfere with the Service&apos;s infrastructure, or (e) scrape data beyond your API rate limits.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-text-main mb-3">6. Disclaimer of Warranties</h2>
                        <p>The Service is provided &quot;as is&quot; without warranties of any kind. We do not guarantee the accuracy, completeness, or timeliness of any data. Financial data may contain errors or delays. Always verify data independently before making investment decisions.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-text-main mb-3">7. Limitation of Liability</h2>
                        <p>To the maximum extent permitted by law, Erns shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service, including but not limited to trading losses.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-text-main mb-3">8. Termination</h2>
                        <p>We may suspend or terminate your account if you violate these terms. You may delete your account at any time through your account settings.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-text-main mb-3">9. Contact</h2>
                        <p>For questions about these terms, contact us at <span className="text-primary">legal@tychefinancials.com</span>.</p>
                    </section>
                </div>
            </div>
            <Footer />
        </main>
    );
}
