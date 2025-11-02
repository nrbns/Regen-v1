/**
 * Enhanced Threat Scanner
 * Combines URL scanner, file analyzer, fingerprint detection, and threat graph
 */

import { getFileAnalyzer } from './file-analyzer';
import { getFingerprintLibrary } from './fingerprint-lib';
import { getThreatGraphService } from '../self-defense/threat-graph';
import { fetch } from 'undici';

export interface EnhancedScanResult {
  url?: string;
  filePath?: string;
  type: 'url' | 'file';
  
  // URL-specific
  dns?: {
    ip: string;
    asn?: string;
    country?: string;
  };
  tls?: {
    grade?: string;
    valid: boolean;
    issuer?: string;
  };
  whois?: {
    registrar?: string;
    created?: string;
    expires?: string;
  };
  trackers?: string[];
  fingerprint?: Array<{
    name: string;
    category: string;
    confidence: number;
  }>;
  
  // File-specific
  fileAnalysis?: {
    hash: { md5: string; sha256: string };
    signatures: any[];
    yaraMatches?: any[];
    threatLevel: string;
  };
  
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
}

export class EnhancedThreatScanner {
  /**
   * Scan URL with full analysis
   */
  async scanUrl(url: string): Promise<EnhancedScanResult> {
    const result: EnhancedScanResult = {
      url,
      type: 'url',
      threatLevel: 'low',
      recommendations: [],
    };

    try {
      // DNS lookup
      const urlObj = new URL(url);
      // In production, would use DNS lookup API
      result.dns = {
        ip: '0.0.0.0', // Placeholder
      };

      // TLS/SSL check
      try {
        const response = await fetch(url, { method: 'HEAD' });
        result.tls = {
          valid: url.startsWith('https://'),
          issuer: response.headers.get('server') || undefined,
        };
      } catch {
        result.tls = { valid: false };
      }

      // Fetch HTML for analysis
      try {
        const response = await fetch(url);
        const html = await response.text();
        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          headers[key.toLowerCase()] = value;
        });

        // Fingerprint detection
        const fingerprintLib = getFingerprintLibrary();
        result.fingerprint = fingerprintLib.detectTechnologies(html, headers);

        // Tracker detection (simplified)
        result.trackers = this.detectTrackers(html);

        // Record in threat graph
        const threatGraph = getThreatGraphService();
        for (const tracker of result.trackers) {
          threatGraph.recordTracker(urlObj.hostname, tracker);
        }
      } catch {
        // Failed to fetch
      }

      // Assess threat level
      result.threatLevel = this.assessUrlThreat(result);
      result.recommendations = this.generateRecommendations(result);

      return result;
    } catch (error) {
      return {
        ...result,
        threatLevel: 'high',
        recommendations: ['Failed to scan URL. Proceed with caution.'],
      };
    }
  }

  /**
   * Scan file
   */
  async scanFile(filePath: string): Promise<EnhancedScanResult> {
    const analyzer = getFileAnalyzer();
    const fileAnalysis = await analyzer.analyze(filePath);

    const result: EnhancedScanResult = {
      filePath,
      type: 'file',
      fileAnalysis,
      threatLevel: fileAnalysis.threatLevel,
      recommendations: this.generateFileRecommendations(fileAnalysis),
    };

    return result;
  }

  /**
   * Detect trackers in HTML
   */
  private detectTrackers(html: string): string[] {
    const trackers: string[] = [];
    
    // Common tracker patterns
    const trackerDomains = [
      'google-analytics',
      'googletagmanager',
      'facebook.com/tr',
      'doubleclick',
      'adservice',
      'analytics',
      'tracking',
    ];

    const lowerHtml = html.toLowerCase();
    for (const domain of trackerDomains) {
      if (lowerHtml.includes(domain)) {
        trackers.push(domain);
      }
    }

    return [...new Set(trackers)];
  }

  /**
   * Assess URL threat level
   */
  private assessUrlThreat(result: Partial<EnhancedScanResult>): EnhancedScanResult['threatLevel'] {
    let score = 0;

    if (!result.tls?.valid) score += 2;
    if (result.trackers && result.trackers.length > 5) score += 2;
    if (result.trackers && result.trackers.length > 10) score += 1;

    if (score >= 4) return 'critical';
    if (score >= 2) return 'high';
    if (score >= 1) return 'medium';
    return 'low';
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(result: Partial<EnhancedScanResult>): string[] {
    const recs: string[] = [];

    if (!result.tls?.valid) {
      recs.push('Use HTTPS for secure connection');
    }
    if (result.trackers && result.trackers.length > 0) {
      recs.push(`Found ${result.trackers.length} trackers. Consider enabling Shields.`);
    }
    if (result.fingerprint && result.fingerprint.length === 0) {
      recs.push('Unable to detect technologies. Website may be using obfuscation.');
    }

    return recs;
  }

  /**
   * Generate file recommendations
   */
  private generateFileRecommendations(analysis: any): string[] {
    const recs: string[] = [];

    if (analysis.threatLevel === 'critical' || analysis.threatLevel === 'high') {
      recs.push('File may be malicious. Do not execute.');
    }
    if (analysis.yaraMatches && analysis.yaraMatches.length > 0) {
      recs.push(`YARA rules matched: ${analysis.yaraMatches.map((m: any) => m.rule).join(', ')}`);
    }
    if (analysis.signatures.some((s: any) => s.type === 'pe' || s.type === 'elf')) {
      recs.push('Executable file detected. Verify source before running.');
    }

    return recs;
  }
}

// Singleton instance
let enhancedScannerInstance: EnhancedThreatScanner | null = null;

export function getEnhancedThreatScanner(): EnhancedThreatScanner {
  if (!enhancedScannerInstance) {
    enhancedScannerInstance = new EnhancedThreatScanner();
  }
  return enhancedScannerInstance;
}

