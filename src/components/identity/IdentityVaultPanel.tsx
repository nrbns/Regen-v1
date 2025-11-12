import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Lock, LockOpen, Plus, RefreshCw, ShieldCheck, Sparkles, Trash2, KeyRound, Copy, ShieldAlert } from 'lucide-react';
import { useIdentityStore } from '../../state/identityStore';
import type { IdentityCredential } from '../../types/identity';

function normalizeDomain(input: string): string {
  if (!input) return '';
  try {
    const url = input.includes('://') ? new URL(input) : new URL(`https://${input}`);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return input.trim();
  }
}

export function IdentityVaultPanel() {
  const { status, credentials, loading, error, unlock, lock, refresh, addCredential, removeCredential, revealCredential, setError, revealingId } =
    useIdentityStore();
  const [passphrase, setPassphrase] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [showSecretId, setShowSecretId] = useState<string | null>(null);
  const [secretCache, setSecretCache] = useState<Record<string, string>>({});
  const [addMode, setAddMode] = useState(false);
  const [formDomain, setFormDomain] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formSecret, setFormSecret] = useState('');
  const [formHint, setFormHint] = useState('');
  const [formTags, setFormTags] = useState('');
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const vaultStatus = status?.status ?? 'uninitialized';
  const canSubmitCredential = formDomain.trim() && formUsername.trim() && formSecret.trim();
  const totalCredentials = status?.totalCredentials ?? credentials.length;

  const handleUnlock = async () => {
    if (!passphrase.trim()) {
      setError('Passphrase required to unlock the vault.');
      return;
    }
    try {
      await unlock(passphrase.trim());
      setPassphrase('');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlock vault');
    }
  };

  const handleAddCredential = async () => {
    if (!canSubmitCredential) return;
    try {
      await addCredential({
        domain: normalizeDomain(formDomain),
        username: formUsername.trim(),
        secret: formSecret,
        secretHint: formHint.trim() || undefined,
        tags: formTags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      });
      setAddMode(false);
      setFormDomain('');
      setFormUsername('');
      setFormSecret('');
      setFormHint('');
      setFormTags('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to store credential');
    }
  };

  const handleReveal = async (credential: IdentityCredential) => {
    if (showSecretId === credential.id && secretCache[credential.id]) {
      setShowSecretId(null);
      return;
    }
    try {
      const revealed = await revealCredential(credential.id);
      if (revealed) {
        setSecretCache((prev) => ({ ...prev, [credential.id]: revealed.secret }));
        setShowSecretId(credential.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reveal secret');
    }
  };

  const handleCopy = async (credentialId: string) => {
    const secret = secretCache[credentialId];
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setCopyStatus('Secret copied to clipboard');
      setTimeout(() => setCopyStatus(null), 3000);
    } catch {
      setCopyStatus('Failed to copy secret. Check clipboard permissions.');
      setTimeout(() => setCopyStatus(null), 4000);
    }
  };

  const statistics = useMemo(() => {
    const recent = credentials.filter((cred) => {
      if (!cred.lastUsedAt) return false;
      return Date.now() - cred.lastUsedAt < 7 * 24 * 60 * 60 * 1000;
    }).length;
    const tagged = credentials.filter((cred) => cred.tags && cred.tags.length > 0).length;
    return {
      recent,
      tagged,
    };
  }, [credentials]);

  return (
    <div className="space-y-4 text-sm text-slate-200">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
            <KeyRound size={14} className="text-emerald-300" />
            Redix Identity Vault
          </div>
          <div className="mt-1 text-base font-semibold text-gray-100">Zero-knowledge credential guardian</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-900/70 px-3 py-2 text-[11px] font-semibold text-slate-200 transition-colors hover:bg-slate-900/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Sync vault
          </button>
          {vaultStatus === 'unlocked' ? (
            <button
              type="button"
              onClick={() => void lock()}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-[11px] font-semibold text-rose-200 transition-colors hover:bg-rose-500/20"
            >
              <Lock size={13} />
              Lock
            </button>
          ) : null}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-100 flex items-center gap-2">
          <ShieldAlert size={14} />
          <span>{error}</span>
        </div>
      )}

      {copyStatus && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100 flex items-center gap-2">
          <Sparkles size={14} />
          <span>{copyStatus}</span>
        </div>
      )}

      {vaultStatus !== 'unlocked' && (
        <div className="rounded-3xl border border-slate-800/60 bg-slate-900/70 p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs text-slate-400 uppercase tracking-wide">
            {vaultStatus === 'locked' ? <Lock size={14} /> : <LockOpen size={14} />}
            {vaultStatus === 'uninitialized' ? 'Create master passphrase' : 'Unlock vault'}
          </div>
          <p className="text-[13px] text-slate-400 leading-relaxed">
            {vaultStatus === 'uninitialized'
              ? 'Set a strong passphrase (stored nowhere) to encrypt credentials with AES-256 and PBKDF2 derived keys.'
              : 'Enter your passphrase to decrypt the local vault. Secrets remain encrypted at rest with zero telemetry.'}
          </p>
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-wide text-slate-500">
              Passphrase
              <div className="mt-1 flex items-center gap-2">
                <input
                  type={showPassphrase ? 'text' : 'password'}
                  value={passphrase}
                  className="flex-1 rounded-lg border border-slate-800/70 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500/50 focus:outline-none"
                  onChange={(event) => setPassphrase(event.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassphrase((prev) => !prev)}
                  className="rounded-lg border border-slate-700/60 bg-slate-900/70 p-2 text-slate-300 hover:bg-slate-900/90"
                >
                  {showPassphrase ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </label>
          </div>
          <button
            type="button"
            onClick={() => void handleUnlock()}
            disabled={loading || passphrase.length < 8}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ShieldCheck size={14} />
            {vaultStatus === 'uninitialized' ? 'Create & unlock' : 'Unlock vault'}
          </button>
        </div>
      )}

      {vaultStatus === 'unlocked' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-800/60 bg-slate-900/70 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500">Total logins</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-semibold text-gray-100">{totalCredentials}</span>
                <span className="text-[11px] text-slate-500">entries protected</span>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-800/60 bg-slate-900/70 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500">Tagged identities</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-semibold text-gray-100">{statistics.tagged}</span>
                <span className="text-[11px] text-slate-500">with risk labels</span>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-800/60 bg-slate-900/70 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500">Recent usage</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-semibold text-gray-100">{statistics.recent}</span>
                <span className="text-[11px] text-slate-500">accessed last 7 days</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-400 uppercase tracking-wide">Stored credentials</div>
            <button
              type="button"
              onClick={() => setAddMode((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-900/70 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-900/90"
            >
              <Plus size={13} />
              {addMode ? 'Cancel' : 'Add credential'}
            </button>
          </div>

          <AnimatePresence>
            {addMode && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-3"
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className="text-[11px] uppercase tracking-wide text-slate-500">
                    Domain
                    <input
                      value={formDomain}
                      onChange={(event) => setFormDomain(event.target.value)}
                      placeholder="e.g. accounts.example.com"
                      className="mt-1 w-full rounded-lg border border-slate-800/70 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500/50 focus:outline-none"
                    />
                  </label>
                  <label className="text-[11px] uppercase tracking-wide text-slate-500">
                    Username / ID
                    <input
                      value={formUsername}
                      onChange={(event) => setFormUsername(event.target.value)}
                      placeholder="your email or handle"
                      className="mt-1 w-full rounded-lg border border-slate-800/70 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500/50 focus:outline-none"
                    />
                  </label>
                </div>
                <label className="text-[11px] uppercase tracking-wide text-slate-500 block">
                  Secret / Password
                  <input
                    type="text"
                    value={formSecret}
                    onChange={(event) => setFormSecret(event.target.value)}
                    placeholder="••••••••••••"
                    className="mt-1 w-full rounded-lg border border-slate-800/70 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500/50 focus:outline-none"
                  />
                </label>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className="text-[11px] uppercase tracking-wide text-slate-500">
                    Secret hint (optional)
                    <input
                      value={formHint}
                      onChange={(event) => setFormHint(event.target.value)}
                      placeholder="Only you know this clue"
                      className="mt-1 w-full rounded-lg border border-slate-800/70 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500/50 focus:outline-none"
                    />
                  </label>
                  <label className="text-[11px] uppercase tracking-wide text-slate-500">
                    Tags (comma-separated)
                    <input
                      value={formTags}
                      onChange={(event) => setFormTags(event.target.value)}
                      placeholder="finance, production, high-risk"
                      className="mt-1 w-full rounded-lg border border-slate-800/70 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500/50 focus:outline-none"
                    />
                  </label>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => void handleAddCredential()}
                    disabled={!canSubmitCredential || loading}
                    className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Sparkles size={13} />
                    Save credential
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-3">
            {credentials.length === 0 ? (
              <div className="rounded-3xl border border-slate-800/60 bg-slate-900/70 px-4 py-6 text-center text-sm text-slate-400">
                No stored credentials yet. Add your first login to activate Redix Identity AI protections.
              </div>
            ) : (
              <div className="space-y-2">
                {credentials
                  .slice()
                  .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
                  .map((credential) => {
                    const isRevealed = showSecretId === credential.id && secretCache[credential.id];
                    const secret = secretCache[credential.id];
                    return (
                      <div key={credential.id} className="rounded-3xl border border-slate-800/60 bg-slate-900/70 p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-100">
                              <span>{credential.domain}</span>
                              {credential.tags && credential.tags.length > 0 && (
                                <span className="text-[10px] uppercase tracking-wide text-emerald-300">
                                  {credential.tags.slice(0, 2).join(', ')}
                                  {credential.tags.length > 2 ? '…' : ''}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400">
                              {credential.username} · updated{' '}
                              {credential.updatedAt
                                ? new Date(credential.updatedAt).toLocaleString()
                                : 'unknown'}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <button
                              type="button"
                              onClick={() => void handleReveal(credential)}
                              disabled={revealingId === credential.id}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-700/60 bg-slate-900/70 px-2.5 py-1 text-[11px] font-medium text-slate-200 hover:bg-slate-900/90 disabled:cursor-wait disabled:opacity-60"
                            >
                              {isRevealed ? <EyeOff size={12} /> : <Eye size={12} />}
                              {isRevealed ? 'Hide' : 'Reveal'}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleCopy(credential.id)}
                              disabled={!secret}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-700/60 bg-slate-900/70 px-2.5 py-1 text-[11px] font-medium text-slate-200 hover:bg-slate-900/90 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Copy size={12} />
                              Copy
                            </button>
                            <button
                              type="button"
                              onClick={() => void removeCredential(credential.id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-[11px] font-medium text-rose-200 hover:bg-rose-500/20"
                            >
                              <Trash2 size={12} />
                              Remove
                            </button>
                          </div>
                        </div>
                        {credential.secretHint && (
                          <div className="mt-2 text-[11px] text-slate-400">Hint: {credential.secretHint}</div>
                        )}
                        {isRevealed && secret && (
                          <div className="mt-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-[12px] text-emerald-100 font-semibold tracking-wide">
                            {secret}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

