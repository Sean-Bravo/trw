'use client';

import { useMemo, useState } from 'react';
import { FileText, KeyRound, Play, Upload } from 'lucide-react';

export interface PlaygroundRequestPayload {
  file_content: string;
  filename: string;
  output_format: string;
  api_key?: string;
}

interface PlaygroundRequestBuilderProps {
  onSend: (payload: PlaygroundRequestPayload) => void;
  disabled?: boolean;
}

type KeyMode = 'demo' | 'byok';
type FileSource = 'sample' | 'upload';

interface Sample {
  id: string;
  label: string;
  path: string;
  filename: string;
  defaultFormat: string;
}

const SAMPLES: Sample[] = [
  {
    id: 'coinbase',
    label: 'Coinbase export (9 transactions)',
    path: '/samples/sample-before-coinbase.csv',
    filename: 'sample-before-coinbase.csv',
    defaultFormat: 'koinly',
  },
];

const OUTPUT_FORMATS = [
  { value: 'koinly', label: 'Koinly' },
  { value: 'turbotax', label: 'TurboTax' },
  { value: 'coinledger', label: 'CoinLedger' },
  { value: 'zenledger', label: 'ZenLedger' },
];

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

async function fetchSampleAsBase64(path: string): Promise<string> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Sample fetch failed: ${res.status}`);
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

function buildCurlPreview(args: {
  filename: string;
  outputFormat: string;
  keyDisplay: string;
}): string {
  return `curl -X POST https://api.taxformatter.com/v1/parse \\
  -H "X-API-Key: ${args.keyDisplay}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "file_content": "'$(base64 -i ${args.filename})'",
    "filename": "${args.filename}",
    "output_format": "${args.outputFormat}"
  }'`;
}

export function PlaygroundRequestBuilder({ onSend, disabled = false }: PlaygroundRequestBuilderProps) {
  const [keyMode, setKeyMode] = useState<KeyMode>('demo');
  const [byokKey, setByokKey] = useState('');
  const [fileSource, setFileSource] = useState<FileSource>('sample');
  const [selectedSampleId, setSelectedSampleId] = useState<string>(SAMPLES[0]!.id);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [outputFormat, setOutputFormat] = useState<string>(SAMPLES[0]!.defaultFormat);
  const [localError, setLocalError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);

  const selectedSample = useMemo(
    () => SAMPLES.find((s) => s.id === selectedSampleId) ?? SAMPLES[0]!,
    [selectedSampleId],
  );

  const activeFilename =
    fileSource === 'sample' ? selectedSample.filename : uploadedFile?.name ?? 'your_file.csv';
  const keyDisplay = keyMode === 'byok' && byokKey.trim() ? byokKey.trim() : 'tf_demo_********';

  const curlPreview = buildCurlPreview({
    filename: activeFilename,
    outputFormat,
    keyDisplay,
  });

  const canSend =
    !disabled &&
    !preparing &&
    (fileSource === 'sample' || uploadedFile !== null) &&
    (keyMode === 'demo' || byokKey.trim().length > 0);

  const handleSend = async () => {
    setLocalError(null);
    if (!canSend) return;
    setPreparing(true);
    try {
      let file_content: string;
      let filename: string;
      if (fileSource === 'sample') {
        file_content = await fetchSampleAsBase64(selectedSample.path);
        filename = selectedSample.filename;
      } else {
        if (!uploadedFile) return;
        if (uploadedFile.size > 1_000_000) {
          setLocalError('File is over 1 MB — the playground caps uploads at 1 MB. Use the full API for larger files.');
          setPreparing(false);
          return;
        }
        file_content = await fileToBase64(uploadedFile);
        filename = uploadedFile.name;
      }

      const payload: PlaygroundRequestPayload = {
        file_content,
        filename,
        output_format: outputFormat,
      };
      if (keyMode === 'byok' && byokKey.trim()) {
        payload.api_key = byokKey.trim();
      }
      onSend(payload);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to prepare request.');
    } finally {
      setPreparing(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Key mode */}
      <section className="rounded-xl border border-white/10 bg-slate-800 p-4">
        <div className="flex items-center gap-2 mb-3">
          <KeyRound className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-medium text-slate-300">Authentication</h3>
        </div>
        <div className="flex gap-2 mb-3">
          {(['demo', 'byok'] as KeyMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setKeyMode(mode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                keyMode === mode
                  ? 'bg-primary-500/20 text-primary-300 border border-primary-500/40'
                  : 'bg-slate-700/60 text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              {mode === 'demo' ? 'Use demo key' : 'Use my key'}
            </button>
          ))}
        </div>
        {keyMode === 'demo' ? (
          <p className="text-[11px] text-slate-400 leading-relaxed">
            A shared rate-limited demo key is attached server-side — you don&apos;t see it.
            Quota is daily and global; paste your own key for unrestricted use.
          </p>
        ) : (
          <input
            type="password"
            value={byokKey}
            onChange={(e) => setByokKey(e.target.value)}
            placeholder="tf_live_..."
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-lg bg-slate-950/60 border border-slate-700 px-3 py-2 text-sm font-mono text-slate-200 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none"
          />
        )}
      </section>

      {/* File source */}
      <section className="rounded-xl border border-white/10 bg-slate-800 p-4">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-medium text-slate-300">Input file</h3>
        </div>
        <div className="flex gap-2 mb-3">
          {(['sample', 'upload'] as FileSource[]).map((source) => (
            <button
              key={source}
              onClick={() => setFileSource(source)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                fileSource === source
                  ? 'bg-primary-500/20 text-primary-300 border border-primary-500/40'
                  : 'bg-slate-700/60 text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              {source === 'sample' ? 'Try a sample' : 'Upload your own'}
            </button>
          ))}
        </div>

        {fileSource === 'sample' ? (
          <select
            value={selectedSampleId}
            onChange={(e) => {
              const next = SAMPLES.find((s) => s.id === e.target.value);
              if (next) {
                setSelectedSampleId(next.id);
                setOutputFormat(next.defaultFormat);
              }
            }}
            className="w-full rounded-lg bg-slate-950/60 border border-slate-700 px-3 py-2 text-sm text-slate-200 focus:border-primary-500 focus:outline-none"
          >
            {SAMPLES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        ) : (
          <label className="flex items-center gap-3 rounded-lg border border-dashed border-slate-700 bg-slate-950/40 px-3 py-3 cursor-pointer hover:border-primary-500/50 transition-colors">
            <Upload className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-400 truncate">
              {uploadedFile ? uploadedFile.name : 'Choose a CSV, XLSX, or PDF (≤1 MB)'}
            </span>
            <input
              type="file"
              accept=".csv,.xlsx,.pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setUploadedFile(file);
                  setLocalError(null);
                }
              }}
            />
          </label>
        )}
      </section>

      {/* Output format */}
      <section className="rounded-xl border border-white/10 bg-slate-800 p-4">
        <h3 className="text-sm font-medium text-slate-300 mb-3">Output format</h3>
        <div className="grid grid-cols-2 gap-2">
          {OUTPUT_FORMATS.map((fmt) => (
            <button
              key={fmt.value}
              onClick={() => setOutputFormat(fmt.value)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                outputFormat === fmt.value
                  ? 'bg-primary-500/20 text-primary-300 border border-primary-500/40'
                  : 'bg-slate-700/60 text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              {fmt.label}
            </button>
          ))}
        </div>
      </section>

      {/* Live curl preview */}
      <section className="rounded-xl border border-white/10 bg-slate-800 overflow-hidden">
        <div className="border-b border-white/10 px-4 py-2.5">
          <span className="text-xs font-medium text-slate-400">cURL preview</span>
        </div>
        <pre className="p-3 overflow-x-auto text-[11px] leading-relaxed text-slate-400 font-mono">
          <code>{curlPreview}</code>
        </pre>
      </section>

      {localError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {localError}
        </div>
      )}

      <button
        onClick={handleSend}
        disabled={!canSend}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-500/20 hover:bg-primary-600 disabled:bg-slate-700 disabled:text-slate-500 disabled:shadow-none transition-colors"
      >
        <Play className="w-4 h-4" />
        {preparing ? 'Preparing…' : disabled ? 'Sending…' : 'Send request'}
      </button>
    </div>
  );
}
