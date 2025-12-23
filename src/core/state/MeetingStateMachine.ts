// MeetingStateMachine.ts
// Event-driven meeting state machine for connection health
// States: CONNECTED, DEGRADED, OFFLINE, RECOVERED

import { eventBus } from './eventBus';

export type MeetingState = 'CONNECTED' | 'DEGRADED' | 'OFFLINE' | 'RECOVERED';

class MeetingStateMachine {
  // Reset state for testing
  public reset() {
    this.state = 'OFFLINE';
    this.lastOnline = 0;
    if (this.degradeTimeout) clearTimeout(this.degradeTimeout);
    if (this.offlineTimeout) clearTimeout(this.offlineTimeout);
    this.degradeTimeout = null;
    this.offlineTimeout = null;
  }
  private state: MeetingState = 'OFFLINE';
  private lastOnline: number = 0;
  private degradeTimeout: any = null;
  private offlineTimeout: any = null;

  constructor() {
    // Listen to connection events
    // Debounce connection:status to avoid rapid flapping
    let lastStatus: boolean | null = null;
    let debounceTimer: any = null;
    eventBus.on('connection:status', (isConnected: boolean) => {
      if (lastStatus === isConnected) return;
      lastStatus = isConnected;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        // If currently OFFLINE and isConnected, always allow transition to CONNECTED
        if (isConnected) {
          if (this.state !== 'CONNECTED') {
            this.transition('CONNECTED');
          }
        } else {
          if (this.state !== 'OFFLINE') {
            this.transition('OFFLINE');
          }
        }
      }, 100); // 100ms debounce to prevent race/flap
    });
    // Listen to explicit degrade events (e.g., high latency, packet loss)
    // Only allow degrade if not already degraded or offline
    eventBus.on('connection:degraded', () => {
      if (this.state !== 'DEGRADED' && this.state !== 'OFFLINE') {
        this.transition('DEGRADED');
      }
    });
    // Listen to explicit recover events
    // Only allow recover if currently degraded or offline
    eventBus.on('connection:recovered', () => {
      if (this.state === 'DEGRADED' || this.state === 'OFFLINE') {
        this.transition('RECOVERED');
      }
    });
  }

  getState() {
    return this.state;
  }

  private transition(next: MeetingState) {
    if (this.state === next) return;
    // Prevent illegal transitions (e.g., RECOVERED from CONNECTED)
    if (next === 'RECOVERED' && this.state === 'CONNECTED') return;
    this.state = next;
    eventBus.emit('meeting:state', this.state);
    if (next === 'CONNECTED') {
      this.lastOnline = Date.now();
      if (this.degradeTimeout) clearTimeout(this.degradeTimeout);
      if (this.offlineTimeout) clearTimeout(this.offlineTimeout);
      // Schedule degrade if no activity for 10s
      this.degradeTimeout = setTimeout(() => {
        if (this.state === 'CONNECTED') this.transition('DEGRADED');
      }, 10000);
    } else if (next === 'DEGRADED') {
      if (this.offlineTimeout) clearTimeout(this.offlineTimeout);
      // Schedule offline if no recovery for 10s
      this.offlineTimeout = setTimeout(() => {
        if (this.state === 'DEGRADED') this.transition('OFFLINE');
      }, 10000);
    } else if (next === 'OFFLINE') {
      if (this.degradeTimeout) clearTimeout(this.degradeTimeout);
      if (this.offlineTimeout) clearTimeout(this.offlineTimeout);
    } else if (next === 'RECOVERED') {
      // After recovery, go to CONNECTED
      setTimeout(() => {
        if (this.state === 'RECOVERED') this.transition('CONNECTED');
      }, 2000);
    }
  }
}

export const meetingStateMachine = new MeetingStateMachine();
