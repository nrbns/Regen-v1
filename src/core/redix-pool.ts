/**
 * RedixPool - DOM Element Pooling System
 * 
 * Reuses DOM elements to reduce memory allocation and improve performance.
 * Critical for low-end devices and universal compatibility.
 * 
 * Usage:
 *   const pool = new RedixPool();
 *   const tab = pool.getTab();
 *   // ... use tab
 *   pool.returnTab(tab);
 */

export class RedixPool {
  private tabPool: HTMLElement[] = [];
  private buttonPool: HTMLButtonElement[] = [];
  private divPool: HTMLDivElement[] = [];
  private spanPool: HTMLSpanElement[] = [];
  private linkPool: HTMLAnchorElement[] = [];
  
  private maxPoolSize = 50;
  private stats = {
    tabsCreated: 0,
    tabsReused: 0,
    buttonsCreated: 0,
    buttonsReused: 0,
    divsCreated: 0,
    divsReused: 0,
  };

  /**
   * Get a tab element from the pool or create a new one
   */
  getTab(): HTMLElement {
    const tab = this.tabPool.pop();
    if (tab) {
      this.stats.tabsReused++;
      // Reset tab state
      tab.innerHTML = '';
      tab.className = 'tab';
      tab.removeAttribute('data-tab-id');
      return tab;
    }
    
    this.stats.tabsCreated++;
    const newTab = document.createElement('div');
    newTab.className = 'tab';
    return newTab;
  }

  /**
   * Return a tab element to the pool
   */
  returnTab(tab: HTMLElement): void {
    if (!tab || !tab.parentNode) return;
    
    // Clean up
    tab.innerHTML = '';
    tab.className = 'tab';
    tab.removeAttribute('data-tab-id');
    tab.removeAttribute('data-active');
    tab.removeAttribute('aria-selected');
    
    // Remove from DOM
    if (tab.parentNode) {
      tab.parentNode.removeChild(tab);
    }
    
    // Add to pool if not full
    if (this.tabPool.length < this.maxPoolSize) {
      this.tabPool.push(tab);
    }
  }

  /**
   * Get a button element from the pool or create a new one
   */
  getButton(): HTMLButtonElement {
    const button = this.buttonPool.pop();
    if (button) {
      this.stats.buttonsReused++;
      // Reset button state
      button.innerHTML = '';
      button.className = 'button';
      button.type = 'button';
      button.disabled = false;
      button.removeAttribute('aria-label');
      button.removeAttribute('title');
      return button;
    }
    
    this.stats.buttonsCreated++;
    const newButton = document.createElement('button');
    newButton.type = 'button';
    newButton.className = 'button';
    return newButton;
  }

  /**
   * Return a button element to the pool
   */
  returnButton(button: HTMLButtonElement): void {
    if (!button) return;
    
    // Clean up
    button.innerHTML = '';
    button.className = 'button';
    button.disabled = false;
    button.removeAttribute('aria-label');
    button.removeAttribute('title');
    
    // Remove from DOM
    if (button.parentNode) {
      button.parentNode.removeChild(button);
    }
    
    // Add to pool if not full
    if (this.buttonPool.length < this.maxPoolSize) {
      this.buttonPool.push(button);
    }
  }

  /**
   * Get a div element from the pool or create a new one
   */
  getDiv(): HTMLDivElement {
    const div = this.divPool.pop();
    if (div) {
      this.stats.divsReused++;
      // Reset div state
      div.innerHTML = '';
      div.className = '';
      div.removeAttribute('id');
      div.removeAttribute('data-id');
      return div;
    }
    
    this.stats.divsCreated++;
    return document.createElement('div');
  }

  /**
   * Return a div element to the pool
   */
  returnDiv(div: HTMLDivElement): void {
    if (!div) return;
    
    // Clean up
    div.innerHTML = '';
    div.className = '';
    div.removeAttribute('id');
    div.removeAttribute('data-id');
    
    // Remove from DOM
    if (div.parentNode) {
      div.parentNode.removeChild(div);
    }
    
    // Add to pool if not full
    if (this.divPool.length < this.maxPoolSize) {
      this.divPool.push(div);
    }
  }

  /**
   * Get a span element from the pool or create a new one
   */
  getSpan(): HTMLSpanElement {
    const span = this.spanPool.pop();
    if (span) {
      span.innerHTML = '';
      span.className = '';
      return span;
    }
    
    return document.createElement('span');
  }

  /**
   * Return a span element to the pool
   */
  returnSpan(span: HTMLSpanElement): void {
    if (!span || this.spanPool.length >= this.maxPoolSize) return;
    
    span.innerHTML = '';
    span.className = '';
    
    if (span.parentNode) {
      span.parentNode.removeChild(span);
    }
    
    this.spanPool.push(span);
  }

  /**
   * Get a link element from the pool or create a new one
   */
  getLink(): HTMLAnchorElement {
    const link = this.linkPool.pop();
    if (link) {
      link.href = '';
      link.innerHTML = '';
      link.className = '';
      link.removeAttribute('target');
      link.removeAttribute('rel');
      return link;
    }
    
    return document.createElement('a');
  }

  /**
   * Return a link element to the pool
   */
  returnLink(link: HTMLAnchorElement): void {
    if (!link || this.linkPool.length >= this.maxPoolSize) return;
    
    link.href = '';
    link.innerHTML = '';
    link.className = '';
    link.removeAttribute('target');
    link.removeAttribute('rel');
    
    if (link.parentNode) {
      link.parentNode.removeChild(link);
    }
    
    this.linkPool.push(link);
  }

  /**
   * Clear all pools (useful for memory management)
   */
  clear(): void {
    this.tabPool = [];
    this.buttonPool = [];
    this.divPool = [];
    this.spanPool = [];
    this.linkPool = [];
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      ...this.stats,
      poolSizes: {
        tabs: this.tabPool.length,
        buttons: this.buttonPool.length,
        divs: this.divPool.length,
        spans: this.spanPool.length,
        links: this.linkPool.length,
      },
      totalPooled: this.tabPool.length + this.buttonPool.length + this.divPool.length + 
                   this.spanPool.length + this.linkPool.length,
    };
  }

  /**
   * Set maximum pool size
   */
  setMaxPoolSize(size: number): void {
    this.maxPoolSize = Math.max(0, Math.min(100, size)); // Clamp between 0 and 100
    
    // Trim pools if needed
    if (this.tabPool.length > this.maxPoolSize) {
      this.tabPool = this.tabPool.slice(0, this.maxPoolSize);
    }
    if (this.buttonPool.length > this.maxPoolSize) {
      this.buttonPool = this.buttonPool.slice(0, this.maxPoolSize);
    }
    if (this.divPool.length > this.maxPoolSize) {
      this.divPool = this.divPool.slice(0, this.maxPoolSize);
    }
    if (this.spanPool.length > this.maxPoolSize) {
      this.spanPool = this.spanPool.slice(0, this.maxPoolSize);
    }
    if (this.linkPool.length > this.maxPoolSize) {
      this.linkPool = this.linkPool.slice(0, this.maxPoolSize);
    }
  }
}

// Singleton instance for global use
let redixPoolInstance: RedixPool | null = null;

/**
 * Get the global RedixPool instance
 */
export function getRedixPool(): RedixPool {
  if (!redixPoolInstance) {
    redixPoolInstance = new RedixPool();
  }
  return redixPoolInstance;
}

/**
 * Reset the global pool (useful for testing or memory cleanup)
 */
export function resetRedixPool(): void {
  if (redixPoolInstance) {
    redixPoolInstance.clear();
  }
  redixPoolInstance = null;
}

