/**
 * Sample Plugin Worker
 * Example implementation of an OmniBrowser plugin
 */

import { OBHost, OBPlugin } from '../../shared/api';

class SamplePlugin implements OBPlugin {
  private host: OBHost | null = null;
  
  async init(host: OBHost): Promise<void> {
    this.host = host;
    
    console.log('[SamplePlugin] Initialized');
    
    // Example: Subscribe to events
    if (host.events) {
      host.events.on('tab:activated', (...args: unknown[]) => {
        const tabId = args[0] as string;
        console.log('[SamplePlugin] Tab activated:', tabId);
      });
    }
    
    // Example: Store some data
    if (host.storage) {
      await host.storage.set('initialized', new Date().toISOString());
    }
  }
  
  async dispose(): Promise<void> {
    console.log('[SamplePlugin] Disposed');
  }
}

// Export for plugin loader
export default SamplePlugin;

