/**
 * Fingerprint Library (Wappalyzer clone)
 * Detects technologies used on websites
 */

export interface Technology {
  name: string;
  category: string;
  confidence: number;
  version?: string;
}

export class FingerprintLibrary {
  /**
   * Detect technologies from HTML
   */
  detectTechnologies(html: string, headers: Record<string, string>): Technology[] {
    const technologies: Technology[] = [];
    const lowerHtml = html.toLowerCase();
    
    // Framework detection
    if (lowerHtml.includes('react') || /react[\s\/-]/i.test(html)) {
      technologies.push({ name: 'React', category: 'JavaScript Framework', confidence: 0.8 });
    }
    if (lowerHtml.includes('vue') || /vue\.js/i.test(html)) {
      technologies.push({ name: 'Vue.js', category: 'JavaScript Framework', confidence: 0.8 });
    }
    if (lowerHtml.includes('angular') || /ng-app/i.test(html)) {
      technologies.push({ name: 'Angular', category: 'JavaScript Framework', confidence: 0.8 });
    }
    
    // CMS detection
    if (lowerHtml.includes('wordpress') || /wp-content/i.test(html)) {
      technologies.push({ name: 'WordPress', category: 'CMS', confidence: 0.9 });
    }
    if (lowerHtml.includes('joomla') || /joomla/i.test(html)) {
      technologies.push({ name: 'Joomla', category: 'CMS', confidence: 0.9 });
    }
    if (lowerHtml.includes('drupal') || /drupal/i.test(html)) {
      technologies.push({ name: 'Drupal', category: 'CMS', confidence: 0.9 });
    }
    
    // Server detection from headers
    const server = headers['server'] || headers['x-powered-by'];
    if (server) {
      if (server.includes('nginx')) {
        technologies.push({ name: 'Nginx', category: 'Web Server', confidence: 0.95 });
      } else if (server.includes('apache')) {
        technologies.push({ name: 'Apache', category: 'Web Server', confidence: 0.95 });
      } else if (server.includes('cloudflare')) {
        technologies.push({ name: 'Cloudflare', category: 'CDN', confidence: 0.95 });
      }
    }
    
    // Analytics
    if (/google-analytics|gtag|ga\(/i.test(html)) {
      technologies.push({ name: 'Google Analytics', category: 'Analytics', confidence: 0.9 });
    }
    if (/facebook.*pixel|fbq\(/i.test(html)) {
      technologies.push({ name: 'Facebook Pixel', category: 'Analytics', confidence: 0.9 });
    }
    
    // CDN
    if (lowerHtml.includes('jquery') || /jquery/i.test(html)) {
      technologies.push({ name: 'jQuery', category: 'JavaScript Library', confidence: 0.8 });
    }
    if (lowerHtml.includes('bootstrap') || /bootstrap/i.test(html)) {
      technologies.push({ name: 'Bootstrap', category: 'CSS Framework', confidence: 0.8 });
    }
    
    // E-commerce
    if (lowerHtml.includes('shopify')) {
      technologies.push({ name: 'Shopify', category: 'E-commerce', confidence: 0.9 });
    }
    if (lowerHtml.includes('woocommerce')) {
      technologies.push({ name: 'WooCommerce', category: 'E-commerce', confidence: 0.9 });
    }
    
    return technologies;
  }

  /**
   * Detect from script URLs
   */
  detectFromScripts(scriptUrls: string[]): Technology[] {
    const technologies: Technology[] = [];
    
    for (const url of scriptUrls) {
      if (url.includes('cdn.jsdelivr.net')) {
        technologies.push({ name: 'jsDelivr', category: 'CDN', confidence: 0.8 });
      }
      if (url.includes('cdnjs.cloudflare.com')) {
        technologies.push({ name: 'Cloudflare CDN', category: 'CDN', confidence: 0.8 });
      }
      if (url.includes('googleapis.com')) {
        technologies.push({ name: 'Google APIs', category: 'CDN', confidence: 0.8 });
      }
    }
    
    return technologies;
  }
}

// Singleton instance
let fingerprintLibInstance: FingerprintLibrary | null = null;

export function getFingerprintLibrary(): FingerprintLibrary {
  if (!fingerprintLibInstance) {
    fingerprintLibInstance = new FingerprintLibrary();
  }
  return fingerprintLibInstance;
}

