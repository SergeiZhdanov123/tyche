import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export default function SecurityPage() {
    return (
        <main className="min-h-screen bg-background">
            <Navbar />
            <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-28 sm:pt-32 pb-16 sm:pb-20">
                <h1 className="text-3xl sm:text-4xl font-bold text-text-main mb-2">Security</h1>
                <p className="text-text-muted text-sm mb-10">How we protect your data and our infrastructure.</p>

                <div className="prose prose-invert prose-sm max-w-none space-y-8 text-text-muted leading-relaxed">
                    <section>
                        <h2 className="text-xl font-semibold text-text-main mb-3">Infrastructure Security</h2>
                        <p>Erns is hosted on SOC 2 Type II certified cloud infrastructure. All data is encrypted in transit using TLS 1.3 and at rest using AES-256 encryption. Our infrastructure is monitored 24/7 with automated threat detection and incident response.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-text-main mb-3">Authentication & Access</h2>
                        <p>We use Clerk for enterprise-grade authentication with support for multi-factor authentication (MFA), SSO via SAML/OIDC, and session management. API keys are hashed using bcrypt and never stored in plaintext.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-text-main mb-3">Data Protection</h2>
                        <p>Your financial data and personal information are stored in encrypted databases with strict access controls. We follow the principle of least privilege — employees access only the data they need to do their jobs. All access is logged and audited.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-text-main mb-3">Compliance</h2>
                        <ul className="space-y-2 mt-3">
                            <li className="flex items-center gap-2">
                                <span className="text-primary">✓</span> SOC 2 Type II Certified
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="text-primary">✓</span> GDPR Compliant
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="text-primary">✓</span> CCPA Compliant
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="text-primary">✓</span> Regular Penetration Testing
                            </li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-text-main mb-3">Vulnerability Reporting</h2>
                        <p>We appreciate responsible vulnerability disclosure. If you discover a security issue, please report it to <span className="text-primary">security@tychefinancials.com</span>. We respond to all reports within 24 hours and offer a bug bounty program for qualifying vulnerabilities.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-text-main mb-3">Questions</h2>
                        <p>For security-related inquiries, contact <span className="text-primary">security@tychefinancials.com</span>.</p>
                    </section>
                </div>
            </div>
            <Footer />
        </main>
    );
}
