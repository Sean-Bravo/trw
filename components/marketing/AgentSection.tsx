'use client';

import React from 'react';
import { Container } from '../layout/Container';
import { Bot, ArrowRight, Cpu, MessageSquare, FileText } from 'lucide-react';

const mcpConfig = `{
  "mcpServers": {
    "taxformatter": {
      "command": "npx",
      "args": ["@taxformatter/mcp-server"],
      "env": {
        "TAXFORMATTER_API_KEY": "tf_live_..."
      }
    }
  }
}`;

const tools = [
  {
    name: 'parse_crypto_csv',
    desc: 'Parse any exchange CSV — auto-detects Coinbase, Binance, Kraken, and 11 more. Returns structured transactions in your chosen tax format.',
    icon: FileText,
    accent: 'from-indigo-500/20 to-indigo-500/5',
    border: 'border-indigo-500/10',
    iconColor: 'text-indigo-400',
  },
  {
    name: 'parse_bank_statement',
    desc: 'Extract transactions from bank statement PDFs. Supports Chase, Mercury, Navy Federal, and more. Auto-detects the bank.',
    icon: Cpu,
    accent: 'from-emerald-500/20 to-emerald-500/5',
    border: 'border-emerald-500/10',
    iconColor: 'text-emerald-400',
  },
  {
    name: 'list_supported_sources',
    desc: 'Query all supported crypto exchanges, banks, and output formats. Perfect for building dynamic UIs or agent prompts.',
    icon: MessageSquare,
    accent: 'from-sky-500/20 to-sky-500/5',
    border: 'border-sky-500/10',
    iconColor: 'text-sky-400',
  },
];

export function AgentSection() {
  return (
    <section className="py-28 bg-surface-alt relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 bg-[#635bff]/3 rounded-full blur-[150px]" />
      </div>

      <Container>
        <div className="relative z-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-white/4 border border-white/6">
              <Bot className="w-4 h-4 text-[#635bff]" />
              <span className="text-[13px] font-medium text-slate-400">Model Context Protocol</span>
            </div>
            <h2 className="font-poppins text-3xl md:text-[2.75rem] font-bold text-white mb-5 tracking-tight leading-tight">
              Give your AI agent
              <br />
              <span className="bg-gradient-to-r from-[#635bff] to-[#00d4aa] bg-clip-text text-transparent">
                financial sight.
              </span>
            </h2>
            <p className="text-slate-400 max-w-lg mx-auto text-lg mb-6">
              One install. Your agent can parse crypto CSVs and bank statements without you writing a single line of integration code.
            </p>

            {/* Prominent install command */}
            <div className="inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-surface-card border border-white/8">
              <span className="text-slate-500 text-sm">$</span>
              <code className="text-[15px] font-mono text-emerald-400">npx @taxformatter/mcp-server</code>
              <button
                onClick={() => navigator.clipboard.writeText('npx @taxformatter/mcp-server')}
                className="ml-2 text-slate-500 hover:text-white transition-colors text-xs border border-white/10 rounded px-2 py-1"
              >
                Copy
              </button>
            </div>
            <p className="text-[12px] text-slate-600 mt-3">
              Works with Claude Code, Cursor, Windsurf, and any MCP-compatible client.
            </p>
          </div>

          {/* Two-column: Config + Tools */}
          <div className="grid lg:grid-cols-2 gap-8 items-start max-w-5xl mx-auto">
            {/* Left: MCP Config */}
            <div>
              <div className="mb-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#635bff]/10 border border-[#635bff]/20 flex items-center justify-center">
                  <span className="text-[13px] font-bold text-[#635bff]">1</span>
                </div>
                <h3 className="text-white font-semibold text-lg">Add to your MCP config</h3>
              </div>
              <div className="relative">
                <div className="absolute -inset-px bg-gradient-to-b from-[#635bff]/10 to-transparent rounded-xl" />
                <div className="relative bg-surface-card rounded-xl border border-white/5 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-white/4 bg-white/1.5">
                    <span className="text-[11px] font-mono text-slate-600">claude_desktop_config.json</span>
                  </div>
                  <pre className="p-5 font-mono text-[13px] leading-[1.75] text-slate-300 overflow-x-auto">
                    <code>{mcpConfig}</code>
                  </pre>
                </div>
              </div>
              <div className="mt-6 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <span className="text-[13px] font-bold text-emerald-400">2</span>
                </div>
                <h3 className="text-white font-semibold text-lg">Ask your agent to parse files</h3>
              </div>
              <div className="mt-4 bg-white/2 rounded-xl border border-white/5 p-5">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#635bff] to-[#818cf8] flex items-center justify-center shrink-0">
                    <MessageSquare className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-[13px] text-slate-500 mb-1">You say:</p>
                    <p className="text-[15px] text-slate-200 leading-relaxed">
                      &ldquo;Parse my Coinbase CSV from Downloads and tell me my total capital gains for 2024.&rdquo;
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: 3 Tools */}
            <div className="space-y-4">
              <div className="mb-4">
                <h3 className="text-white font-semibold text-lg">3 MCP tools exposed</h3>
                <p className="text-sm text-slate-500 mt-1">Your agent gets these capabilities automatically.</p>
              </div>
              {tools.map((tool) => (
                <div
                  key={tool.name}
                  className={`group relative bg-gradient-to-br ${tool.accent} rounded-xl border ${tool.border} p-5 transition-all hover:border-white/10`}
                >
                  <div className="flex gap-4">
                    <div className={`w-10 h-10 rounded-lg bg-white/4 border border-white/6 flex items-center justify-center shrink-0`}>
                      <tool.icon className={`w-5 h-5 ${tool.iconColor}`} />
                    </div>
                    <div>
                      <h4 className="font-mono text-[14px] font-semibold text-white mb-1">{tool.name}</h4>
                      <p className="text-[13px] text-slate-400 leading-relaxed">{tool.desc}</p>
                    </div>
                  </div>
                </div>
              ))}

              <a
                href="https://www.npmjs.com/package/@taxformatter/mcp-server"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-2 text-[14px] text-[#635bff] hover:text-[#818cf8] transition-colors font-medium"
              >
                View on npm
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
