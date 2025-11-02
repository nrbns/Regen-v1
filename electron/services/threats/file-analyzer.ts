/**
 * File Analyzer Sandbox
 * Safe file analysis without execution (hash, signatures, YARA)
 */

import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';

export interface FileAnalysis {
  filePath: string;
  hash: {
    md5: string;
    sha256: string;
  };
  metadata: {
    size: number;
    extension: string;
    mimeType?: string;
    created?: Date;
    modified?: Date;
  };
  signatures: Array<{
    type: 'pe' | 'elf' | 'mach-o' | 'javascript' | 'other';
    details: Record<string, unknown>;
  }>;
  yaraMatches?: Array<{
    rule: string;
    tags: string[];
    description?: string;
  }>;
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
}

export class FileAnalyzer {
  /**
   * Analyze file safely (no execution)
   */
  async analyze(filePath: string): Promise<FileAnalysis> {
    const stats = await fs.stat(filePath);
    const buffer = await fs.readFile(filePath);
    
    // Calculate hashes
    const md5 = crypto.createHash('md5').update(buffer).digest('hex');
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    
    // Extract metadata
    const ext = path.extname(filePath).toLowerCase();
    const metadata = {
      size: stats.size,
      extension: ext,
      mimeType: this.detectMimeType(ext, buffer),
      created: stats.birthtime,
      modified: stats.mtime,
    };

    // Detect file type and extract signatures
    const signatures = await this.extractSignatures(buffer, ext);
    
    // Run YARA rules (if available)
    const yaraMatches = await this.runYARARules(buffer);
    
    // Determine threat level
    const threatLevel = this.assessThreatLevel(signatures, yaraMatches);
    
    return {
      filePath,
      hash: { md5, sha256 },
      metadata,
      signatures,
      yaraMatches,
      threatLevel,
    };
  }

  /**
   * Extract signatures based on file type
   */
  private async extractSignatures(buffer: Buffer, extension: string): Promise<FileAnalysis['signatures']> {
    const signatures: FileAnalysis['signatures'] = [];
    
    // PE (Windows executable)
    if (extension === '.exe' || extension === '.dll') {
      const peInfo = this.parsePEHeader(buffer);
      if (peInfo) {
        signatures.push({
          type: 'pe',
          details: peInfo,
        });
      }
    }
    
    // ELF (Linux executable)
    if (buffer.slice(0, 4).toString() === '\x7FELF') {
      const elfInfo = this.parseELFHeader(buffer);
      if (elfInfo) {
        signatures.push({
          type: 'elf',
          details: elfInfo,
        });
      }
    }
    
    // Mach-O (macOS executable)
    if (buffer.slice(0, 4).toString() === '\xFE\xED\xFA\xCE' || 
        buffer.slice(0, 4).toString() === '\xCE\xFA\xED\xFE') {
      const machoInfo = this.parseMachOHeader(buffer);
      if (machoInfo) {
        signatures.push({
          type: 'mach-o',
          details: machoInfo,
        });
      }
    }
    
    // JavaScript
    if (extension === '.js' || extension === '.mjs') {
      signatures.push({
        type: 'javascript',
        details: {
          lines: buffer.toString('utf-8').split('\n').length,
          suspiciousPatterns: this.detectSuspiciousJS(buffer.toString('utf-8')),
        },
      });
    }
    
    return signatures;
  }

  /**
   * Run YARA rules (simplified - would use yara npm package if available)
   */
  private async runYARARules(buffer: Buffer): Promise<FileAnalysis['yaraMatches']> {
    // In production, would use actual YARA engine
    // For now, return empty array (requires YARA library)
    const matches: FileAnalysis['yaraMatches'] = [];
    
    // Simple pattern matching (demo)
    const suspiciousPatterns = [
      { pattern: /eval\(/g, rule: 'javascript_eval', tags: ['suspicious'] },
      { pattern: /document\.cookie/g, rule: 'cookie_access', tags: ['privacy'] },
      { pattern: /XMLHttpRequest/g, rule: 'network_request', tags: ['network'] },
    ];
    
    const content = buffer.toString('utf-8', 0, Math.min(buffer.length, 10000));
    for (const { pattern, rule, tags } of suspiciousPatterns) {
      if (pattern.test(content)) {
        matches.push({
          rule,
          tags,
          description: `Detected pattern: ${rule}`,
        });
      }
    }
    
    return matches.length > 0 ? matches : undefined;
  }

  /**
   * Assess threat level
   */
  private assessThreatLevel(
    signatures: FileAnalysis['signatures'],
    yaraMatches?: FileAnalysis['yaraMatches']
  ): FileAnalysis['threatLevel'] {
    if (yaraMatches && yaraMatches.some(m => m.tags.includes('malware'))) {
      return 'critical';
    }
    if (yaraMatches && yaraMatches.length > 0) {
      return 'high';
    }
    if (signatures.some(s => s.type === 'pe' || s.type === 'elf' || s.type === 'mach-o')) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Parse PE header (simplified)
   */
  private parsePEHeader(buffer: Buffer): Record<string, unknown> | null {
    if (buffer.length < 64) return null;
    
    // Check for PE signature
    const peOffset = buffer.readUInt32LE(0x3C);
    if (peOffset >= buffer.length || buffer.slice(peOffset, peOffset + 2).toString() !== 'PE') {
      return null;
    }
    
    return {
      arch: buffer.readUInt16LE(peOffset + 4) === 0x8664 ? 'x64' : 'x86',
      sections: buffer.readUInt16LE(peOffset + 6),
    };
  }

  /**
   * Parse ELF header (simplified)
   */
  private parseELFHeader(buffer: Buffer): Record<string, unknown> | null {
    if (buffer.length < 52) return null;
    
    return {
      arch: buffer[4] === 2 ? '64-bit' : '32-bit',
      endian: buffer[5] === 1 ? 'little' : 'big',
      type: buffer[16] === 2 ? 'executable' : 'library',
    };
  }

  /**
   * Parse Mach-O header (simplified)
   */
  private parseMachOHeader(buffer: Buffer): Record<string, unknown> | null {
    if (buffer.length < 32) return null;
    
    return {
      arch: buffer[12] === 0x01 ? 'i386' : buffer[12] === 0x06 ? 'x86_64' : 'unknown',
      type: buffer[4] === 0x02 ? 'executable' : 'library',
    };
  }

  /**
   * Detect suspicious JavaScript patterns
   */
  private detectSuspiciousJS(code: string): string[] {
    const patterns: string[] = [];
    
    if (/eval\(/.test(code)) patterns.push('eval_usage');
    if (/document\.cookie/.test(code)) patterns.push('cookie_access');
    if (/XMLHttpRequest|fetch\(/.test(code)) patterns.push('network_requests');
    if (/atob\(|btoa\(/.test(code)) patterns.push('base64_encoding');
    
    return patterns;
  }

  /**
   * Detect MIME type from extension and content
   */
  private detectMimeType(extension: string, buffer: Buffer): string {
    const mimeMap: Record<string, string> = {
      '.exe': 'application/x-msdownload',
      '.dll': 'application/x-msdownload',
      '.js': 'application/javascript',
      '.mjs': 'application/javascript',
      '.pdf': 'application/pdf',
      '.zip': 'application/zip',
    };
    
    return mimeMap[extension] || 'application/octet-stream';
  }
}

// Singleton instance
let fileAnalyzerInstance: FileAnalyzer | null = null;

export function getFileAnalyzer(): FileAnalyzer {
  if (!fileAnalyzerInstance) {
    fileAnalyzerInstance = new FileAnalyzer();
  }
  return fileAnalyzerInstance;
}

