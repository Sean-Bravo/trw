import { Metadata } from 'next';
import { Header } from '@/components/marketing/Header';
import { Footer } from '@/components/marketing/Footer';
import { Container } from '@/components/layout/Container';
import { Mail, MessageSquare, Clock, FileText } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Contact Us | TaxFormatter',
  description: 'Get in touch with the TaxFormatter team. We\'re here to help with questions about CSV formatting, crypto taxes, and bank statement conversions.',
};

export default function ContactPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-950 text-slate-300 pt-32 pb-24">
        <Container>
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Contact Us
            </h1>
            <p className="text-slate-400 mb-12 text-lg">
              Have a question? We&apos;re here to help.
            </p>

            <div className="grid md:grid-cols-2 gap-8 mb-16">
              {/* General Support */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8">
                <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center mb-4">
                  <Mail className="w-6 h-6 text-indigo-400" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">General Support</h2>
                <p className="text-slate-400 mb-4">
                  Questions about your account, uploads, or exports.
                </p>
                <a
                  href="mailto:support@taxformatter.com"
                  className="text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  support@taxformatter.com
                </a>
              </div>

              {/* Billing */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6 text-emerald-400" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">Billing</h2>
                <p className="text-slate-400 mb-4">
                  Subscription, payment, or refund questions.
                </p>
                <a
                  href="mailto:billing@taxformatter.com"
                  className="text-emerald-400 hover:text-emerald-300 font-medium"
                >
                  billing@taxformatter.com
                </a>
              </div>

              {/* Feature Requests */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8">
                <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center mb-4">
                  <MessageSquare className="w-6 h-6 text-amber-400" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">Feature Requests</h2>
                <p className="text-slate-400 mb-4">
                  Suggest new exchanges, banks, or export formats.
                </p>
                <a
                  href="mailto:feedback@taxformatter.com"
                  className="text-amber-400 hover:text-amber-300 font-medium"
                >
                  feedback@taxformatter.com
                </a>
              </div>

              {/* Legal */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8">
                <div className="w-12 h-12 bg-slate-500/20 rounded-xl flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6 text-slate-400" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">Legal</h2>
                <p className="text-slate-400 mb-4">
                  Privacy, terms, or compliance inquiries.
                </p>
                <a
                  href="mailto:legal@taxformatter.com"
                  className="text-slate-300 hover:text-white font-medium"
                >
                  legal@taxformatter.com
                </a>
              </div>
            </div>

            {/* Response Time */}
            <div className="bg-gradient-to-r from-indigo-500/10 to-emerald-500/10 border border-indigo-500/20 rounded-2xl p-8 mb-16">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Clock className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white mb-2">Response Times</h2>
                  <ul className="text-slate-400 space-y-2">
                    <li><span className="text-emerald-400 font-medium">Premium users:</span> Within 4 hours (business days)</li>
                    <li><span className="text-indigo-400 font-medium">Pro users:</span> Within 24 hours</li>
                    <li><span className="text-slate-300 font-medium">Free users:</span> Within 48 hours</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="border-t border-slate-800 pt-12">
              <h2 className="text-xl font-semibold text-white mb-6">Before You Reach Out</h2>
              <p className="text-slate-400 mb-6">
                You might find your answer faster in these resources:
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/docs"
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                >
                  Documentation
                </Link>
                <Link
                  href="/samples"
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                >
                  Sample Outputs
                </Link>
                <Link
                  href="/#faq"
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                >
                  FAQ
                </Link>
                <Link
                  href="/pricing"
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                >
                  Pricing
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
