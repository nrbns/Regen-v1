/**
 * Execution Layer Manager
 *
 * Manages 4-tier architecture:
 * - L0: Regen Core (Always ON) - Chrome-speed browsing
 * - L1: Browser Intelligence (Warm Load) - Light AI features
 * - L2: Agent & Job System (Cold Load) - Heavy architecture features
 * - L3: Recovery + Heavy State (Dormant) - Recovery system
 */

export type ExecutionLayer = 'L0' | 'L1' | 'L2' | 'L3';

export type LayerMode =
  | 'Browse'
  | 'Research'
  | 'Trade'
  | 'Games'
  | 'Docs'
  | 'Images'
  | 'Threats'
  | 'GraphMind';

export interface LayerConfig {
  layer: ExecutionLayer;
  name: string;
  description: string;
  targetMemoryMB: number;
  alwaysRunning: boolean;
  allowedFeatures: string[];
  restrictedFeatures: string[];
}

export const LAYER_CONFIGS: Record<ExecutionLayer, LayerConfig> = {
  L0: {
    layer: 'L0',
    name: 'Regen Core',
    description: 'Chrome-speed browsing - minimal footprint',
    targetMemoryMB: 35,
    alwaysRunning: true,
    allowedFeatures: [
      'tabs',
      'address-bar',
      'history',
      'cache',
      'bookmarks',
      'ui-shell',
      'feature-flags',
      'plugin-loader',
      'auto-updater',
    ],
    restrictedFeatures: [
      'socket-io',
      'jobs',
      'ai-agents',
      'zustand-browsing',
      'background-loops',
      'langchain',
      'ollama',
    ],
  },
  L1: {
    layer: 'L1',
    name: 'Browser Intelligence',
    description: 'Light intelligence while browsing',
    allowedFeatures: [
      'command-bar-ai',
      'page-summarization',
      'explain-page',
      'translate',
      'highlight',
      'annotate',
      'small-offline-models',
    ],
    restrictedFeatures: ['socket-io', 'node-backend', 'long-jobs'],
    targetMemoryMB: 50,
    alwaysRunning: false,
  },
  L2: {
    layer: 'L2',
    name: 'Agent & Job System',
    description: 'Heavy architecture features - spawned on demand',
    allowedFeatures: [
      'research-mode',
      'trade-mode',
      'job-timeline',
      'action-log',
      'langchain-agents',
      'streaming-reasoning',
      'tool-selection',
      'ollama',
      'external-apis',
      'multi-step-jobs',
      'socket-io',
      'node-backend',
    ],
    restrictedFeatures: [],
    targetMemoryMB: 200,
    alwaysRunning: false,
  },
  L3: {
    layer: 'L3',
    name: 'Recovery + Heavy State',
    description: 'Recovery system - dormant unless jobs exist',
    allowedFeatures: [
      'job-registry',
      'checkpoints',
      'reasoning-logs',
      'redis',
      'sqlite',
      'resume-restart',
      'confidence-tracking',
      'snapshots',
    ],
    restrictedFeatures: [],
    targetMemoryMB: 100,
    alwaysRunning: false,
  },
};

/**
 * Maps modes to execution layers
 */
export const MODE_TO_LAYER: Record<LayerMode, ExecutionLayer> = {
  Browse: 'L0',
  Research: 'L2',
  Trade: 'L2',
  Games: 'L0',
  Docs: 'L1',
  Images: 'L0',
  Threats: 'L2',
  GraphMind: 'L2',
};

class LayerManager {
  private currentLayer: ExecutionLayer = 'L0';
  private activeModes: Set<LayerMode> = new Set(['Browse']);
  private layerListeners: Map<ExecutionLayer, Set<() => void>> = new Map();
  private featureGate: Map<string, ExecutionLayer[]> = new Map();

  /**
   * Get current execution layer
   */
  getCurrentLayer(): ExecutionLayer {
    return this.currentLayer;
  }

  /**
   * Check if a feature is allowed in current layer
   */
  isFeatureAllowed(feature: string): boolean {
    const config = LAYER_CONFIGS[this.currentLayer];
    if (config.allowedFeatures.includes(feature)) {
      return true;
    }
    if (config.restrictedFeatures.includes(feature)) {
      return false;
    }
    // Check if feature requires higher layer
    const requiredLayer = this.featureGate.get(feature);
    if (requiredLayer) {
      return requiredLayer.includes(this.currentLayer);
    }
    // Default: allow if not explicitly restricted
    return true;
  }

  /**
   * Register a feature with layer requirements
   */
  registerFeature(feature: string, requiredLayers: ExecutionLayer[]): void {
    this.featureGate.set(feature, requiredLayers);
  }

  /**
   * Switch to a mode and activate required layer
   */
  async switchToMode(mode: LayerMode): Promise<void> {
    const requiredLayer = MODE_TO_LAYER[mode];

    if (requiredLayer === this.currentLayer && this.activeModes.has(mode)) {
      return; // Already in correct layer
    }

    // If switching to a lower layer, we can stay in higher layer
    // But if switching to higher layer, we need to activate it
    const layerOrder: ExecutionLayer[] = ['L0', 'L1', 'L2', 'L3'];
    const currentLayerIndex = layerOrder.indexOf(this.currentLayer);
    const requiredLayerIndex = layerOrder.indexOf(requiredLayer);

    if (requiredLayerIndex > currentLayerIndex) {
      await this.activateLayer(requiredLayer);
    }

    this.activeModes.add(mode);

    // Update current layer if this is the primary mode
    if (mode !== 'Browse' || this.activeModes.size === 1) {
      this.currentLayer = requiredLayer;
    }

    this.notifyLayerChange();
  }

  /**
   * Exit a mode and potentially deactivate layer
   */
  async exitMode(mode: LayerMode): Promise<void> {
    const oldLayer = this.currentLayer;
    this.activeModes.delete(mode);

    // If no modes requiring higher layers, deactivate
    const highestRequiredLayer = this.getHighestRequiredLayer();

    if (
      this.activeModes.size === 0 ||
      (this.activeModes.size === 1 && this.activeModes.has('Browse'))
    ) {
      // Back to L0
      if (this.currentLayer !== 'L0') {
        await this.deactivateLayer(this.currentLayer);
        this.currentLayer = 'L0';
      }
    } else if (highestRequiredLayer !== null && highestRequiredLayer !== this.currentLayer) {
      // Switch to the highest required layer
      if (this.currentLayer !== highestRequiredLayer) {
        // Deactivate current if it's higher than required
        const layerOrder: ExecutionLayer[] = ['L0', 'L1', 'L2', 'L3'];
        const currentIndex = layerOrder.indexOf(this.currentLayer);
        const requiredIndex = layerOrder.indexOf(highestRequiredLayer);

        if (currentIndex > requiredIndex) {
          await this.deactivateLayer(this.currentLayer);
        }
        this.currentLayer = highestRequiredLayer;
      }
    }

    if (oldLayer !== this.currentLayer) {
      this.notifyLayerChange();
    }
  }

  /**
   * Get highest layer required by active modes
   */
  private getHighestRequiredLayer(): ExecutionLayer | null {
    if (this.activeModes.size === 0) return 'L0';

    let highest: ExecutionLayer = 'L0';
    for (const mode of this.activeModes) {
      const layer = MODE_TO_LAYER[mode];
      const layerOrder: ExecutionLayer[] = ['L0', 'L1', 'L2', 'L3'];
      if (layerOrder.indexOf(layer) > layerOrder.indexOf(highest)) {
        highest = layer;
      }
    }
    return highest;
  }

  /**
   * Activate a layer (load required services)
   */
  private async activateLayer(layer: ExecutionLayer): Promise<void> {
    console.log(`[LayerManager] Activating layer ${layer}`);

    switch (layer) {
      case 'L1':
        await this.activateL1();
        break;
      case 'L2':
        await this.activateL2();
        break;
      case 'L3':
        await this.activateL3();
        break;
    }
  }

  /**
   * Deactivate a layer (unload services)
   */
  private async deactivateLayer(layer: ExecutionLayer): Promise<void> {
    console.log(`[LayerManager] Deactivating layer ${layer}`);

    switch (layer) {
      // L1 does not require explicit deactivation
      case 'L2':
        await this.deactivateL2();
        break;
      case 'L3':
        await this.deactivateL3();
        break;
    }
  }

  /**
   * Activate L1 - Browser Intelligence
   */
  private async activateL1(): Promise<void> {
    // L1 features are loaded on-demand via Tauri invoke()
    // No heavy initialization needed here
    console.log('[LayerManager] L1 ready (on-demand loading)');
  }

  /**
   * Activate L2 - Agent & Job System
   */
  private async activateL2(): Promise<void> {
    // Spawn agent service, connect Socket.IO, initialize LangChain
    const { spawnAgentService } = await import('./agentService');
    await spawnAgentService();

    // Initialize Socket.IO for L2
    const { initSocketClient } = await import('../../services/realtime/socketClient');
    const token = localStorage.getItem('auth:token');
    try {
      await initSocketClient({
        url: import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000',
        token,
        deviceId: `agent-${Date.now()}`,
      });
      console.log('[LayerManager] L2 Socket.IO connected');
    } catch (error) {
      console.warn('[LayerManager] L2 Socket.IO connection failed (optional):', error);
    }
  }

  /**
   * Deactivate L2 - Kill agent service, disconnect Socket.IO
   */
  private async deactivateL2(): Promise<void> {
    // Disconnect Socket.IO
    try {
      const { closeSocketClient } = await import('../../services/realtime/socketClient');
      closeSocketClient();
      console.log('[LayerManager] L2 Socket.IO disconnected');
    } catch (error) {
      console.warn('[LayerManager] L2 Socket.IO disconnect error:', error);
    }

    // Kill agent service
    try {
      const { killAgentService } = await import('./agentService');
      await killAgentService();
      console.log('[LayerManager] L2 agent service killed');
    } catch (error) {
      console.warn('[LayerManager] L2 agent service kill error:', error);
    }
  }

  /**
   * Activate L3 - Recovery System
   */
  private async activateL3(): Promise<void> {
    // L3 is only activated when jobs exist
    // Recovery system is already initialized, just needs to be "awakened"
    console.log('[LayerManager] L3 activated (recovery system awake)');
  }

  /**
   * Deactivate L3 - Put recovery system to sleep
   */
  private async deactivateL3(): Promise<void> {
    // Recovery system stays in memory but stops polling/processing
    console.log('[LayerManager] L3 deactivated (recovery system dormant)');
  }

  /**
   * Subscribe to layer changes
   */
  onLayerChange(layer: ExecutionLayer, callback: () => void): () => void {
    if (!this.layerListeners.has(layer)) {
      this.layerListeners.set(layer, new Set());
    }
    this.layerListeners.get(layer)!.add(callback);

    return () => {
      this.layerListeners.get(layer)?.delete(callback);
    };
  }

  /**
   * Notify listeners of layer change
   */
  private notifyLayerChange(): void {
    const listeners = this.layerListeners.get(this.currentLayer);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback();
        } catch (error) {
          console.error('[LayerManager] Layer change listener error:', error);
        }
      });
    }
  }

  /**
   * Get layer config
   */
  getLayerConfig(layer?: ExecutionLayer): LayerConfig {
    return LAYER_CONFIGS[layer || this.currentLayer];
  }
}

// Singleton instance
export const layerManager = new LayerManager();

// Initialize - always start in L0
layerManager.switchToMode('Browse').catch(console.error);
