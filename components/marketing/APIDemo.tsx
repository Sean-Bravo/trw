'use client';

import React, { useState } from 'react';
import { Container } from '../layout/Container';
import { Copy, Check } from 'lucide-react';

const languages = [
  {
    name: 'Python',
    icon: '🐍',
    code: `import requests

response = requests.post(
    "https://api.taxformatter.com/v1/parse",
    headers={"X-API-Key": "tf_live_sk8f2m..."},
    json={
        "file_content": base64_encoded_csv,
        "filename": "coinbase_2024.csv",
        "output_format": "koinly"
    }
)

data = response.json()
print(f"Parsed {data['metadata']['transaction_count']} txs")
for tx in data["transactions"]:
    print(f"  {tx['Date']} {tx['Type']} {tx['Amount']}")`,
  },
  {
    name: 'Node.js',
    icon: '⬢',
    code: `const response = await fetch(
  "https://api.taxformatter.com/v1/parse",
  {
    method: "POST",
    headers: {
      "X-API-Key": "tf_live_sk8f2m...",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      file_content: base64EncodedCsv,
      filename: "binance_2024.csv",
      output_format: "turbotax",
    }),
  }
);

const { transactions, summary } = await response.json();
console.log(summary);
// → "Parsed 312 Binance transactions"`,
  },
  {
    name: 'cURL',
    icon: '▶',
    code: `curl -X POST https://api.taxformatter.com/v1/parse \\
  -H "X-API-Key: tf_live_sk8f2m..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "file_content": "'$(base64 -i coinbase.csv)'",
    "filename": "coinbase_2024.csv",
    "output_format": "koinly"
  }'

# Response:
# {
#   "status": "success",
#   "summary": "Parsed 147 Coinbase transactions",
#   "transactions": [ ... ]
# }`,
  },
];

export function APIDemo() {
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(languages[activeTab]?.code ?? '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="features" className="py-20 bg-surface-base relative overflow-hidden">
      {/* Subtle radial accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-200 h-100 bg-[#635bff]/5 rounded-[100%] blur-[120px]" />

      <Container>
        <div className="relative z-10 max-w-4xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-12">
            <p className="text-[13px] font-semibold text-primary-400 uppercase tracking-[0.15em] mb-4">Integration</p>
            <h2 className="font-poppins text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
              Three lines to parse.
              <br />
              <span className="text-slate-500">Any language.</span>
            </h2>
            <p className="text-slate-400 max-w-lg mx-auto">
              Send a base64-encoded file. Get structured JSON back. Auto-detects exchanges, normalizes dates, converts formats.
            </p>
          </div>

          {/* Code block */}
          <div className="relative">
            <div className="absolute -inset-px bg-gradient-to-b from-white/8 to-transparent rounded-xl" />
            <div className="relative bg-surface-card rounded-xl border border-white/5 overflow-hidden">
              {/* Tab bar */}
              <div className="flex items-center justify-between border-b border-white/5 px-1">
                <div className="flex">
                  {languages.map((lang, i) => (
                    <button
                      key={lang.name}
                      onClick={() => setActiveTab(i)}
                      className={`px-5 py-3.5 text-[13px] font-medium transition-all relative ${
                        activeTab === i
                          ? 'text-white'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-sm">{lang.icon}</span>
                        {lang.name}
                      </span>
                      {activeTab === i && (
                        <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#635bff] rounded-full" />
                      )}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 mr-2 rounded-md text-[12px] text-slate-500 hover:text-slate-300 hover:bg-white/4 transition-all"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              {/* Code */}
              <div className="p-5 overflow-x-auto">
                <pre className="font-mono text-[13px] leading-[1.75] text-slate-300">
                  <code>{languages[activeTab]?.code}</code>
                </pre>
              </div>
            </div>
          </div>

          {/* Feature chips */}
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            {[
              'Auto-detect exchange',
              'Base64 in, JSON out',
              '4 output formats',
              'Bank PDF support',
              'Structured errors',
            ].map((feature) => (
              <div
                key={feature}
                className="px-4 py-2 rounded-full bg-white/3 border border-white/6 text-[13px] text-slate-400"
              >
                {feature}
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
