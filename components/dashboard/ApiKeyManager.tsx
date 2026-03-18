'use client';

import { useState, useEffect, useCallback } from 'react';
import { Key, Plus, Trash2, Copy, Check, AlertCircle } from 'lucide-react';

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  tier: string;
  isActive: boolean;
  rateLimitRpm: number;
  monthlyQuota: number;
  lastUsedAt: string | null;
  createdAt: string;
}

interface UsageData {
  keyId: string;
  keyName: string;
  tier: string;
  monthlyQuota: number;
  currentMonth: { fileCount: number; requestCount: number };
}

export function ApiKeyManager() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [usage, setUsage] = useState<UsageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const fetchKeys = useCallback(async () => {
    try {
      const [keysRes, usageRes] = await Promise.all([
        fetch('/api/developer/keys'),
        fetch('/api/developer/usage'),
      ]);
      if (keysRes.ok) {
        const data = await keysRes.json();
        setKeys(data.keys || []);
      }
      if (usageRes.ok) {
        const data = await usageRes.json();
        setUsage(data.usage || []);
      }
    } catch {
      setError('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const createKey = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);
    setError(null);

    try {
      const res = await fetch('/api/developer/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create key');
        return;
      }

      setCreatedKey(data.key);
      setNewKeyName('');
      await fetchKeys();
    } catch {
      setError('Failed to create key');
    } finally {
      setCreating(false);
    }
  };

  const revokeKey = async (keyId: string) => {
    try {
      const res = await fetch(`/api/developer/keys/${keyId}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchKeys();
      }
    } catch {
      setError('Failed to revoke key');
    }
  };

  const copyKey = () => {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getUsageForKey = (keyId: string) => usage.find((u) => u.keyId === keyId);

  if (loading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
        <div className="animate-pulse text-gray-400">Loading API keys...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Created key banner */}
      {createdKey && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-emerald-300 text-sm font-medium mb-2">
                API key created. Copy it now — it won&apos;t be shown again.
              </p>
              <div className="flex items-center gap-2">
                <code className="bg-black/30 px-3 py-1.5 rounded text-sm text-emerald-200 font-mono truncate">
                  {createdKey}
                </code>
                <button
                  onClick={copyKey}
                  className="flex-shrink-0 p-1.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 transition-colors"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-emerald-400" />
                  )}
                </button>
              </div>
            </div>
            <button
              onClick={() => setCreatedKey(null)}
              className="text-emerald-400/60 hover:text-emerald-400 text-sm"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Create new key */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h2 className="text-lg font-medium text-white mb-4">Create API Key</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Key name (e.g., Production, Testing)"
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
            onKeyDown={(e) => e.key === 'Enter' && createKey()}
          />
          <button
            onClick={createKey}
            disabled={creating || !newKeyName.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            {creating ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>

      {/* Key list */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="p-6 pb-4">
          <h2 className="text-lg font-medium text-white">Your API Keys</h2>
        </div>

        {keys.length === 0 ? (
          <div className="px-6 pb-6 text-gray-400 text-sm">
            No API keys yet. Create one above to get started.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {keys.map((key) => {
              const keyUsage = getUsageForKey(key.id);
              const usagePercent = keyUsage
                ? Math.min(100, (keyUsage.currentMonth.fileCount / key.monthlyQuota) * 100)
                : 0;

              return (
                <div key={key.id} className="px-6 py-4 flex items-center gap-4">
                  <Key className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium text-sm">{key.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-400 uppercase">
                        {key.tier}
                      </span>
                      {!key.isActive && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                          Revoked
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <code className="text-xs text-gray-500 font-mono">{key.keyPrefix}</code>
                      {keyUsage && (
                        <span className="text-xs text-gray-500">
                          {keyUsage.currentMonth.fileCount} / {key.monthlyQuota} files this month
                        </span>
                      )}
                      {key.lastUsedAt && (
                        <span className="text-xs text-gray-500">
                          Last used {new Date(key.lastUsedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {/* Usage bar */}
                    {keyUsage && (
                      <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden w-48">
                        <div
                          className={`h-full rounded-full transition-all ${
                            usagePercent > 90 ? 'bg-red-500' : usagePercent > 70 ? 'bg-yellow-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${usagePercent}%` }}
                        />
                      </div>
                    )}
                  </div>
                  {key.isActive && (
                    <button
                      onClick={() => revokeKey(key.id)}
                      className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Revoke key"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick start */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h2 className="text-lg font-medium text-white mb-4">Quick Start</h2>
        <pre className="bg-black/30 rounded-lg p-4 text-sm text-gray-300 font-mono overflow-x-auto">
{`curl -X POST https://api.taxformatter.com/v1/parse \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "file_content": "<base64-encoded-file>",
    "filename": "coinbase_2024.csv",
    "output_format": "koinly"
  }'`}
        </pre>
      </div>
    </div>
  );
}
