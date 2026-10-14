import { ArrowRight, FileSpreadsheet, FileText, Table2 } from 'lucide-react';

/**
 * Before/after example for the bank landing page: what the visitor has
 * (a statement PDF), what we pull out of it (one row per transaction), and
 * what they download (a file their spreadsheet or accounting app opens).
 * Static and synthetic — the rows are the same mock Chase statement the
 * upload box's hint has always shown; no real statement is ever rendered.
 */

const STATEMENT_LINES = [
  '01/03   PAYROLL DEPOSIT            +3,200.00',
  '01/05   WHOLE FOODS #10092            -87.43',
  '01/07   TRANSFER TO SAVINGS          -500.00',
  '01/09   NETFLIX.COM                   -15.49',
];

const EXTRACTED_ROWS: Array<[string, string, string, string]> = [
  ['2025-01-03', 'PAYROLL DEPOSIT', '3,200.00', '4,112.18'],
  ['2025-01-05', 'WHOLE FOODS #10092', '-87.43', '4,024.75'],
  ['2025-01-07', 'TRANSFER TO SAVINGS', '-500.00', '3,524.75'],
  ['2025-01-09', 'NETFLIX.COM', '-15.49', '3,509.26'],
];

export const OUTCOMES = [
  {
    title: 'Automatic extraction',
    desc: 'Every transaction on every page is read for you. No retyping, no copy-and-paste from a PDF.',
  },
  {
    title: 'A clean spreadsheet',
    desc: 'One transaction per row with the date, description, amount and running balance in their own columns.',
  },
  {
    title: 'No manual data entry',
    desc: 'Open it in Excel, or import it into QuickBooks or Xero, and the numbers are already where they belong.',
  },
];

export function BankBeforeAfter() {
  return (
    <section className="max-w-5xl mx-auto px-4 pb-16" aria-labelledby="before-after-heading">
      <h2 id="before-after-heading" className="text-center text-xs font-medium text-slate-500 uppercase tracking-widest mb-6">
        From statement to spreadsheet
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] items-stretch gap-3">
        {/* Before: the PDF */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center gap-2 mb-3 text-xs font-medium text-slate-400">
            <FileText className="w-4 h-4 text-primary-400" />
            Your statement PDF
          </div>
          <div className="font-mono text-[11px] text-slate-500 leading-relaxed bg-slate-950/60 rounded-lg px-3 py-2.5 border border-slate-800/60">
            <div className="text-slate-400 mb-1.5">Chase Checking ····4829 · Jan 1 – Jan 31, 2025</div>
            {STATEMENT_LINES.map((line) => (
              <div key={line} className="whitespace-pre">{line}</div>
            ))}
            <div className="text-slate-700">…</div>
          </div>
        </div>

        <ArrowRight className="hidden md:block w-5 h-5 text-slate-600 self-center" aria-hidden="true" />

        {/* During: the extracted table */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center gap-2 mb-3 text-xs font-medium text-slate-400">
            <Table2 className="w-4 h-4 text-primary-400" />
            Every transaction, found
          </div>
          <table className="w-full text-[11px] font-mono text-slate-400">
            <thead>
              <tr className="text-slate-500 border-b border-slate-800">
                <th className="text-left font-medium pb-1.5">Date</th>
                <th className="text-left font-medium pb-1.5">Description</th>
                <th className="text-right font-medium pb-1.5">Amount</th>
              </tr>
            </thead>
            <tbody>
              {EXTRACTED_ROWS.map(([date, desc, amount]) => (
                <tr key={date + desc} className="border-b border-slate-800/50">
                  <td className="py-1.5 pr-2 whitespace-nowrap">{date}</td>
                  <td className="py-1.5 pr-2 truncate max-w-[9rem]">{desc}</td>
                  <td className={`py-1.5 text-right whitespace-nowrap ${amount.startsWith('-') ? 'text-red-400/80' : 'text-accent-400'}`}>
                    {amount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ArrowRight className="hidden md:block w-5 h-5 text-slate-600 self-center" aria-hidden="true" />

        {/* After: the file */}
        <div className="rounded-xl border border-accent-500/20 bg-accent-500/5 p-5">
          <div className="flex items-center gap-2 mb-3 text-xs font-medium text-slate-400">
            <FileSpreadsheet className="w-4 h-4 text-accent-400" />
            Your spreadsheet
          </div>
          <div className="font-mono text-[11px] text-slate-400 leading-relaxed bg-slate-950/60 rounded-lg px-3 py-2.5 border border-slate-800/60">
            <div className="text-slate-500">Date,Description,Amount,Balance</div>
            {EXTRACTED_ROWS.map(([date, desc, amount, balance]) => (
              <div key={date + desc} className="whitespace-nowrap overflow-hidden text-ellipsis">
                {date},{desc},{amount.replace(',', '')},{balance.replace(',', '')}
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {['CSV', 'Excel', 'QuickBooks', 'Xero'].map((name) => (
              <span key={name} className="rounded-md border border-accent-500/15 bg-accent-500/10 px-2 py-0.5 text-[11px] text-accent-400 font-medium">
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Three outcomes */}
      <ul className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {OUTCOMES.map((o) => (
          <li key={o.title} className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <h3 className="text-sm font-semibold mb-1.5">{o.title}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{o.desc}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
