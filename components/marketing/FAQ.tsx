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
    question: "What are the 'Big 4' banks for PDF conversion?",
    answer: "Chase, Bank of America, Wells Fargo, and Citi. These are the four most common bank statement formats we see, and Pro users get unlimited PDF-to-Excel conversions for all of them. These banks cover roughly 80% of US business banking, so most users never need more.",
    vibe: 'curious',
  },
  {
    question: "What if my bank isn't in the Big 4?",
    answer: "Premium users get access to all 50+ supported banks including Capital One, US Bank, PNC, TD Bank, American Express, Discover, Mercury, Relay, Brex, HSBC, and more. Premium also lets you request new bank formats—we'll add your bank within 48 hours if it's not already supported.",
    vibe: 'hopeful',
  },
  {
    question: "What exchanges do you actually support?",
    answer: "14 and counting: Coinbase, Kraken, Gemini, Binance, Robinhood, Crypto.com, PayPal, Cash App, Venmo, KuCoin, Bybit, FTX (RIP, but we still process historical data), Bitfinex, and OKX. We detect formats automatically—no API keys, no account linking. New exchanges get added constantly based on what users throw at us.",
    vibe: 'curious',
  },
  {
    question: "Will this work with my tax software?",
    answer: "Almost certainly. We export directly to TurboTax, TaxAct, H&R Block, Koinly, CoinTracker, TokenTax, CoinLedger, and ZenLedger. If yours isn't listed, we also generate IRS Form 8949—the universal format that everything accepts.",
    vibe: 'hopeful',
  },
  {
    question: "Do you connect to my exchange accounts?",
    answer: "No. Hard no. We don't want your API keys. You upload a CSV, we clean it, you download the result. That's it. No account access, no OAuth flows, no storing credentials.",
    vibe: 'paranoid',
  },
  {
    question: "Can I upload files from multiple exchanges?",
    answer: "Yes. Upload CSVs from Coinbase, Kraken, and that random DEX you tried once—all in the same session. We'll consolidate everything into one clean, tax-ready export.",
    vibe: 'frustrated',
  },
  {
    question: "Is my data stored anywhere?",
    answer: "Your files are stored securely for up to 1 year so you can re-download results anytime. Want it gone sooner? Hit the delete button after downloading and it's permanently removed. We never build a database of your trades or share your data with anyone.",
    vibe: 'paranoid',
  },
  {
    question: "My tax software isn't on your list. Now what?",
    answer: "Use the Form 8949 export. It's the IRS standard for reporting crypto disposals in the US. Any legitimate tax software can import it directly or accept the data with minimal manual entry.",
    vibe: 'worried',
  },
  {
    question: "Does TaxFormatter calculate my capital gains?",
    answer: "No. We're a formatting tool, not tax software. We take your broken exchange CSV, fix the errors, and export it in a format your tax platform can actually import. The cost basis math (FIFO, LIFO, HIFO) happens in TurboTax, Koinly, or whatever you use to file. Think of us as the translator between your exchange and your tax software.",
    vibe: 'curious',
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

const vibeAccents: Record<VibeType, string> = {
  frustrated: 'border-orange-500/50 text-orange-400 shadow-orange-500/20',
  paranoid: 'border-purple-500/50 text-purple-400 shadow-purple-500/20',
  skeptic: 'border-yellow-500/50 text-yellow-400 shadow-yellow-500/20',
  hopeful: 'border-emerald-500/50 text-emerald-400 shadow-emerald-500/20',
  worried: 'border-blue-500/50 text-blue-400 shadow-blue-500/20',
  curious: 'border-pink-500/50 text-pink-400 shadow-pink-500/20',
};

export function FAQ() {
  const [activeIndex, setActiveIndex] = useState(0);
  
  // 3. Fix the state type so it accepts null OR number
  const [mobileExpandedIndex, setMobileExpandedIndex] = useState<number | null>(null);

  // 4. Safe fallback to satisfy TS (even though logic dictates it exists)
  const activeItem = faqItems[activeIndex] ?? faqItems[0]!;

  return (
    <>
      <FAQSchema items={schemaItems} />
      <section className="bg-[#0a0a0a] py-24 sm:py-32 relative overflow-hidden">
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
                No corporate speak
              </p>
              <h2 className="text-4xl sm:text-5xl font-bold text-white leading-[1.1]">
                Stuff you're actually wondering.
              </h2>
              <p className="text-zinc-500 text-lg mt-6 tracking-tight">
                 Straight answers to the questions we get asked the most.
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
                          ? `bg-zinc-900/50 border-zinc-700 ${vibeAccents[item.vibe].split(' ')[1]}` 
                          : 'bg-transparent border-transparent hover:bg-zinc-900/30 text-zinc-400 hover:text-white'
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
                  "bg-zinc-900/80 p-10 rounded-3xl border backdrop-blur-sm transition-all duration-500 shadow-xl relative overflow-hidden",
                  vibeAccents[activeItem.vibe]
                )}>
                  <div className={clsx(
                    "absolute -top-20 -right-20 w-64 h-64 bg-current opacity-[0.08] blur-3xl rounded-full pointer-events-none transition-colors duration-500",
                    vibeAccents[activeItem.vibe].split(' ')[1]
                  )} />

                  <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                    The straight answer.
                  </h3>
                  <div className="text-zinc-300 text-lg leading-relaxed space-y-4 relative z-10 font-light">
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
                      isExpanded ? `bg-zinc-900/80 ${vibeAccents[item.vibe]}` : "bg-zinc-900/30 border-white/5"
                    )}
                  >
                    <button
                      onClick={() => setMobileExpandedIndex(isExpanded ? null : index)}
                      className="w-full text-left p-6 flex items-start justify-between gap-4"
                    >
                       <h3 className={clsx(
                          "font-semibold transition-colors duration-300 text-lg",
                          isExpanded ? "text-white" : "text-zinc-300"
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
                      <div className="overflow-hidden text-zinc-300 leading-relaxed">
                       {item.answer}
                      </div>
                    </div>
                  </div>
                 )
              })}
            </div>

            <div className="mt-20 sm:mt-24 text-center border-t border-white/10 pt-12">
              <p className="text-zinc-400 text-lg">
                Still confused?{' '}
                <a 
                  href="mailto:support@taxformatter.com" 
                  className="text-white hover:text-emerald-400 underline underline-offset-4 transition-colors font-medium"
                >
                  Just email us
                </a>
                . We actually respond.
              </p>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
