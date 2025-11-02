/**
 * Mode Agents Registry
 */

import { ResearchAgent } from './research-agent';
import { DevAgent } from './dev-agent';
import { ImageAgent } from './image-agent';
import { TradeAgent } from './trade-agent';
import { GameAgent } from './game-agent';

export type ModeAgentType = 'research' | 'dev' | 'image' | 'trade' | 'game';

export class ModeAgentRegistry {
  private agents = new Map<ModeAgentType, any>();

  constructor() {
    // Initialize all agents
    this.agents.set('research', new ResearchAgent());
    this.agents.set('dev', new DevAgent());
    this.agents.set('image', new ImageAgent());
    this.agents.set('trade', new TradeAgent());
    this.agents.set('game', new GameAgent());
  }

  get(type: ModeAgentType): any {
    return this.agents.get(type);
  }

  getAll(): Map<ModeAgentType, any> {
    return new Map(this.agents);
  }
}

// Singleton instance
let modeAgentRegistryInstance: ModeAgentRegistry | null = null;

export function getModeAgentRegistry(): ModeAgentRegistry {
  if (!modeAgentRegistryInstance) {
    modeAgentRegistryInstance = new ModeAgentRegistry();
  }
  return modeAgentRegistryInstance;
}

