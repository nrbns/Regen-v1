/**
 * Beta Program Page
 * Signup and information for early access
 */

import React from 'react';
import { Rocket, CheckCircle, Zap, Shield, Brain } from 'lucide-react';
import { BetaSignup } from '../components/beta/BetaSignup';

export default function BetaRoute() {
  return (
    <div className="min-h-screen bg-[var(--surface-root)] p-4 md:p-8 text-[var(--text-primary)]">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-[var(--color-primary-500)]/20 p-4">
              <Rocket className="h-12 w-12 text-[var(--color-primary-500)]" />
            </div>
          </div>
          <h1 className="mb-2 text-3xl md:text-4xl font-bold text-[var(--text-primary)]">Join Regen Beta</h1>
          <p className="text-base md:text-lg text-[var(--text-secondary)]">
            Get early access to the privacy-first browser with presence-based AI
          </p>
        </div>

        {/* Features Grid */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-panel)] p-6 transition-all hover:bg-[var(--surface-active)] hover:border-[var(--surface-border-strong)]">
            <Brain className="mb-3 h-8 w-8 text-purple-400" />
            <h3 className="mb-2 text-lg font-semibold text-[var(--text-primary)]">Presence-Based AI</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Silent, observing AI that helps without interrupting
            </p>
          </div>

          <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-panel)] p-6 transition-all hover:bg-[var(--surface-active)] hover:border-[var(--surface-border-strong)]">
            <Shield className="mb-3 h-8 w-8 text-[var(--color-success-500)]" />
            <h3 className="mb-2 text-lg font-semibold text-[var(--text-primary)]">Privacy First</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Local-first, works offline, no data exfiltration
            </p>
          </div>

          <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-panel)] p-6 transition-all hover:bg-[var(--surface-active)] hover:border-[var(--surface-border-strong)] sm:col-span-2 md:col-span-1">
            <Zap className="mb-3 h-8 w-8 text-[var(--color-warning-500)]" />
            <h3 className="mb-2 text-lg font-semibold text-[var(--text-primary)]">Low Resource</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Runs smoothly on 4GB RAM devices
            </p>
          </div>
        </div>

        {/* Benefits */}
        <div className="mb-8 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-panel)] p-6">
          <h2 className="mb-4 text-xl font-semibold text-[var(--text-primary)]">Beta Benefits</h2>
          <ul className="space-y-2">
            <li className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-[var(--color-success-500)] flex-shrink-0" />
              <span className="text-[var(--text-secondary)]">Early access to new features</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-[var(--color-success-500)] flex-shrink-0" />
              <span className="text-[var(--text-secondary)]">Direct feedback channel to developers</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-[var(--color-success-500)] flex-shrink-0" />
              <span className="text-[var(--text-secondary)]">Priority support</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-[var(--color-success-500)] flex-shrink-0" />
              <span className="text-[var(--text-secondary)]">Shape the future of Regen</span>
            </li>
          </ul>
        </div>

        {/* Signup Form */}
        <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-panel)] p-4 md:p-6">
          <h2 className="mb-4 text-xl font-semibold text-[var(--text-primary)]">Sign Up</h2>
          <BetaSignup />
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-[var(--text-muted)]">
          <p>
            By joining the beta, you agree to receive updates and provide feedback.
          </p>
          <p className="mt-2">
            All data is stored locally. Your privacy is protected.
          </p>
        </div>
      </div>
    </div>
  );
}
