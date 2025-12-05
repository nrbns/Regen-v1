/**
 * Adblock Engine
 * Blocks ads, trackers, and malicious content
 */

const EventEmitter = require('events');
const Pino = require('pino');
const logger = Pino({ name: 'adblock-engine' });

// Simple adblock rules (can be extended with EasyList)
const DEFAULT_RULES = [
  // Ad networks
  /doubleclick\.net/i,
  /googleadservices\.com/i,
  /googlesyndication\.com/i,
  /adsystem\.com/i,
  /advertising\.com/i,
  /adnxs\.com/i,
  /adsrvr\.org/i,
  /adtechus\.com/i,
  /advertising\.com/i,
  /adform\.net/i,
  /adserver\.com/i,
  /advertising\.com/i,
  /adtech\.com/i,
  /advertising\.com/i,
  /advertising\.com/i,
  /advertising\.com/i,
  // Trackers
  /analytics\.google\.com/i,
  /google-analytics\.com/i,
  /facebook\.net/i,
  /facebook\.com\/tr/i,
  /scorecardresearch\.com/i,
  /quantserve\.com/i,
  /outbrain\.com/i,
  /taboola\.com/i,
  /criteo\.com/i,
  // Malicious patterns
  /malware/i,
  /phishing/i,
  /\.exe$/i,
  /\.bat$/i,
  /\.scr$/i,
];

class AdblockEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      enabled: true,
      strictMode: false,
      allowList: [],
      blockList: [],
      ...options,
    };
    this.rules = [...DEFAULT_RULES];
    this.stats = {
      blocked: 0,
      allowed: 0,
      total: 0,
    };
  }

  /**
   * Check if URL should be blocked
   */
  shouldBlock(url, resourceType = 'other') {
    if (!this.options.enabled) {
      return false;
    }

    this.stats.total++;

    // Check allow list first
    for (const pattern of this.options.allowList) {
      if (this._matches(url, pattern)) {
        this.stats.allowed++;
        return false;
      }
    }

    // Check block list
    for (const pattern of this.options.blockList) {
      if (this._matches(url, pattern)) {
        this.stats.blocked++;
        this.emit('blocked', { url, resourceType, reason: 'blockList' });
        return true;
      }
    }

    // Check default rules
    for (const rule of this.rules) {
      if (rule.test(url)) {
        this.stats.blocked++;
        this.emit('blocked', { url, resourceType, reason: 'defaultRule' });
        return true;
      }
    }

    this.stats.allowed++;
    return false;
  }

  /**
   * Match URL against pattern (supports regex or string)
   */
  _matches(url, pattern) {
    if (pattern instanceof RegExp) {
      return pattern.test(url);
    }
    if (typeof pattern === 'string') {
      return url.includes(pattern);
    }
    return false;
  }

  /**
   * Add custom rule
   */
  addRule(pattern) {
    if (pattern instanceof RegExp) {
      this.rules.push(pattern);
    } else if (typeof pattern === 'string') {
      this.rules.push(new RegExp(pattern, 'i'));
    }
    logger.info({ pattern }, 'Adblock rule added');
  }

  /**
   * Remove rule
   */
  removeRule(pattern) {
    this.rules = this.rules.filter(rule => rule.toString() !== pattern.toString());
    logger.info({ pattern }, 'Adblock rule removed');
  }

  /**
   * Add to allow list
   */
  allow(url) {
    if (!this.options.allowList.includes(url)) {
      this.options.allowList.push(url);
      logger.info({ url }, 'URL added to allow list');
    }
  }

  /**
   * Add to block list
   */
  block(url) {
    if (!this.options.blockList.includes(url)) {
      this.options.blockList.push(url);
      logger.info({ url }, 'URL added to block list');
    }
  }

  /**
   * Enable/disable adblock
   */
  setEnabled(enabled) {
    this.options.enabled = enabled;
    logger.info({ enabled }, 'Adblock enabled/disabled');
    this.emit('enabledChanged', enabled);
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      enabled: this.options.enabled,
      rulesCount: this.rules.length,
      allowListCount: this.options.allowList.length,
      blockListCount: this.options.blockList.length,
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      blocked: 0,
      allowed: 0,
      total: 0,
    };
  }
}

// Singleton instance
let adblockInstance = null;

function getAdblockEngine(options) {
  if (!adblockInstance) {
    adblockInstance = new AdblockEngine(options);
  }
  return adblockInstance;
}

module.exports = {
  AdblockEngine,
  getAdblockEngine,
};




