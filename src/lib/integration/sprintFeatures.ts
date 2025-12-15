/**
 * Sprint Features Integration
 * Initialize all features from the 15-day sprint
 */

import { getAdblockerService } from '../../services/adblocker/service';
import { getSkillRegistry } from '../../services/skills/registry';

/**
 * Initialize all sprint features
 */
export async function initializeSprintFeatures(): Promise<void> {
  try {
    // Initialize Adblocker
    try {
      const adblockerService = getAdblockerService();
      await adblockerService.initialize();
      console.log('[Sprint Features] Adblocker initialized');
    } catch (error) {
      console.warn('[Sprint Features] Failed to initialize adblocker:', error);
    }

    // Initialize Skills Registry
    try {
      getSkillRegistry(); // Registry auto-initializes on construction
      console.log('[Sprint Features] Skills engine initialized');

      // Register built-in skills (lazy load)
      try {
        const { registerGmailSkill } = await import('../../services/skills/gmail/integration');
        await registerGmailSkill();
      } catch (error) {
        console.warn('[Sprint Features] Gmail skill not available:', error);
      }

      try {
        const { registerCalendarSkill } =
          await import('../../services/skills/calendar/integration');
        await registerCalendarSkill();
      } catch (error) {
        console.warn('[Sprint Features] Calendar skill not available:', error);
      }
    } catch (error) {
      console.warn('[Sprint Features] Skills not available:', error);
    }

    // Initialize Sync Service (lazy load)
    try {
      const syncModule = await import('../../services/sync/syncIntegration').catch(() => null);
      if (syncModule?.initializeSyncService) {
        await syncModule.initializeSyncService();
        console.log('[Sprint Features] Sync service initialized');
      }
    } catch (error) {
      console.warn('[Sprint Features] Sync not available:', error);
    }

    // Initialize Redix (Green Intelligence Engine) - lazy load
    try {
      const redixModule = await import('../../lib/redix-mode').catch(() => null);
      if (redixModule?.isRedixMode && redixModule.isRedixMode()) {
        if (redixModule.initializeRedixOptimizer) {
          await redixModule.initializeRedixOptimizer();
          console.log('[Sprint Features] Redix optimizer initialized');
        }

        // Initialize Redix WebSocket connection (optional, falls back to HTTP)
        const redixWSModule = await import('../../services/redixWs').catch(() => null);
        if (redixWSModule?.getRedixWS) {
          redixWSModule.getRedixWS(); // Lazy connection
          console.log('[Sprint Features] Redix WebSocket client ready');
        }
      } else {
        console.log('[Sprint Features] Redix mode disabled - skipping initialization');
      }
    } catch (error) {
      console.warn('[Sprint Features] Redix not available:', error);
      // Redix is optional - don't fail startup
    }

    // Initialize VPN Service (lazy load)
    try {
      const vpnModule = await import('../../services/vpn').catch(() => null);
      if (vpnModule?.getVPNService) {
        const vpnService = vpnModule.getVPNService();
        // VPN service auto-initializes on first use, but we can pre-initialize here
        await vpnService.checkStatus().catch(() => {
          // Ignore errors - VPN may not be configured yet
        });
        console.log('[Sprint Features] VPN service ready');
      }
    } catch (error) {
      console.warn('[Sprint Features] VPN not available:', error);
      // VPN is optional - don't fail startup
    }

    console.log('[Sprint Features] All features initialized successfully');
  } catch (error) {
    console.error('[Sprint Features] Error initializing features:', error);
  }
}

/**
 * Initialize sprint features after app load
 */
export function initializeSprintFeaturesDeferred(): void {
  // Initialize after first paint
  if (typeof window !== 'undefined') {
    if (window.requestIdleCallback) {
      requestIdleCallback(
        () => {
          initializeSprintFeatures().catch(console.error);
        },
        { timeout: 3000 }
      );
    } else {
      setTimeout(() => {
        initializeSprintFeatures().catch(console.error);
      }, 2000);
    }
  }
}
