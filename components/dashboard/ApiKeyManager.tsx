'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Key, Plus, Trash2, X, Copy, Check, AlertCircle, CheckCircle } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

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
  deactivatedReason: string | null;
  deactivatedAt: string | null;
}

const DOWNGRADE_REASON_PREFIX = 'downgraded_replaced_by:';

function formatDeactivatedDate(iso: string | null): string {
  if (!iso) return 'recently';
  return new Date(iso).toLocaleDateString();
}

interface UsageData {
  keyId: string;
  keyName: string;
  tier: string;
  monthlyQuota: number;
  currentMonth: { fileCount: number; requestCount: number };
}

export function ApiKeyManager() {
  const searchParams = useSearchParams();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [usage, setUsage] = useState<UsageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(false);
  const [showCancelledNotice, setShowCancelledNotice] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Detect Stripe checkout redirects: ?upgraded=true (success) or
  // ?checkout=cancelled (the user backed out). Strip the param either way
  // so a refresh does not re-show the notice.
  useEffect(() => {
    const upgraded = searchParams.get('upgraded') === 'true';
    const cancelled = searchParams.get('checkout') === 'cancelled';
    if (upgraded) setShowUpgradeBanner(true);
    if (cancelled) setShowCancelledNotice(true);
    if (upgraded || cancelled) {
      window.history.replaceState({}, '', '/dashboard/developer');
    }
  }, [searchParams]);

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

  // Auto-subscribe flow: if pending_api_tier cookie exists, redirect to Stripe
  useEffect(() => {
    const match = document.cookie.match(/(?:^|; )pending_api_tier=([^;]+)/);
    if (!match) return;
    const tier = match[1];
    // Clear cookie immediately to prevent re-triggering
    document.cookie = 'pending_api_tier=;path=/;max-age=0';

    const autoSubscribe = async () => {
      try {
        // Start Stripe checkout for the selected tier. The server resolves
        // which key to upgrade (the auto-provisioned free key, or a new one).
        // Creating a key here first collided with the one-free-key cap and
        // 409'd before checkout could start.
        const subRes = await fetch('/api/developer/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tier }),
        });
        const subData = await subRes.json();
        if (!subRes.ok) throw new Error(subData.error);

        if (subData.url) {
          window.location.href = subData.url;
        }
      } catch (err: any) {
        setError(err.message || 'Failed to start checkout');
        fetchKeys(); // Refresh in case the server created a key before failing
      }
    };

    autoSubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const deleteKey = async (keyId: string) => {
    try {
      const res = await fetch(`/api/developer/keys/${keyId}?permanent=true`, { method: 'DELETE' });
      if (res.ok) {
        await fetchKeys();
      }
    } catch {
      setError('Failed to delete key');
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
      <div className="bg-app-raised border border-app-border rounded-xl p-8 text-center">
        <div className="animate-pulse text-app-muted">Loading API keys...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upgrade success banner */}
      {showUpgradeBanner && (
        <div className="bg-app-success-bg border border-app-success/30 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-app-success shrink-0" />
            <p className="text-app-success text-sm font-medium">
              Subscription activated! Your API key has been upgraded.
            </p>
          </div>
          <button
            onClick={() => setShowUpgradeBanner(false)}
            className="text-app-success/60 hover:text-primary-700 text-sm"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Checkout cancelled notice */}
      {showCancelledNotice && (
        <div className="bg-app-warn-bg border border-app-warn/30 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-app-warn shrink-0" />
            <p className="text-app-warn text-sm font-medium">
              Checkout cancelled. No charge was made and your plan is unchanged.
            </p>
          </div>
          <button
            onClick={() => setShowCancelledNotice(false)}
            className="text-app-warn hover:underline text-sm"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Created key banner */}
      {createdKey && (
        <div className="bg-app-success-bg border border-app-success/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-app-success mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-app-success text-sm font-medium mb-2">
                API key created. Copy it now — it won&apos;t be shown again.
              </p>
              <div className="flex items-center gap-2">
                <code className="bg-app-card border border-app-border px-3 py-1.5 rounded text-sm text-app-text font-mono truncate">
                  {createdKey}
                </code>
                <button
                  onClick={copyKey}
                  className="shrink-0 p-1.5 rounded bg-app-success-bg hover:bg-emerald-100 transition-colors"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-app-success" />
                  ) : (
                    <Copy className="w-4 h-4 text-app-success" />
                  )}
                </button>
              </div>
            </div>
            <button
              onClick={() => setCreatedKey(null)}
              className="text-app-success/60 hover:text-primary-700 text-sm"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-app-error-bg border border-app-error/30 rounded-xl p-4 text-app-error text-sm">
          {error}
        </div>
      )}

      {/* Create new key */}
      <div className="bg-app-raised border border-app-border rounded-xl p-6">
        <h2 className="text-lg font-medium text-app-text mb-4">Create API Key</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Key name (e.g., Production, Testing)"
            className="flex-1 bg-app-raised border border-app-border rounded-lg px-4 py-2.5 text-app-text placeholder:text-app-subtle focus:outline-none focus:border-primary-400"
            onKeyDown={(e) => e.key === 'Enter' && createKey()}
          />
          <button
            onClick={createKey}
            disabled={creating || !newKeyName.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            {creating ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>

      {/* Key list */}
      <div className="bg-app-raised border border-app-border rounded-xl overflow-hidden">
        <div className="p-6 pb-4">
          <h2 className="text-lg font-medium text-app-text">Your API Keys</h2>
        </div>

        {keys.length === 0 ? (
          <div className="px-6 pb-6 text-app-muted text-sm">
            No API keys yet. Create one above to get started.
          </div>
        ) : (
          <div className="divide-y divide-app-border">
            {keys.map((key) => {
              const keyUsage = getUsageForKey(key.id);
              const usagePercent = keyUsage
                ? Math.min(100, (keyUsage.currentMonth.fileCount / key.monthlyQuota) * 100)
                : 0;

              return (
                <div key={key.id} className="px-6 py-4 flex items-center gap-4">
                  <Key className="w-5 h-5 text-app-subtle shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-app-text font-medium text-sm">{key.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-app-raised text-app-muted uppercase">
                        {key.tier}
                      </span>
                      {!key.isActive && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-app-error-bg text-app-error">
                          Revoked
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <code className="text-xs text-app-subtle font-mono">{key.keyPrefix}</code>
                      {keyUsage && (
                        <span className="text-xs text-app-subtle">
                          {keyUsage.currentMonth.fileCount} / {key.monthlyQuota} files this month
                        </span>
                      )}
                      {key.lastUsedAt && (
                        <span className="text-xs text-app-subtle">
                          Last used {new Date(key.lastUsedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {/* D6: explain Stripe-driven deactivation. Generic deactivation
                        leaves deactivatedReason NULL and renders nothing. */}
                    {key.deactivatedReason?.startsWith(DOWNGRADE_REASON_PREFIX) && (() => {
                      const replacingId = key.deactivatedReason.slice(DOWNGRADE_REASON_PREFIX.length);
                      const replacingKey = keys.find((k) => k.id === replacingId);
                      return (
                        <p className="text-xs text-app-subtle mt-1">
                          Deactivated {formatDeactivatedDate(key.deactivatedAt)} when{' '}
                          <span className="font-medium text-app-muted">
                            {replacingKey?.name ?? 'a paid key'}
                          </span>{' '}
                          was downgraded to Free.
                        </p>
                      );
                    })()}
                    {/* Usage bar */}
                    {keyUsage && (
                      <div className="mt-2 h-1.5 bg-app-raised rounded-full overflow-hidden w-48">
                        <div
                          className={`h-full rounded-full transition-all ${
                            usagePercent > 90 ? 'bg-red-500' : usagePercent > 70 ? 'bg-yellow-500' : 'bg-primary-500'
                          }`}
                          style={{ width: `${usagePercent}%` }}
                        />
                      </div>
                    )}
                  </div>
                  {key.isActive ? (
                    <button
                      onClick={() => revokeKey(key.id)}
                      className="p-2 text-app-subtle hover:text-app-error hover:bg-app-error-bg rounded-lg transition-colors"
                      title="Revoke key"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(key.id)}
                      className="p-2 text-app-subtle hover:text-app-error hover:bg-app-error-bg rounded-lg transition-colors"
                      title="Delete permanently"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick start */}
      <div className="bg-app-raised border border-app-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-app-text">Quick Start</h2>
          <a
            href="/docs/api"
            className="text-sm text-primary-600 hover:text-primary-700 transition-colors"
          >
            Full API docs →
          </a>
        </div>
        <pre className="bg-black/30 rounded-lg p-4 text-sm text-app-text font-mono overflow-x-auto">
{`curl -X POST https://api.taxformatter.com/v1/parse \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "file_content": "<base64-encoded-file>",
    "filename": "coinbase_2024.csv",
    "output_format": "koinly"
  }'`}
        </pre>
        <p className="text-xs text-app-subtle mt-3">
          Replace <code className="text-app-muted">YOUR_API_KEY</code> with the key you created above.
        </p>
      </div>

      <ConfirmDialog
        isOpen={confirmDeleteId !== null}
        onConfirm={() => { if (confirmDeleteId) deleteKey(confirmDeleteId); setConfirmDeleteId(null); }}
        onCancel={() => setConfirmDeleteId(null)}
        title="Delete API key?"
        description="This will permanently remove this key. This action cannot be undone."
        confirmLabel="Delete"
      />
    </div>
  );
}
