import { Metadata } from 'next';
import { HeaderWithSession } from '@/components/marketing/HeaderWithSession';
import { Footer } from '@/components/marketing/Footer';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { 
  Mail, 
  MessageSquare, 
  Clock, 
  CreditCard, 
  Scale, 
  BookOpen,
  HelpCircle,
  FileText,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  alternates: { canonical: '/contact' },
  title: 'Contact Us',
  description: 'Get in touch with the TaxFormatter team. We\'re here to help with questions about CSV formatting, crypto taxes, and bank statement conversions.',
};

export default function ContactPage() {
  return (
    <>
      <HeaderWithSession />
      <main className="min-h-screen bg-[#020617] text-slate-300 relative overflow-hidden">
        {/* Background ambient glows - keeping these for page depth, but kept away from cards */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-emerald-600/5 rounded-full blur-[100px]" />
        </div>

        <div className="pt-32 pb-20 relative z-10">
          <Container>
            {/* Hero Section */}
            <div className="max-w-3xl mx-auto text-center mb-16">
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight">
                Get in touch
              </h1>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
                Have a question about your crypto taxes or bank exports? 
                We're here to help you get your data formatted perfectly.
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8 mb-20">
              {/* Main Support Options - Left Column (2/3 width) */}
              <div className="lg:col-span-2 space-y-6">
                <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-indigo-400" />
                  Contact Channels
                </h2>
                
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Technical Support */}
                  <a href="mailto:support@taxformatter.com" className="group h-full">
                    <Card className="h-full border-slate-800 bg-gradient-to-br from-indigo-500/10 via-slate-900 to-slate-900 hover:from-indigo-500/20 hover:border-indigo-500/50 transition-all cursor-pointer">
                      <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-indigo-500/20 transition-colors">
                        <Mail className="w-5 h-5 text-indigo-400" />
                      </div>
                      <h3 className="text-lg font-medium text-white mb-2">Technical Support</h3>
                      <p className="text-slate-400 text-sm mb-4">
                        Issues with CSV uploads, formatting errors, or account access.
                      </p>
                      <span className="text-indigo-400 text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                        support@taxformatter.com <ArrowRight className="w-3 h-3" />
                      </span>
                    </Card>
                  </a>

                  {/* Billing */}
                  <a href="mailto:billing@taxformatter.com" className="group h-full">
                    <Card className="h-full border-slate-800 bg-gradient-to-br from-emerald-500/10 via-slate-900 to-slate-900 hover:from-emerald-500/20 hover:border-emerald-500/50 transition-all cursor-pointer">
                      <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors">
                        <CreditCard className="w-5 h-5 text-emerald-400" />
                      </div>
                      <h3 className="text-lg font-medium text-white mb-2">Billing & Plans</h3>
                      <p className="text-slate-400 text-sm mb-4">
                        Questions about subscriptions, upgrades, invoices, or refunds.
                      </p>
                      <span className="text-emerald-400 text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                        billing@taxformatter.com <ArrowRight className="w-3 h-3" />
                      </span>
                    </Card>
                  </a>

                  {/* Feature Requests */}
                  <a href="mailto:feedback@taxformatter.com" className="group h-full">
                    <Card className="h-full border-slate-800 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-900 hover:from-amber-500/20 hover:border-amber-500/50 transition-all cursor-pointer">
                      <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-amber-500/20 transition-colors">
                        <MessageSquare className="w-5 h-5 text-amber-400" />
                      </div>
                      <h3 className="text-lg font-medium text-white mb-2">Feature Requests</h3>
                      <p className="text-slate-400 text-sm mb-4">
                        Request new exchanges, bank formats, or integrations.
                      </p>
                      <span className="text-amber-400 text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                        feedback@taxformatter.com <ArrowRight className="w-3 h-3" />
                      </span>
                    </Card>
                  </a>

                  {/* Legal */}
                  <a href="mailto:legal@taxformatter.com" className="group h-full">
                    <Card className="h-full border-slate-800 bg-gradient-to-br from-slate-700/10 via-slate-900 to-slate-900 hover:from-slate-700/20 hover:border-slate-600 transition-all cursor-pointer">
                      <div className="w-10 h-10 bg-slate-700/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-slate-700/30 transition-colors">
                        <Scale className="w-5 h-5 text-slate-400" />
                      </div>
                      <h3 className="text-lg font-medium text-white mb-2">Legal & Privacy</h3>
                      <p className="text-slate-400 text-sm mb-4">
                        Terms of service, privacy policy, and compliance inquiries.
                      </p>
                      <span className="text-slate-400 text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                        legal@taxformatter.com <ArrowRight className="w-3 h-3" />
                      </span>
                    </Card>
                  </a>
                </div>
              </div>

              {/* Sidebar - Right Column (1/3 width) */}
              <div className="space-y-8">
                {/* Response Times Card */}
                <div className="p-6 rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-800/40 to-slate-900/80">
                  <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    Expected Response Times
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Premium Users</span>
                      <span className="text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded text-xs">~4 hours</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Pro Users</span>
                      <span className="text-indigo-400 font-medium bg-indigo-500/10 px-2 py-0.5 rounded text-xs">&lt; 24 hours</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Free Users</span>
                      <span className="text-slate-500 font-medium">24-48 hours</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-800">
                     <p className="text-xs text-slate-500">
                       Support Hours: Mon-Fri, 9am - 6pm EST
                     </p>
                  </div>
                </div>

                {/* Self Help / Quick Links */}
                <div className="space-y-3">
                  <h3 className="text-white font-medium pl-1 text-sm uppercase tracking-wider text-slate-500">Popular Resources</h3>
                  
                  <Link href="/docs" className="block group">
                    <div className="flex items-center p-3 rounded-xl bg-gradient-to-br from-slate-800/30 to-slate-900 border border-slate-800 hover:border-slate-700 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center mr-3">
                        <BookOpen className="w-4 h-4 text-blue-400" />
                      </div>
                      <div>
                        <div className="text-slate-200 text-sm font-medium group-hover:text-blue-400 transition-colors">Documentation</div>
                        <div className="text-slate-500 text-xs">Guides & tutorials</div>
                      </div>
                    </div>
                  </Link>

                  <Link href="/#faq" className="block group">
                     <div className="flex items-center p-3 rounded-xl bg-gradient-to-br from-slate-800/30 to-slate-900 border border-slate-800 hover:border-slate-700 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center mr-3">
                        <HelpCircle className="w-4 h-4 text-purple-400" />
                      </div>
                      <div>
                        <div className="text-slate-200 text-sm font-medium group-hover:text-purple-400 transition-colors">FAQ</div>
                        <div className="text-slate-500 text-xs">Common questions</div>
                      </div>
                    </div>
                  </Link>

                  <Link href="/samples" className="block group">
                     <div className="flex items-center p-3 rounded-xl bg-gradient-to-br from-slate-800/30 to-slate-900 border border-slate-800 hover:border-slate-700 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center mr-3">
                        <FileText className="w-4 h-4 text-pink-400" />
                      </div>
                      <div>
                        <div className="text-slate-200 text-sm font-medium group-hover:text-pink-400 transition-colors">Sample Files</div>
                        <div className="text-slate-500 text-xs">Download examples</div>
                      </div>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
            
            {/* Bottom Call to Action */}
            <div className="text-center py-12 border-t border-slate-800">
               <p className="text-slate-400 mb-6">Need priority support? Upgrade your account for faster response times.</p>
               <div className="flex items-center justify-center gap-4">
                  <Link href="/signup">
                    <Button variant="primary" showArrow>Create Account</Button>
                  </Link>
                  <Link href="/login">
                    <Button variant="secondary">Log In</Button>
                  </Link>
               </div>
            </div>

          </Container>
        </div>
      </main>
      <Footer />
    </>
  );
}