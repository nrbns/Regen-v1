// Regen OS-like Runtime Authority
// Central event/task router for all AI and agent operations

export type RuntimeTask = {
  id: string;
  type: string;
  payload: any;
  source: string;
  createdAt: number;
};

export type RuntimeEvent = {
  id: string;
  type: string;
  payload: any;
  source: string;
  createdAt: number;
};

/**
 * Minimal in-file SystemState and SystemStateManager to avoid requiring
 * an external systemState.ts to be explicitly listed in tsconfig.
 * Keeps a plain key/value state and provides setState/getState methods.
 */
export type SystemState = { [key: string]: any };

export class SystemStateManager {
  private state: SystemState = {};
  setState(partial: Partial<SystemState>) {
    this.state = { ...this.state, ...(partial as any) };
  }
  getState(): SystemState {
    return this.state;
  }
}

export class Runtime {
  private static instance: Runtime;
  private tasks: RuntimeTask[] = [];
  private events: RuntimeEvent[] = [];
  private listeners: { [type: string]: Array<(payload: any) => void> } = {};
  private systemStateManager = new SystemStateManager();
  private paused = false;
  private killed = false;

  private constructor() {}

  static getInstance(): Runtime {
    if (!Runtime.instance) {
      Runtime.instance = new Runtime();
    }
    return Runtime.instance;
  }

  dispatchTask(task: RuntimeTask) {
    if (this.killed) return;
    if (this.paused) {
      // Optionally queue or drop tasks when paused
      this.emit('task:paused', task);
      return;
    }
    this.tasks.push(task);
    this.emit('task', task);
  }

  dispatchEvent(event: RuntimeEvent) {
    if (this.killed) return;
    this.events.push(event);
    this.emit('event', event);
  }

  on(type: string, handler: (payload: any) => void) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(handler);
  }

  emit(type: string, payload: any) {
    (this.listeners[type] || []).forEach(fn => fn(payload));
  }

  getTasks() {
    return this.tasks;
  }

  getEvents() {
    return this.events;
  }

  // --- OS-level authority controls ---
  pause() {
    this.paused = true;
    this.emit('system:paused', null);
  }
  resume() {
    this.paused = false;
    this.emit('system:resumed', null);
  }
  kill() {
    this.killed = true;
    this.emit('system:killed', null);
  }
  reset() {
    this.killed = false;
    this.paused = false;
    this.emit('system:reset', null);
  }

  // System state integration
  setSystemState(partial: Partial<SystemState>) {
    this.systemStateManager.setState(partial);
    this.emit('system:state', this.systemStateManager.getState());
  }
  getSystemState(): SystemState {
    return this.systemStateManager.getState();
  }
}
