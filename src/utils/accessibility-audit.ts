/**
 * Accessibility Audit - axe-core Integration
 * 
 * Provides accessibility testing and reporting using axe-core.
 * Helps ensure WCAG 2.1 AA compliance.
 */

import React, { useEffect } from 'react';
import * as ReactDOM from 'react-dom';

let axeInitialized = false;

/**
 * Initialize axe-core for accessibility testing
 * Only runs in development mode
 */
export async function initAxe(React: any, ReactDOM: any): Promise<void> {
  if (process.env.NODE_ENV !== 'development') {
    return; // Only run in development
  }

  if (axeInitialized) {
    return; // Already initialized
  }

  try {
    // Dynamic import to avoid bundling in production
    const axe = await import('@axe-core/react');
    if (axe.default && React && ReactDOM) {
      axe.default(React, ReactDOM, 1000); // 1000ms debounce
      axeInitialized = true;
      console.log('[Accessibility] axe-core initialized');
    }
  } catch (error) {
    console.warn('[Accessibility] Failed to initialize axe-core:', error);
    // Fail silently - accessibility audit is optional
  }
}

/**
 * Run accessibility audit on current page
 * Returns violations and passes
 */
export async function runAccessibilityAudit(): Promise<{
  violations: any[];
  passes: any[];
  incomplete: any[];
  inapplicable: any[];
}> {
  try {
    // Dynamic import
    const axe = await import('axe-core');
    
    const results = await axe.default.run();
    
    return {
      violations: results.violations || [],
      passes: results.passes || [],
      incomplete: results.incomplete || [],
      inapplicable: results.inapplicable || [],
    };
  } catch (error) {
    console.error('[Accessibility] Audit failed:', error);
    return {
      violations: [],
      passes: [],
      incomplete: [],
      inapplicable: [],
    };
  }
}

/**
 * React hook to initialize axe-core
 */
export function useAccessibilityAudit(): void {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      initAxe(React, ReactDOM).catch(console.error);
    }
  }, []);
}

/**
 * Get accessibility score (0-100)
 */
export function calculateAccessibilityScore(auditResults: {
  violations: any[];
  passes: any[];
  incomplete: any[];
}): number {
  const total = auditResults.violations.length + auditResults.passes.length + auditResults.incomplete.length;
  if (total === 0) return 100;
  
  const passes = auditResults.passes.length;
  const violations = auditResults.violations.length;
  const incomplete = auditResults.incomplete.length;
  
  // Score calculation: passes count more, violations count less, incomplete neutral
  const score = ((passes * 1.0) - (violations * 0.5) + (incomplete * 0.5)) / total * 100;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Format accessibility violations for display
 */
export function formatViolations(violations: any[]): Array<{
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  description: string;
  help: string;
  helpUrl: string;
  nodes: Array<{
    html: string;
    target: string[];
    failureSummary?: string;
  }>;
}> {
  return violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    description: v.description,
    help: v.help,
    helpUrl: v.helpUrl,
    nodes: v.nodes.map((n: any) => ({
      html: n.html,
      target: n.target,
      failureSummary: n.failureSummary,
    })),
  }));
}

