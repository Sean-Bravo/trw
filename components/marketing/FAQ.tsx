'use client';

import React, { useState } from 'react';
import { Container } from '../layout/Container';
import { FAQSchema } from '../seo/FAQSchema';
import clsx from 'clsx';
import { 
  TriangleAlert, 
  Shield, 
  Search, 
  Sparkles, 
  FileWarning, 
  HelpCircle,
  LucideIcon 
} from 'lucide-react';

// 1. Define the valid "vibe" keys so TS knows they aren't random strings
type VibeType = 'frustrated' | 'paranoid' | 'skeptic' | 'hopeful' | 'worried' | 'curious';

interface FAQItem {
  question: string;
  answer: string;
  vibe: VibeType;
}

const faqItems: FAQItem[] = [
  {
    question: "How does the API detect which exchange a CSV came from?",
    answer: "Header fingerprinting. Every exchange exports slightly different column names and ordering. We hash the headers against our registry of 14 known formats and match instantly. If we can't match, we fall back to a generic parser that looks for date + amount columns. You can also pass the exchange name explicitly to skip detection.",
    vibe: 'curious',
  },
  {
    question: "What does the MCP server actually do?",
    answer: "It wraps our REST API as three MCP tools that any compatible AI agent (Claude, GPT, custom builds) can call natively. Your agent can read a CSV from disk, base64-encode it, POST it to /v1/parse, and get structured transactions back — all without you writing any integration code. Just add our npx package to your MCP config and go.",
    vibe: 'curious',
  },
  {
    question: "Do you store the files I send through the API?",
    answer: "No. Files are processed in-memory inside the Lambda and discarded immediately after the response is sent. Nothing touches disk, nothing gets logged, nothing persists. We track usage counts and byte totals for billing, but never the file contents or transaction data.",
    vibe: 'paranoid',
  },
  {
    question: "What happens when I hit my monthly quota?",
    answer: "We don't hard-block you. Requests keep working but we set an X-Api-Overage header on responses so your app knows you're over. No surprise 403s killing your users' experience. Upgrade your tier or wait for the month to roll over.",
    vibe: 'worried',
  },
  {
    question: "Can the API parse bank statement PDFs too?",
    answer: "Yes. Send a PDF with filename ending in .pdf and we'll route it to the bank statement processor automatically. We support Chase, Mercury, Navy Federal, Bank of America, Wells Fargo, Citi, and Capital One. The API auto-detects the bank from the PDF content — no configuration needed.",
    vibe: 'hopeful',
  },
  {
    question: "What output formats does the API support?",
    answer: "Four: Koinly (universal template), TurboTax (Form 8949), CoinLedger (manual import), and ZenLedger (custom CSV). Pass output_format in your request. Default is Koinly. All formats normalize dates, amounts, and transaction types to match what each tax platform expects.",
    vibe: 'curious',
  },
  {
    question: "How fast is it?",
    answer: "Typical CSV parsing completes in under 1 second. Bank statement PDFs take 1-2 seconds depending on page count. The API Lambda has a 120-second timeout and 1GB memory, so even large files (up to 10MB) process without issues. We include processing_time_ms in every response so you can monitor latency.",
    vibe: 'skeptic',
  },
  {
    question: "What if auto-detection picks the wrong exchange?",
    answer: "Pass the exchange parameter explicitly in your request to override auto-detection. If you're not sure which exchange it is, hit GET /v1/sources first to see all supported formats. The API also returns a detected_source field in every response so you can verify what it matched.",
    vibe: 'frustrated',
  },
  {
    question: "What's the cheapest plan?",
    answer: "Starter is $29/month — 100 files, 30 requests per minute, all 14 exchanges, all output formats. Enough to build and ship a real integration. When you need more volume, upgrade to Growth ($99/mo for 500 files) or Business ($249/mo for 2,000 files).",
    vibe: 'hopeful',
  },
];

const schemaItems = faqItems.map(item => ({
  question: item.question,
  answer: item.answer,
}));

// 2. Type these objects using Record<VibeType, ...>
const vibeIcons: Record<VibeType, LucideIcon> = {
  frustrated: TriangleAlert,
  paranoid: Shield,
  skeptic: Search,
  hopeful: Sparkles,
  worried: FileWarning,
  curious: HelpCircle,
};

// One accent for every vibe. Six competing colours (orange, purple, yellow,
// emerald, blue, pink) carried no meaning the vibe icon doesn't already carry,
// and made the FAQ read as a different site. The icons still differentiate.
const ANSWER_ACCENT = 'border-[#635bff]/50 text-primary-400 shadow-[#635bff]/20';
const ANSWER_ACCENT_TEXT = 'text-primary-400';

export function FAQ() {
  const [activeIndex, setActiveIndex] = useState(0);
  
  // 3. Fix the state type so it accepts null OR number
  const [mobileExpandedIndex, setMobileExpandedIndex] = useState<number | null>(null);

  // 4. Safe fallback to satisfy TS (even though logic dictates it exists)
  const activeItem = faqItems[activeIndex] ?? faqItems[0]!;

  return (
    <>
      <FAQSchema items={schemaItems} />
      <section className="bg-surface-base py-20 relative overflow-hidden">
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
        
        <Container>
          <div className="relative">
            <div className="mb-16 sm:mb-24 sm:text-center sm:mx-auto max-w-3xl">
              <p className="text-emerald-400 font-mono text-sm tracking-wider mb-4 uppercase">
                Before you integrate
              </p>
              <h2 className="text-4xl sm:text-5xl font-bold text-white leading-[1.1]">
                Things devs actually ask.
              </h2>
              <p className="text-slate-400 text-lg mt-6 tracking-tight">
                 No fluff. Real answers about the API, MCP server, and how it all works.
              </p>
            </div>

            {/* --- DESKTOP LAYOUT --- */}
            <div className="hidden lg:grid lg:grid-cols-12 gap-x-12 items-start">
              <div className="col-span-5 flex flex-col space-y-2">
                {faqItems.map((item, index) => {
                  const isActive = activeIndex === index;
                  const Icon = vibeIcons[item.vibe];

                  return (
                    <button
                      key={index}
                      onClick={() => setActiveIndex(index)}
                      className={clsx(
                        'group text-left px-6 py-5 rounded-xl transition-all duration-300 border flex items-center justify-between',
                        isActive 
                          ? `bg-white/4 border-white/10 ${ANSWER_ACCENT_TEXT}` 
                          : 'bg-transparent border-transparent hover:bg-white/2 text-slate-400 hover:text-white'
                      )}
                    >
                      <span className={clsx("font-medium text-lg pr-4", isActive ? "text-white" : "")}>
                        {item.question}
                      </span>
                      {isActive && (
                         <span className="animate-in fade-in zoom-in duration-300">
                           <Icon className="w-5 h-5" />
                         </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="col-span-7 sticky top-8">
                <div className={clsx(
                  "bg-white/4 p-10 rounded-3xl border backdrop-blur-sm transition-all duration-500 shadow-xl relative overflow-hidden",
                  ANSWER_ACCENT
                )}>
                  <div className={clsx(
                    "absolute -top-20 -right-20 w-64 h-64 bg-current opacity-[0.08] blur-3xl rounded-full pointer-events-none transition-colors duration-500",
                    ANSWER_ACCENT_TEXT
                  )} />

                  <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                    The straight answer.
                  </h3>
                  <div className="text-slate-300 text-lg leading-relaxed space-y-4 relative z-10 font-light">
                   <p>{activeItem.answer}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* --- MOBILE LAYOUT --- */}
            <div className="lg:hidden flex flex-col space-y-4">
              {faqItems.map((item, index) => {
                 const isExpanded = mobileExpandedIndex === index;
                 const Icon = vibeIcons[item.vibe];

                 return (
                  <div 
                    key={index}
                    className={clsx(
                      "rounded-2xl border transition-all duration-300 overflow-hidden",
                      isExpanded ? `bg-white/4 ${ANSWER_ACCENT}` : "bg-white/2 border-white/5"
                    )}
                  >
                    <button
                      onClick={() => setMobileExpandedIndex(isExpanded ? null : index)}
                      className="w-full text-left p-6 flex items-start justify-between gap-4"
                    >
                       <h3 className={clsx(
                          "font-semibold transition-colors duration-300 text-lg",
                          isExpanded ? "text-white" : "text-slate-300"
                       )}>
                        {item.question}
                      </h3>
                      <Icon className={clsx(
                        "w-5 h-5 shrink-0 transition-opacity duration-300",
                        isExpanded ? "opacity-100" : "opacity-50"
                      )} />
                    </button>
                    
                    <div className={clsx(
                      "px-6 transition-all duration-300 grid",
                      isExpanded ? "pb-6 grid-rows-[1fr] opacity-100" : "pb-0 grid-rows-[0fr] opacity-0"
                    )}>
                      <div className="overflow-hidden text-slate-300 leading-relaxed">
                       {item.answer}
                      </div>
                    </div>
                  </div>
                 )
              })}
            </div>

          </div>
        </Container>
      </section>
    </>
  );
}
