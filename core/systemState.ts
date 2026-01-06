// Regen System State: battery, network, focus

export type SystemState = {
  battery: 'charging' | 'discharging' | 'low' | 'full';
  network: 'online' | 'offline' | 'limited';
  focus: 'active' | 'idle' | 'background';
  updatedAt: number;
};

export class SystemStateManager {
  private state: SystemState = {
    battery: 'full',
    network: 'online',
    focus: 'active',
    updatedAt: Date.now(),
  };

  setState(partial: Partial<SystemState>) {
    this.state = { ...this.state, ...partial, updatedAt: Date.now() };
  }

  getState(): SystemState {
    return this.state;
  }
}
