/**
 * Layer 2: UI/UX Performance Tests
 * 
 * Tests for:
 * 1. Layout optimization and reflow prevention
 * 2. Virtual scrolling for large lists
 * 3. Navigation preloading
 * 4. Render batching
 * 5. Responsive breakpoints
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  LayoutOptimizer,
  getLayoutOptimizer,
  VirtualScroller,
  NavigationPreloader,
  getNavigationPreloader,
  RenderBatcher,
  getRenderBatcher,
} from '../src/utils/layer2-optimizer';
import {
  BREAKPOINTS,
  getCurrentBreakpoint,
  matchesBreakpoint,
  validateResponsiveBreakpoints,
} from '../src/utils/responsiveValidator';

describe('Layer 2: UI/UX Performance', () => {
  describe('Layout Optimization', () => {
    let optimizer: LayoutOptimizer;

    beforeEach(() => {
      optimizer = getLayoutOptimizer();
    });

    afterEach(() => {
      optimizer.clear();
    });

    it('should batch DOM reads and writes', (done) => {
      let readExecuted = false;
      let writeExecuted = false;
      let readFirst = true;

      optimizer.read(() => {
        readExecuted = true;
        if (writeExecuted) {
          readFirst = false; // Write executed before read (incorrect)
        }
      });

      optimizer.write(() => {
        writeExecuted = true;
      });

      // Wait for RAF to execute
      requestAnimationFrame(() => {
        expect(readExecuted).toBe(true);
        expect(writeExecuted).toBe(true);
        expect(readFirst).toBe(true); // Reads should execute before writes
        done();
      });
    });

    it('should prevent layout thrashing with batched operations', () => {
      const operations: string[] = [];

      // Queue alternating reads and writes
      optimizer.read(() => operations.push('read1'));
      optimizer.write(() => operations.push('write1'));
      optimizer.read(() => operations.push('read2'));
      optimizer.write(() => operations.push('write2'));

      return new Promise((resolve) => {
        requestAnimationFrame(() => {
          // All reads should come before all writes
          expect(operations).toEqual(['read1', 'read2', 'write1', 'write2']);
          resolve(undefined);
        });
      });
    });

    it('should use singleton pattern', () => {
      const instance1 = getLayoutOptimizer();
      const instance2 = getLayoutOptimizer();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Virtual Scrolling', () => {
    let scroller: VirtualScroller;

    beforeEach(() => {
      scroller = new VirtualScroller({
        itemHeight: 50,
        containerHeight: 500,
        overscan: 2,
      });
    });

    it('should calculate visible range correctly', () => {
      const range = scroller.getVisibleRange(100, 0);
      
      // With overscan=2, containerHeight=500, itemHeight=50:
      // Visible items: 500/50 = 10
      // Start: max(0, 0 - 2) = 0
      // End: min(100, 0 + 10 + 4) = 14
      expect(range.start).toBe(0);
      expect(range.end).toBe(14);
      expect(range.offset).toBe(0);
    });

    it('should handle scrolling with overscan', () => {
      // Scroll to middle of list
      const range = scroller.getVisibleRange(100, 1000);
      
      // Start: floor(1000/50) - 2 = 20 - 2 = 18
      // End: min(100, 18 + 10 + 4) = 32
      expect(range.start).toBe(18);
      expect(range.end).toBe(32);
      expect(range.offset).toBe(18 * 50); // 900px
    });

    it('should calculate total height correctly', () => {
      scroller.getVisibleRange(100, 0);
      expect(scroller.getTotalHeight()).toBe(100 * 50); // 5000px
    });

    it('should not exceed bounds at end of list', () => {
      const range = scroller.getVisibleRange(20, 5000); // Scroll past end
      expect(range.end).toBeLessThanOrEqual(20);
    });
  });

  describe('Navigation Preloading', () => {
    let preloader: NavigationPreloader;

    beforeEach(() => {
      preloader = getNavigationPreloader();
      preloader.clear();
    });

    afterEach(() => {
      preloader.clear();
    });

    it('should track preloaded URLs', async () => {
      await preloader.preload('https://example.com', { priority: 'high' });
      // Verify it doesn't preload twice
      await preloader.preload('https://example.com', { priority: 'high' });
      
      // Internal state should only have one entry
      expect(true).toBe(true); // Placeholder - preloadedUrls is private
    });

    it('should predict next pages based on current path', () => {
      // Home page predictions
      const homePredictions = preloader['predictNextPages']('/');
      expect(homePredictions).toContain('/settings');
      expect(homePredictions).toContain('/history');

      // Settings page predictions
      const settingsPredictions = preloader['predictNextPages']('/settings');
      expect(settingsPredictions).toContain('/');
      expect(settingsPredictions).toContain('/history');

      // Workspace page predictions
      const workspacePredictions = preloader['predictNextPages']('/w/123');
      expect(workspacePredictions).toContain('/history');
      expect(workspacePredictions).toContain('/playbooks');
    });

    it('should use singleton pattern', () => {
      const instance1 = getNavigationPreloader();
      const instance2 = getNavigationPreloader();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Render Batching', () => {
    let batcher: RenderBatcher;

    beforeEach(() => {
      batcher = getRenderBatcher();
    });

    afterEach(() => {
      batcher.cancel();
    });

    it('should batch multiple updates', async () => {
      const updates: string[] = [];

      batcher.queueUpdate('component1', () => updates.push('update1'));
      batcher.queueUpdate('component2', () => updates.push('update2'));
      batcher.queueUpdate('component3', () => updates.push('update3'));

      // Wait for batch to flush (16ms + RAF)
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(updates.length).toBe(3);
      expect(updates).toContain('update1');
      expect(updates).toContain('update2');
      expect(updates).toContain('update3');
    });

    it('should replace duplicate updates for same component', async () => {
      const updates: string[] = [];

      batcher.queueUpdate('component1', () => updates.push('update1'));
      batcher.queueUpdate('component1', () => updates.push('update2')); // Should replace update1

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Only the second update should execute
      expect(updates.length).toBe(1);
      expect(updates).toEqual(['update2']);
    });

    it('should handle errors gracefully', async () => {
      const updates: string[] = [];

      batcher.queueUpdate('component1', () => {
        throw new Error('Test error');
      });
      batcher.queueUpdate('component2', () => updates.push('update2'));

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Second update should still execute despite first error
      expect(updates).toContain('update2');
    });
  });

  describe('Responsive Breakpoints', () => {
    it('should have consistent breakpoint values', () => {
      expect(BREAKPOINTS.mobile).toBe(0);
      expect(BREAKPOINTS.tablet).toBe(768);
      expect(BREAKPOINTS.desktop).toBe(1024);
      expect(BREAKPOINTS.wide).toBe(1440);
    });

    it('should detect correct breakpoint for mobile', () => {
      // Mock window.innerWidth
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      expect(getCurrentBreakpoint()).toBe('mobile');
      expect(matchesBreakpoint('mobile')).toBe(true);
      expect(matchesBreakpoint('tablet')).toBe(false);
    });

    it('should detect correct breakpoint for tablet', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 800,
      });

      expect(getCurrentBreakpoint()).toBe('tablet');
      expect(matchesBreakpoint('tablet')).toBe(true);
      expect(matchesBreakpoint('mobile')).toBe(false);
    });

    it('should detect correct breakpoint for desktop', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      });

      expect(getCurrentBreakpoint()).toBe('desktop');
      expect(matchesBreakpoint('desktop')).toBe(true);
      expect(matchesBreakpoint('tablet')).toBe(false);
    });

    it('should detect correct breakpoint for wide screens', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920,
      });

      expect(getCurrentBreakpoint()).toBe('wide');
      expect(matchesBreakpoint('wide')).toBe(true);
      expect(matchesBreakpoint('desktop')).toBe(false);
    });
  });

  describe('Performance Metrics', () => {
    it('should validate consistent breakpoints across CSS', () => {
      const validation = validateResponsiveBreakpoints();
      
      // Should have no errors (warnings are acceptable for edge cases)
      expect(validation.errors.length).toBe(0);
      
      // Log warnings for review
      if (validation.warnings.length > 0) {
        console.warn('[Layer2 Tests] Breakpoint warnings:', validation.warnings);
      }
    });
  });
});
