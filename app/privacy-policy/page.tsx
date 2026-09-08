import { Metadata } from 'next';
import { HeaderWithSession } from '@/components/marketing/HeaderWithSession';
import { Footer } from '@/components/marketing/Footer';
import { Container } from '@/components/layout/Container';

export const metadata: Metadata = {
  alternates: { canonical: '/privacy-policy' },
  title: 'Privacy Policy',
  description: 'Learn how TaxFormatter collects, uses, and protects your personal information.',
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <HeaderWithSession />
      <main className="min-h-screen bg-slate-950 text-slate-300 pt-32 pb-24">
        <Container>
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Privacy Policy
            </h1>
            <p className="text-slate-400 mb-12">
              Last updated: January 26, 2026
            </p>

            <div className="prose prose-invert prose-slate max-w-none space-y-8">

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">1. Introduction</h2>
                <p>
                  TaxFormatter (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy.
                  This Privacy Policy explains how we collect, use, disclose, and safeguard your information
                  when you use our CSV formatting and tax preparation service.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">2. Information We Collect</h2>

                <h3 className="text-xl font-medium text-slate-200 mb-3">Account Information</h3>
                <p className="mb-4">
                  When you create an account, we collect:
                </p>
                <ul className="list-disc pl-6 space-y-2 mb-4">
                  <li>Email address</li>
                  <li>Password (encrypted)</li>
                  <li>Account preferences</li>
                </ul>

                <h3 className="text-xl font-medium text-slate-200 mb-3">File Data</h3>
                <p className="mb-4">
                  When you upload CSV files for processing:
                </p>
                <ul className="list-disc pl-6 space-y-2 mb-4">
                  <li>CSV files are stored encrypted for up to 1 year (or deleted immediately at your request)</li>
                  <li>We do not analyze, sell, or share the contents of your files</li>
                  <li>We never request or store exchange API keys, private keys, or wallet seed phrases</li>
                  <li>Anonymized processing metadata (exchange detected, row count, error types) is retained to improve our service</li>
                </ul>

                <h3 className="text-xl font-medium text-slate-200 mb-3">Usage Data</h3>
                <p>
                  We automatically collect certain information when you use our service, including:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>IP address</li>
                  <li>Browser type and version</li>
                  <li>Pages visited and time spent</li>
                  <li>Device information</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">3. How We Use Your Information</h2>
                <p className="mb-4">We use the information we collect to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Provide and maintain our CSV formatting service</li>
                  <li>Process your transactions and send related information</li>
                  <li>Send you technical notices and support messages</li>
                  <li>Respond to your comments and questions</li>
                  <li>Analyze usage patterns to improve our service</li>
                  <li>Detect, prevent, and address technical issues</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">4. Data Retention</h2>
                <p className="mb-4">
                  We follow a user-controlled data retention policy:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong className="text-white">Uploaded files:</strong> Retained for 1 year by default, or deleted immediately upon your request via the &quot;Delete after download&quot; option</li>
                  <li><strong className="text-white">Processed output files:</strong> Available for re-download for 1 year, or deleted immediately if you choose</li>
                  <li><strong className="text-white">Anonymized metadata:</strong> Exchange detected, row count, column headers, and processing duration are retained permanently to improve our service (no transaction amounts, wallet addresses, or PII)</li>
                  <li><strong className="text-white">Account data:</strong> Retained until you delete your account</li>
                  <li><strong className="text-white">Payment records:</strong> Retained as required by law for tax and accounting purposes</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">5. Data Security</h2>
                <p className="mb-4">
                  We implement industry-standard security measures to protect your data:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>AES-256 encryption for stored files</li>
                  <li>TLS 1.3 encryption for all data in transit</li>
                  <li>AWS infrastructure with SOC 2 compliance</li>
                  <li>Regular security audits and penetration testing</li>
                  <li>Access controls and audit logging</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">6. Third-Party Services</h2>
                <p className="mb-4">We use the following third-party services:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong className="text-white">Stripe:</strong> Payment processing</li>
                  <li><strong className="text-white">AWS:</strong> Cloud infrastructure and file storage</li>
                  <li><strong className="text-white">Google Analytics:</strong> Website analytics</li>
                  <li><strong className="text-white">Mailchimp:</strong> Email communications</li>
                </ul>
                <p className="mt-4">
                  Each of these services has their own privacy policy governing their use of your data.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">7. Cookies</h2>
                <p className="mb-4">
                  We use cookies and similar tracking technologies to:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Keep you signed in to your account</li>
                  <li>Remember your preferences</li>
                  <li>Understand how you use our service</li>
                  <li>Improve our service based on usage patterns</li>
                </ul>
                <p className="mt-4">
                  You can control cookies through your browser settings. Disabling cookies may affect
                  the functionality of our service.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">8. Your Rights</h2>
                <p className="mb-4">You have the right to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Access the personal data we hold about you</li>
                  <li>Request correction of inaccurate data</li>
                  <li>Request deletion of your data</li>
                  <li>Object to processing of your data</li>
                  <li>Request data portability</li>
                  <li>Withdraw consent at any time</li>
                </ul>
                <p className="mt-4">
                  To exercise these rights, please contact us at privacy@taxformatter.com.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">9. Children&apos;s Privacy</h2>
                <p>
                  Our service is not intended for individuals under the age of 18. We do not knowingly
                  collect personal information from children. If you believe we have collected information
                  from a child, please contact us immediately.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">10. Changes to This Policy</h2>
                <p>
                  We may update this Privacy Policy from time to time. We will notify you of any changes
                  by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date.
                  You are advised to review this Privacy Policy periodically for any changes.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">11. Contact Us</h2>
                <p>
                  If you have any questions about this Privacy Policy, please contact us at:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-4">
                  <li>Email: privacy@taxformatter.com</li>
                  <li>Website: taxformatter.com/contact</li>
                </ul>
              </section>

            </div>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
