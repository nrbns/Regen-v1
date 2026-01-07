/**
 * Agent Safety Layer - Tier 3 Pillar 4
 * Risk scoring, consent checks, and capability-aware gating for tools
 */

import { ipc } from '../../lib/ipc-typed';
import { log } from '../../utils/logger';
import type { ConsentRisk, ConsentActionType } from '../../types/consent';

export type SafetyLevel = 'low' | 'medium' | 'high';

export type SafetyContext = {
  goal?: string;
  userId?: string;
  allowedDomains?: string[];
  deniedDomains?: string[];
  requireConsent?: boolean;
};

export type SafetyDecision = {
  allowed: boolean;
  risk: SafetyLevel;
  consentRequired: boolean;
  consentGranted?: boolean;
  reason?: string;
};

export type SafetyAuditEntry = {
  runId: string;
  tool: string;
  nodeId?: string;
  risk: SafetyLevel;
  allowed: boolean;
  consentRequired: boolean;
  consentGranted?: boolean;
  reason?: string;
  inputPreview?: string;
  timestamp: number;
};

const DEFAULT_TOOL_RISK: Record<string, SafetyLevel> = {
  manage_tabs: 'high',
  scrape_page: 'medium',
  search_web: 'medium',
  summarize_text: 'low',
  extract_table: 'medium',
};

/**
 * Evaluate whether a tool invocation is allowed under the provided context.
 */
export async function evaluateSafety(
  tool: string,
  input: unknown,
  context?: SafetyContext
): Promise<SafetyDecision> {
  const toolName = tool;
  const risk = getRisk(toolName, input);
  const consentRequired = Boolean(context?.requireConsent && risk !== 'low');
  const decision: SafetyDecision = {
    allowed: true,
    risk,
    consentRequired,
  };

  if (!isDomainAllowed(input, context)) {
    decision.allowed = false;
    decision.reason = 'Domain not allowed by safety policy';
    return decision;
  }

  if (consentRequired) {
    try {
      const consentType = getConsentType(toolName);
      const consent = await ipc.consent.check({
        type: consentType,
        description: describe(toolName, input, context),
        risk: mapRiskToConsent(risk),
      });
      decision.consentGranted = Boolean(consent?.hasConsent);
      if (!decision.consentGranted) {
        decision.allowed = false;
        decision.reason = 'Consent denied';
      }
    } catch (error) {
      decision.allowed = false;
      decision.reason = 'Consent check failed';
      log.warn('[AgentSafety] Consent check failed', error);
    }
  }

  return decision;
}

function getRisk(toolName: string, input: unknown): SafetyLevel {
  if (toolName === 'manage_tabs') {
    const action = (input as { action?: string })?.action;
    if (action === 'close' || action === 'navigate') return 'high';
    return 'medium';
  }

  if (toolName === 'scrape_page') {
    const url = extractUrl(input);
    if (url && isExternal(url)) return 'medium';
    return 'low';
  }

  return DEFAULT_TOOL_RISK[toolName] || 'medium';
}

function getConsentType(toolName: string): ConsentActionType {
  switch (toolName) {
    case 'scrape_page':
    case 'search_web':
      return 'scrape';
    case 'manage_tabs':
      return 'scrape';
    default:
      return 'scrape';
  }
}

function describe(toolName: string, input: unknown, context?: SafetyContext): string {
  const goalPart = context?.goal ? `Goal: ${context.goal}. ` : '';
  if (toolName === 'scrape_page') {
    const url = extractUrl(input);
    return `${goalPart}Scrape ${url || 'current page'}`;
  }
  if (toolName === 'search_web') {
    const query = (input as { query?: string })?.query;
    return `${goalPart}Search web for "${query || 'query'}"`;
  }
  if (toolName === 'manage_tabs') {
    const action = (input as { action?: string })?.action;
    const url = extractUrl(input);
    return `${goalPart}Manage tabs (${action || 'unknown'}) ${url ? `target ${url}` : ''}`.trim();
  }
  return `${goalPart}Run tool ${toolName}`;
}

function mapRiskToConsent(risk: SafetyLevel): ConsentRisk {
  if (risk === 'high') return 'high';
  if (risk === 'medium') return 'medium';
  return 'low';
}

function isDomainAllowed(input: unknown, context?: SafetyContext): boolean {
  if (!context?.allowedDomains && !context?.deniedDomains) return true;
  const url = extractUrl(input);
  if (!url) return true;

  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (context.deniedDomains?.some(domain => hostname.includes(domain.toLowerCase()))) {
      return false;
    }
    if (context.allowedDomains && context.allowedDomains.length > 0) {
      return context.allowedDomains.some(domain => hostname.includes(domain.toLowerCase()));
    }
    return true;
  } catch {
    return false;
  }
}

function extractUrl(input: unknown): string | null {
  if (typeof input === 'string') return input;
  if (
    input &&
    typeof input === 'object' &&
    'url' in input &&
    typeof (input as any).url === 'string'
  ) {
    return (input as any).url as string;
  }
  return null;
}

function isExternal(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol.startsWith('http');
  } catch {
    return false;
  }
}

export function summarizeInput(input: unknown, maxLength = 180): string {
  let asString = '';
  if (typeof input === 'string') {
    asString = input;
  } else {
    try {
      asString = JSON.stringify(input, null, 2);
    } catch {
      asString = '[unserializable input]';
    }
  }

  if (asString.length <= maxLength) return asString;
  return `${asString.slice(0, maxLength)}…`;
}
