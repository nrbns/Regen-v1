// Regen SystemAgent (Phase 3)
// Manages focus, battery, network, and agent coordination

import { SystemStateManager } from './systemState';

export class SystemAgent {
  private stateManager = new SystemStateManager();

  onFocusChange(status: 'active' | 'idle' | 'background') {
    this.stateManager.setState({ focus: status });
    // Notify agents of focus change
    console.log('[SystemAgent] Focus changed:', status);
  }

  onBatteryChange(status: 'charging' | 'discharging' | 'low' | 'full') {
    this.stateManager.setState({ battery: status });
    // Notify agents of battery change
    console.log('[SystemAgent] Battery status:', status);
  }

  onNetworkChange(status: 'online' | 'offline' | 'limited') {
    this.stateManager.setState({ network: status });
    // Notify agents of network change
    console.log('[SystemAgent] Network status:', status);
  }

  getState() {
    return this.stateManager.getState();
  }
}
