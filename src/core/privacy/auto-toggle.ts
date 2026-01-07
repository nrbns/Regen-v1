/**
 * Privacy Auto-Toggle - Automatically switch to Private mode on sensitive sites
 * 
 * Uses Redix threat scanning to detect sensitive content and auto-enable privacy
 */

import { ipc } from '../../lib/ipc-typed';

// Sensitive domain patterns
const SENSITIVE_PATTERNS = [
  /banking|financial|credit|loan|mortgage/i,
  /medical|health|patient|diagnosis|prescription/i,
  /legal|lawyer|attorney|court|lawsuit/i,
  /government|gov|irs|tax|social.*security/i,
  /adult|xxx|porn/i,
];

// Known sensitive domains
const SENSITIVE_DOMAINS = [
  'bankofamerica.com',
  'chase.com',
  'wellsfargo.com',
  'paypal.com',
  'healthcare.gov',
  'irs.gov',
  'ssa.gov',
];

export interface PrivacyAutoToggleConfig {
  enabled: boolean;
  sensitivityThreshold: number; // 0-100
  autoPrivate: boolean;
  autoGhost: boolean;
}

const DEFAULT_CONFIG: PrivacyAutoToggleConfig = {
  enabled: true,
  sensitivityThreshold: 70,
  autoPrivate: false, // Default to Ghost (Tor) for sensitive sites
  autoGhost: true,
};

let currentConfig = { ...DEFAULT_CONFIG };

/**
 * Check if a URL is sensitive based on domain and content patterns
 */
export async function checkSensitivity(url: string): Promise<{
  isSensitive: boolean;
  score: number;
  reasons: string[];
}> {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    let score = 0;
    const reasons: string[] = [];

    // Check domain patterns
    for (const pattern of SENSITIVE_PATTERNS) {
      if (pattern.test(hostname) || pattern.test(url)) {
        score += 20;
        reasons.push(`Matches sensitive pattern: ${pattern.source}`);
      }
    }

    // Check known sensitive domains
    if (SENSITIVE_DOMAINS.some(domain => hostname.includes(domain))) {
      score += 30;
      reasons.push('Known sensitive domain');
    }

    // Use Redix threat scanning if available (check if IPC method exists)
    try {
      if (typeof (ipc as any).threats?.scanUrl === 'function') {
        const threatScan = await (ipc as any).threats.scanUrl(url);
        if (threatScan && typeof threatScan === 'object') {
          const riskLevel = (threatScan as any).riskLevel || 'low';
          if (riskLevel === 'high' || riskLevel === 'critical') {
            score += 40;
            reasons.push(`Redix threat scan: ${riskLevel} risk`);
          } else if (riskLevel === 'medium') {
            score += 20;
            reasons.push(`Redix threat scan: ${riskLevel} risk`);
          }
        }
      }
    } catch (error) {
      console.debug('[PrivacyAutoToggle] Threat scan failed:', error);
    }

    return {
      isSensitive: score >= currentConfig.sensitivityThreshold,
      score: Math.min(100, score),
      reasons,
    };
  } catch (error) {
    console.error('[PrivacyAutoToggle] Failed to check sensitivity:', error);
    return { isSensitive: false, score: 0, reasons: [] };
  }
}

/**
 * Auto-enable privacy mode for sensitive sites
 */
export async function autoTogglePrivacy(url: string, currentMode: 'Normal' | 'Private' | 'Ghost'): Promise<'Normal' | 'Private' | 'Ghost' | null> {
  if (!currentConfig.enabled || currentMode !== 'Normal') {
    return null; // Already in privacy mode or auto-toggle disabled
  }

  const sensitivity = await checkSensitivity(url);
  
  if (!sensitivity.isSensitive) {
    return null; // Not sensitive enough
  }

  console.debug(`[PrivacyAutoToggle] Sensitive site detected (score: ${sensitivity.score}):`, url, sensitivity.reasons);

  // Auto-enable Ghost mode (Tor) for maximum privacy
  if (currentConfig.autoGhost) {
    try {
      // Check if Tor is available
      const torStatus = await ipc.tor.status() as any;
      if (torStatus && !torStatus.stub) {
        // Start Tor if not running
        if (!torStatus.running) {
          await ipc.tor.start();
        }
        // Create ghost tab with Tor proxy
        await ipc.private.createGhostTab({ url });
        return 'Ghost';
      }
    } catch (error) {
      console.warn('[PrivacyAutoToggle] Ghost mode failed, trying Private:', error);
    }
  }

  // Fallback to Private mode (incognito)
  if (currentConfig.autoPrivate) {
    try {
      await ipc.private.createWindow({ url });
      return 'Private';
    } catch (error) {
      console.error('[PrivacyAutoToggle] Failed to create private window:', error);
    }
  }

  return null;
}

/**
 * Update auto-toggle configuration
 */
export function updateConfig(config: Partial<PrivacyAutoToggleConfig>): void {
  currentConfig = { ...currentConfig, ...config };
}

/**
 * Get current configuration
 */
export function getConfig(): PrivacyAutoToggleConfig {
  return { ...currentConfig };
}

