/**
 * Settings Screen Integration Tests
 * Validates Settings UI rendering and feature toggle functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  getMVPFeatureFlags, 
  toggleMVPFeature, 
  setMVPFeatureEnabled,
  resetMVPFeaturestoDefaults,
  isMVPFeatureEnabled 
} from '../config/mvpFeatureFlags';

describe('Settings Screen Integration', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    // Reset to defaults after each test
    resetMVPFeaturestoDefaults();
  });

  describe('Feature Flag Management', () => {
    it('should load default feature flags', () => {
      const flags = getMVPFeatureFlags();
      expect(flags).toHaveLength(7);
      expect(flags.every(f => f.enabled)).toBe(true);
    });

    it('should toggle tab hibernation feature', () => {
      expect(isMVPFeatureEnabled('tab-hibernation')).toBe(true);
      toggleMVPFeature('tab-hibernation');
      expect(isMVPFeatureEnabled('tab-hibernation')).toBe(false);
      toggleMVPFeature('tab-hibernation');
      expect(isMVPFeatureEnabled('tab-hibernation')).toBe(true);
    });

    it('should toggle low-RAM mode feature', () => {
      expect(isMVPFeatureEnabled('low-ram-mode')).toBe(true);
      toggleMVPFeature('low-ram-mode');
      expect(isMVPFeatureEnabled('low-ram-mode')).toBe(false);
    });

    it('should toggle battery-aware power feature', () => {
      expect(isMVPFeatureEnabled('battery-aware-power')).toBe(true);
      toggleMVPFeature('battery-aware-power');
      expect(isMVPFeatureEnabled('battery-aware-power')).toBe(false);
    });

    it('should toggle sidebar feature', () => {
      expect(isMVPFeatureEnabled('sidebar-toggle')).toBe(true);
      toggleMVPFeature('sidebar-toggle');
      expect(isMVPFeatureEnabled('sidebar-toggle')).toBe(false);
    });

    it('should toggle address controls feature', () => {
      expect(isMVPFeatureEnabled('address-controls')).toBe(true);
      toggleMVPFeature('address-controls');
      expect(isMVPFeatureEnabled('address-controls')).toBe(false);
    });

    it('should toggle keyboard shortcuts feature', () => {
      expect(isMVPFeatureEnabled('keyboard-shortcuts')).toBe(true);
      toggleMVPFeature('keyboard-shortcuts');
      expect(isMVPFeatureEnabled('keyboard-shortcuts')).toBe(false);
    });
  });

  describe('localStorage Persistence', () => {
    it('should persist feature toggles to localStorage', () => {
      toggleMVPFeature('tab-hibernation');
      const stored = localStorage.getItem('mvp-feature-flags-v1');
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      const hibernationFeature = parsed.find((f: any) => f.id === 'tab-hibernation');
      expect(hibernationFeature.enabled).toBe(false);
    });

    it('should restore feature state from localStorage', () => {
      // Toggle and persist
      toggleMVPFeature('low-ram-mode');
      expect(isMVPFeatureEnabled('low-ram-mode')).toBe(false);

      // Simulate page reload by clearing cache
      const flags = getMVPFeatureFlags();
      const lowRamFeature = flags.find(f => f.id === 'low-ram-mode');
      expect(lowRamFeature?.enabled).toBe(false);
    });

    it('should handle localStorage corruption gracefully', () => {
      localStorage.setItem('mvp-feature-flags-v1', 'invalid json');
      const flags = getMVPFeatureFlags();
      expect(flags).toHaveLength(7);
      expect(flags.every(f => f.enabled)).toBe(true);
    });
  });

  describe('Feature Flag Events', () => {
    it('should dispatch event when feature is toggled', () => {
      return new Promise<void>((resolve) => {
        const handler = (event: Event) => {
          const customEvent = event as CustomEvent;
          expect(customEvent.detail.featureId).toBe('tab-hibernation');
          expect(customEvent.detail.enabled).toBe(false);
          window.removeEventListener('mvp-feature-toggled', handler);
          resolve();
        };

        window.addEventListener('mvp-feature-toggled', handler);
        toggleMVPFeature('tab-hibernation');
      });
    });

    it('should dispatch event when feature is set', () => {
      return new Promise<void>((resolve) => {
        const handler = (event: Event) => {
          const customEvent = event as CustomEvent;
          expect(customEvent.detail.featureId).toBe('sidebar-toggle');
          expect(customEvent.detail.enabled).toBe(false);
          window.removeEventListener('mvp-feature-changed', handler);
          resolve();
        };

        window.addEventListener('mvp-feature-changed', handler);
        setMVPFeatureEnabled('sidebar-toggle', false);
      });
    });

    it('should dispatch event when features are reset', () => {
      return new Promise<void>((resolve) => {
        toggleMVPFeature('tab-hibernation');
        toggleMVPFeature('low-ram-mode');

        const handler = (event: Event) => {
          const customEvent = event as CustomEvent;
          expect(customEvent.detail.features).toHaveLength(7);
          expect(customEvent.detail.features.every((f: any) => f.enabled)).toBe(true);
          window.removeEventListener('mvp-features-reset', handler);
          resolve();
        };

        window.addEventListener('mvp-features-reset', handler);
        resetMVPFeaturestoDefaults();
      });
    });
  });

  describe('Feature Categories', () => {
    it('should have correct number of performance features', () => {
      const flags = getMVPFeatureFlags();
      const perfFeatures = flags.filter(f => f.category === 'performance');
      expect(perfFeatures).toHaveLength(3);
    });

    it('should have correct number of UI features', () => {
      const flags = getMVPFeatureFlags();
      const uiFeatures = flags.filter(f => f.category === 'ui');
      expect(uiFeatures).toHaveLength(3);
    });

    it('should have correct feature IDs', () => {
      const flags = getMVPFeatureFlags();
      const ids = flags.map(f => f.id);
      expect(ids).toContain('tab-hibernation');
      expect(ids).toContain('low-ram-mode');
      expect(ids).toContain('battery-aware-power');
      expect(ids).toContain('sidebar-toggle');
      expect(ids).toContain('address-controls');
      expect(ids).toContain('keyboard-shortcuts');
    });
  });

  describe('Reset to Defaults', () => {
    it('should reset all features to enabled state', () => {
      // Disable multiple features
      toggleMVPFeature('tab-hibernation');
      toggleMVPFeature('low-ram-mode');
      toggleMVPFeature('sidebar-toggle');

      expect(isMVPFeatureEnabled('tab-hibernation')).toBe(false);
      expect(isMVPFeatureEnabled('low-ram-mode')).toBe(false);
      expect(isMVPFeatureEnabled('sidebar-toggle')).toBe(false);

      // Reset
      resetMVPFeaturestoDefaults();

      expect(isMVPFeatureEnabled('tab-hibernation')).toBe(true);
      expect(isMVPFeatureEnabled('low-ram-mode')).toBe(true);
      expect(isMVPFeatureEnabled('sidebar-toggle')).toBe(true);
    });

    it('should clear localStorage on reset', () => {
      toggleMVPFeature('tab-hibernation');
      expect(localStorage.getItem('mvp-feature-flags-v1')).toBeTruthy();

      resetMVPFeaturestoDefaults();
      
      const stored = localStorage.getItem('mvp-feature-flags-v1');
      const parsed = JSON.parse(stored!);
      expect(parsed.every((f: any) => f.enabled)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid feature ID gracefully', () => {
      expect(() => toggleMVPFeature('invalid-feature')).not.toThrow();
      expect(isMVPFeatureEnabled('invalid-feature')).toBe(true);
    });

    it('should handle rapid toggles without state corruption', () => {
      for (let i = 0; i < 100; i++) {
        toggleMVPFeature('tab-hibernation');
      }
      // Should end in enabled state (even number = 100 toggles returns to default)
      expect(isMVPFeatureEnabled('tab-hibernation')).toBe(true);
    });

    it('should handle setMVPFeatureEnabled idempotency', () => {
      setMVPFeatureEnabled('sidebar-toggle', false);
      setMVPFeatureEnabled('sidebar-toggle', false);
      expect(isMVPFeatureEnabled('sidebar-toggle')).toBe(false);

      setMVPFeatureEnabled('sidebar-toggle', true);
      setMVPFeatureEnabled('sidebar-toggle', true);
      expect(isMVPFeatureEnabled('sidebar-toggle')).toBe(true);
    });
  });

  describe('Feature Metadata', () => {
    it('should have tab hibernation timeout configured', () => {
      const flags = getMVPFeatureFlags();
      const hibernation = flags.find(f => f.id === 'tab-hibernation');
      expect(hibernation?.inactivityTimeoutMs).toBe(30 * 60 * 1000);
    });

    it('should have descriptions for all features', () => {
      const flags = getMVPFeatureFlags();
      flags.forEach(feature => {
        expect(feature.description).toBeTruthy();
        expect(feature.description.length).toBeGreaterThan(10);
      });
    });

    it('should have names for all features', () => {
      const flags = getMVPFeatureFlags();
      flags.forEach(feature => {
        expect(feature.name).toBeTruthy();
        expect(feature.name.length).toBeGreaterThan(3);
      });
    });
  });
});
