/**
 * Beta Program Signup Component
 * For early access and paid beta testing
 */

import React, { useState } from 'react';
import { Mail, CheckCircle, X, Loader2 } from 'lucide-react';
import { paymentService } from '../../services/monetization/paymentService';

interface SignupForm {
  email: string;
  name: string;
  tier: 'free' | 'supporter' | 'premium';
  feedback: string;
}

export function BetaSignup({ onComplete }: { onComplete?: () => void }) {
  const [form, setForm] = useState<SignupForm>({
    email: '',
    name: '',
    tier: 'free',
    feedback: '',
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Store signup in localStorage (in production, send to backend)
      const signups = JSON.parse(localStorage.getItem('regen:beta:signups') || '[]');
      signups.push({
        ...form,
        timestamp: Date.now(),
        version: '1.0.0',
      });
      localStorage.setItem('regen:beta:signups', JSON.stringify(signups));

      // If premium tier, redirect to payment
      if (form.tier !== 'free') {
        if (form.tier === 'premium') {
          // Redirect to GitHub Sponsors or payment
          await paymentService.subscribeGitHubSponsors('premium');
        } else {
          await paymentService.subscribeGitHubSponsors('supporter');
        }
      }

      setSubmitted(true);
      setTimeout(() => {
        onComplete?.();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-lg border border-[var(--color-success-500)]/20 bg-[var(--color-success-500)]/10 p-6 text-center">
        <CheckCircle className="mx-auto mb-4 h-12 w-12 text-[var(--color-success-500)]" />
        <h3 className="mb-2 text-lg font-semibold text-[var(--text-primary)]">Thank You!</h3>
        <p className="text-sm text-[var(--text-secondary)]">
          You've been added to the beta program. We'll send updates to {form.email}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Email</label>
        <input
          type="email"
          required
          value={form.email}
          onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
          className="w-full rounded-lg border border-[var(--surface-border)] bg-[var(--surface-hover)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--color-primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/20 transition-all"
          placeholder="your@email.com"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Name (optional)</label>
        <input
          type="text"
          value={form.name}
          onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
          className="w-full rounded-lg border border-[var(--surface-border)] bg-[var(--surface-hover)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--color-primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/20 transition-all"
          placeholder="Your name"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Beta Tier</label>
        <div className="space-y-2">
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-hover)] p-3 transition-all hover:bg-[var(--surface-active)] hover:border-[var(--surface-border-strong)]">
            <input
              type="radio"
              name="tier"
              value="free"
              checked={form.tier === 'free'}
              onChange={e => setForm(prev => ({ ...prev, tier: e.target.value as any }))}
              className="h-4 w-4 text-[var(--color-primary-500)]"
            />
            <div className="flex-1">
              <div className="font-medium text-[var(--text-primary)]">Free Beta</div>
              <div className="text-xs text-[var(--text-muted)]">Early access, community support</div>
            </div>
          </label>

          <label className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all ${
            form.tier === 'supporter'
              ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-500)]/10 hover:bg-[var(--color-primary-500)]/15'
              : 'border-[var(--surface-border)] bg-[var(--surface-hover)] hover:bg-[var(--surface-active)] hover:border-[var(--surface-border-strong)]'
          }`}>
            <input
              type="radio"
              name="tier"
              value="supporter"
              checked={form.tier === 'supporter'}
              onChange={e => setForm(prev => ({ ...prev, tier: e.target.value as any }))}
              className="h-4 w-4 text-[var(--color-primary-500)]"
            />
            <div className="flex-1">
              <div className="font-medium text-[var(--text-primary)]">Supporter ($5/month)</div>
              <div className="text-xs text-[var(--text-muted)]">GitHub badge, priority support</div>
            </div>
          </label>

          <label className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all ${
            form.tier === 'premium'
              ? 'border-purple-500/50 bg-purple-500/10 hover:bg-purple-500/15'
              : 'border-[var(--surface-border)] bg-[var(--surface-hover)] hover:bg-[var(--surface-active)] hover:border-[var(--surface-border-strong)]'
          }`}>
            <input
              type="radio"
              name="tier"
              value="premium"
              checked={form.tier === 'premium'}
              onChange={e => setForm(prev => ({ ...prev, tier: e.target.value as any }))}
              className="h-4 w-4 text-[var(--color-primary-500)]"
            />
            <div className="flex-1">
              <div className="font-medium text-[var(--text-primary)]">Premium ($10/month)</div>
              <div className="text-xs text-[var(--text-muted)]">Advanced AI, cloud sync, custom patterns</div>
            </div>
          </label>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
          Feedback (optional)
        </label>
        <textarea
          value={form.feedback}
          onChange={e => setForm(prev => ({ ...prev, feedback: e.target.value }))}
          rows={3}
          className="w-full rounded-lg border border-[var(--surface-border)] bg-[var(--surface-hover)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--color-primary-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]/20 transition-all resize-none"
          placeholder="What features are you most excited about?"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-[var(--color-error-500)]/10 border border-[var(--color-error-500)]/20 p-3 text-sm text-[var(--color-error-500)]">
          <X className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-primary-500)] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[var(--color-primary-600)] hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <Mail className="h-4 w-4" />
            Join Beta Program
          </>
        )}
      </button>

      <p className="text-xs text-[var(--text-muted)]">
        By joining, you agree to receive beta updates. You can unsubscribe anytime.
      </p>
    </form>
  );
}
