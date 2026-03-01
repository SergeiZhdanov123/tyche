import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export default function PrivacyPage() {
    return (
        <main className="min-h-screen bg-background">
            <Navbar />
            <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-28 sm:pt-32 pb-16 sm:pb-20">
                <h1 className="text-3xl sm:text-4xl font-bold text-text-main mb-2">Privacy Policy</h1>
                <p className="text-text-muted text-sm mb-10">Last updated: March 1, 2026</p>

                <div className="prose prose-invert prose-sm max-w-none space-y-8 text-text-muted leading-relaxed">
                    <section>
                        <h2 className="text-xl font-semibold text-text-main mb-3">1. Information We Collect</h2>
                        <p>We collect information you provide directly, such as your name, email address, and payment information when you create an account or subscribe. We also collect usage data including log data, device information, and analytics about how you interact with our platform.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-text-main mb-3">2. How We Use Your Information</h2>
                        <p>We use the information we collect to provide, maintain, and improve our services, process transactions, send communications, and protect against fraud. We may use your email address to send product updates and marketing, which you can opt out of at any time.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-text-main mb-3">3. Data Sharing</h2>
                        <p>We do not sell your personal information. We may share information with service providers who help us operate the platform (e.g., payment processors, hosting providers). We may also disclose information when required by law or to protect our rights.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-text-main mb-3">4. Data Security</h2>
                        <p>We implement industry-standard security measures including encryption in transit (TLS 1.3) and at rest (AES-256), regular security audits, and SOC 2 compliance. However, no method of transmission over the internet is 100% secure.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-text-main mb-3">5. Data Retention</h2>
                        <p>We retain your account data for as long as your account is active. If you delete your account, we will delete or anonymize your personal information within 30 days, except where we are required to retain it for legal compliance.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-text-main mb-3">6. Your Rights</h2>
                        <p>Depending on your jurisdiction, you may have the right to access, correct, delete, or export your personal data. You can exercise these rights by contacting us at privacy@tychefinancials.com or through your account settings.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-text-main mb-3">7. Changes to This Policy</h2>
                        <p>We may update this privacy policy from time to time. We will notify you of any material changes by posting on our website or sending you an email.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-text-main mb-3">8. Contact Us</h2>
                        <p>If you have any questions about this privacy policy or our data practices, contact us at <span className="text-primary">privacy@tychefinancials.com</span>.</p>
                    </section>
                </div>
            </div>
            <Footer />
        </main>
    );
}
