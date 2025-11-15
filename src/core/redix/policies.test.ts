/**
 * Redix Policies Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  policyEngine,
  setPolicyMode,
  getPolicyMode,
  updatePolicyMetrics,
  shouldAllowPolicy,
  getPolicyRecommendations,
} from './policies';

describe('Redix Policies', () => {
  beforeEach(() => {
    // Reset to default mode
    setPolicyMode('default');
    updatePolicyMetrics({});
  });

  describe('Policy Modes', () => {
    it('should default to default mode', () => {
      expect(getPolicyMode()).toBe('default');
    });

    it('should change mode', () => {
      setPolicyMode('performance');
      expect(getPolicyMode()).toBe('performance');
    });

    it('should load correct policy rules', () => {
      setPolicyMode('battery');
      const rules = policyEngine.getActivePolicies();
      expect(rules.suspendAfterMinutes).toBeLessThan(12); // Battery mode should suspend faster
    });
  });

  describe('Policy Evaluation', () => {
    it('should disable prefetch when not on WiFi', () => {
      setPolicyMode('performance');
      updatePolicyMetrics({ isWifi: false });
      
      const allowed = shouldAllowPolicy('prefetch');
      expect(allowed).toBe(false);
    });

    it('should disable prefetch when battery is low', () => {
      setPolicyMode('default');
      updatePolicyMetrics({
        batteryLevel: 15, // Below threshold
        isWifi: true,
      });
      
      const allowed = shouldAllowPolicy('prefetch');
      expect(allowed).toBe(false);
    });

    it('should allow prefetch when conditions are met', () => {
      setPolicyMode('default');
      updatePolicyMetrics({
        batteryLevel: 50,
        isWifi: true,
      });
      
      const allowed = shouldAllowPolicy('prefetch');
      expect(allowed).toBe(true);
    });
  });

  describe('Recommendations', () => {
    it('should recommend closing tabs when memory is high', () => {
      updatePolicyMetrics({ memoryUsage: 85 }); // Above threshold
      const recommendations = getPolicyRecommendations();
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0]).toContain('memory');
    });

    it('should recommend battery actions when battery is low', () => {
      updatePolicyMetrics({ batteryLevel: 15 });
      const recommendations = getPolicyRecommendations();
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0]).toContain('Battery');
    });
  });
});

