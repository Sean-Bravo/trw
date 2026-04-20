'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Copy, Terminal } from 'lucide-react';
import type { BankOutputFormat } from '@/lib/bank-upload-client';

interface ApiEquivalentPanelProps {
  detectedBank: string;
  transactionCount: number;
  outputFormat: BankOutputFormat;
  filename: string;
}

type Lang = 'curl' | 'node' | 'python';

const LANG_LABELS: Record<Lang, string> = {
  curl: 'cURL',
  node: 'Node.js',
  python: 'Python',
};

function buildSnippets(filename: string, outputFormat: BankOutputFormat): Record<Lang, string> {
  return {
    curl: `curl -X POST https://api.taxformatter.com/v1/parse \\
  -H "X-API-Key: tf_live_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "file_content": "'$(base64 -i ${filename})'",
    "filename": "${filename}",
    "output_format": "${outputFormat}"
  }'`,
    node: `import { readFileSync } from "fs";

const file = readFileSync("${filename}");
const res = await fetch("https://api.taxformatter.com/v1/parse", {
  method: "POST",
  headers: {
    "X-API-Key": "tf_live_your_key_here",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    file_content: file.toString("base64"),
    filename: "${filename}",
    output_format: "${outputFormat}",
  }),
});

const data = await res.json();
console.log(data.summary);`,
    python: `import requests, base64

with open("${filename}", "rb") as f:
    encoded = base64.b64encode(f.read()).decode()

response = requests.post(
    "https://api.taxformatter.com/v1/parse",
    headers={"X-API-Key": "tf_live_your_key_here"},
    json={
        "file_content": encoded,
        "filename": "${filename}",
        "output_format": "${outputFormat}",
    },
)

data = response.json()
print(data["summary"])`,
  };
}

function buildResponseJson(
  detectedBank: string,
  transactionCount: number,
  outputFormat: BankOutputFormat,
): string {
  const bankSlug = detectedBank.toLowerCase().replace(/\s+/g, '_');
  const summary = `Parsed ${transactionCount} ${detectedBank} transactions.`;

  return `{
  "status": "success",
  "summary": "${summary}",
  "detected_source": "${bankSlug}",
  "source_type": "bank_statement",
  "output_format": "${outputFormat}",
  "transactions": [ /* ... ${transactionCount} transactions */ ],
  "warnings": [],
  "metadata": {
    "transaction_count": ${transactionCount},
    "api_version": "2026-03-01"
  }
}`;
}

export function ApiEquivalentPanel({
  detectedBank,
  transactionCount,
  outputFormat,
  filename,
}: ApiEquivalentPanelProps) {
  const [activeLang, setActiveLang] = useState<Lang>('curl');
  const [copied, setCopied] = useState(false);

  const snippets = buildSnippets(filename, outputFormat);
  const activeSnippet = snippets[activeLang];
  const responseJson = buildResponseJson(detectedBank, transactionCount, outputFormat);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(activeSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-5 text-left">
      <div className="mb-3 flex items-center gap-2">
        <Terminal className="w-4 h-4 text-primary-400" />
        <h4 className="text-sm font-semibold text-slate-200">
          This is how you&apos;d call it programmatically
        </h4>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {/* Request card */}
        <div className="rounded-xl border border-white/5 bg-[#111b2e] overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/5 pl-1 pr-2">
            <div className="flex">
              {(Object.keys(LANG_LABELS) as Lang[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setActiveLang(lang)}
                  className={`relative px-3 py-2.5 text-[11px] font-medium transition-colors ${
                    activeLang === lang
                      ? 'text-white'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {LANG_LABELS[lang]}
                  {activeLang === lang && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-primary-500" />
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200"
              aria-label="Copy request snippet"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-accent-400" />
                  <span className="text-accent-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <pre className="overflow-x-auto p-4 font-mono text-[11px] leading-relaxed text-slate-300">
            <code>{activeSnippet}</code>
          </pre>
        </div>

        {/* Response card */}
        <div className="rounded-xl border border-white/5 bg-[#111b2e] overflow-hidden">
          <div className="flex items-center gap-2 border-b border-white/5 px-3 py-2.5">
            <span className="h-2 w-2 rounded-full bg-accent-500" />
            <span className="text-[11px] font-medium text-slate-400">
              Response · 200 OK
            </span>
          </div>
          <pre className="overflow-x-auto p-4 font-mono text-[11px] leading-relaxed text-slate-300">
            <code>{responseJson}</code>
          </pre>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-xs">
        <span className="text-slate-500">
          Synthesized from this parse — same shape the public API returns.
        </span>
        <Link
          href="/signup"
          className="inline-flex shrink-0 items-center gap-1.5 font-medium text-primary-400 transition-colors hover:text-primary-300"
        >
          Get your free API key
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
