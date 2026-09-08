import { Metadata } from 'next';
import Link from 'next/link';
import { HeaderWithSession } from '@/components/marketing/HeaderWithSession';
import { Footer } from '@/components/marketing/Footer';
import { Container } from '@/components/layout/Container';

export const metadata: Metadata = {
  alternates: { canonical: '/terms' },
  title: 'Terms of Service',
  description: 'Read the terms and conditions for using TaxFormatter CSV formatting and tax preparation service.',
};

export default function TermsOfServicePage() {
  return (
    <>
      <HeaderWithSession />
      <main className="min-h-screen bg-slate-950 text-slate-300 pt-32 pb-24">
        <Container>
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Terms of Service
            </h1>
            <p className="text-slate-400 mb-12">
              Last updated: January 10, 2025
            </p>

            <div className="prose prose-invert prose-slate max-w-none space-y-8">

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">1. Acceptance of Terms</h2>
                <p>
                  By accessing or using TaxFormatter (&quot;the Service&quot;), you agree to be bound by these
                  Terms of Service. If you do not agree to these terms, please do not use the Service.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">2. Description of Service</h2>
                <p className="mb-4">
                  TaxFormatter is a CSV file formatting and repair tool designed to help users prepare
                  their cryptocurrency transaction data for tax software. The Service:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Formats and repairs CSV files from cryptocurrency exchanges</li>
                  <li>Converts bank statement PDFs to Excel format</li>
                  <li>Provides AI-assisted transaction categorization (Premium tier)</li>
                  <li>Does NOT provide tax advice or calculate tax liability</li>
                  <li>Does NOT access your exchange accounts or wallets</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">3. User Accounts</h2>
                <p className="mb-4">To use certain features of the Service, you must create an account. You agree to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Provide accurate and complete information</li>
                  <li>Maintain the security of your password</li>
                  <li>Accept responsibility for all activities under your account</li>
                  <li>Notify us immediately of any unauthorized access</li>
                </ul>
                <p className="mt-4">
                  We reserve the right to suspend or terminate accounts that violate these terms.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">4. Subscription and Payments</h2>

                <h3 className="text-xl font-medium text-slate-200 mb-3">Pricing</h3>
                <p className="mb-4">
                  Our current pricing tiers are displayed on our <Link href="/pricing" className="text-indigo-400 hover:text-indigo-300 underline">pricing page</Link>.
                  Prices are subject to change with notice to existing subscribers.
                </p>

                <h3 className="text-xl font-medium text-slate-200 mb-3">Billing</h3>
                <p className="mb-4">
                  Subscriptions are billed in advance on a monthly or annual basis. All payments are
                  processed securely through Stripe.
                </p>

                <h3 className="text-xl font-medium text-slate-200 mb-3">Refunds</h3>
                <p>
                  We offer a 30-day money-back guarantee for first-time subscribers. If you are not
                  satisfied with the Service, contact us within 30 days of your initial purchase for
                  a full refund. Refunds are not available after the 30-day period or for renewal payments.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">5. Acceptable Use</h2>
                <p className="mb-4">You agree not to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Use the Service for any illegal purpose</li>
                  <li>Upload malicious files or attempt to compromise our systems</li>
                  <li>Attempt to access other users&apos; accounts or data</li>
                  <li>Reverse engineer or attempt to extract the source code</li>
                  <li>Use automated tools to scrape or overload the Service</li>
                  <li>Resell or redistribute the Service without authorization</li>
                  <li>Upload files containing illegal content</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">6. Intellectual Property</h2>
                <p className="mb-4">
                  The Service, including its design, features, and content, is owned by TaxFormatter
                  and protected by intellectual property laws. You retain ownership of any files you
                  upload, and we claim no rights to your data.
                </p>
                <p>
                  You grant us a limited license to process your uploaded files solely for the purpose
                  of providing the Service.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">7. Data Handling</h2>
                <p className="mb-4">
                  We take data security seriously. Please review our <Link href="/privacy" className="text-indigo-400 hover:text-indigo-300 underline">Privacy Policy</Link> for
                  details on how we handle your data. Key points:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Uploaded files are automatically deleted within 24 hours</li>
                  <li>We use AES-256 encryption for stored data</li>
                  <li>We never access your exchange accounts or wallets</li>
                  <li>We do not sell or share your data with third parties</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">8. Disclaimer of Warranties</h2>
                <p className="mb-4">
                  THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND,
                  EITHER EXPRESS OR IMPLIED.
                </p>
                <p className="mb-4">We do not warrant that:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>The Service will be uninterrupted or error-free</li>
                  <li>The output files will be 100% accurate or complete</li>
                  <li>The Service will meet your specific requirements</li>
                  <li>Any errors will be corrected</li>
                </ul>
                <p className="mt-4 font-semibold text-amber-400">
                  IMPORTANT: TaxFormatter is not a tax advisor. Always verify your formatted data
                  and consult with a qualified tax professional before filing.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">9. Limitation of Liability</h2>
                <p className="mb-4">
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, TAXFORMATTER SHALL NOT BE LIABLE FOR ANY
                  INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Loss of profits, data, or business opportunities</li>
                  <li>Errors in tax filings based on our output</li>
                  <li>Penalties or interest assessed by tax authorities</li>
                  <li>Any damages resulting from unauthorized access to your account</li>
                </ul>
                <p className="mt-4">
                  Our total liability shall not exceed the amount you paid for the Service in the
                  12 months preceding the claim.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">10. Indemnification</h2>
                <p>
                  You agree to indemnify and hold harmless TaxFormatter, its officers, directors,
                  employees, and agents from any claims, damages, losses, or expenses arising from
                  your use of the Service or violation of these Terms.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">11. Modifications to Service</h2>
                <p>
                  We reserve the right to modify, suspend, or discontinue any part of the Service
                  at any time. We will provide reasonable notice for significant changes that affect
                  paid subscribers.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">12. Changes to Terms</h2>
                <p>
                  We may update these Terms from time to time. We will notify you of material changes
                  by email or by posting a notice on our website. Your continued use of the Service
                  after such changes constitutes acceptance of the new Terms.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">13. Governing Law</h2>
                <p>
                  These Terms shall be governed by and construed in accordance with the laws of the
                  United States, without regard to its conflict of law provisions. Any disputes shall
                  be resolved in the courts of competent jurisdiction.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">14. Severability</h2>
                <p>
                  If any provision of these Terms is found to be unenforceable, the remaining provisions
                  will continue in full force and effect.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">15. Contact Us</h2>
                <p>
                  If you have any questions about these Terms, please contact us at:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-4">
                  <li>Email: legal@taxformatter.com</li>
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
