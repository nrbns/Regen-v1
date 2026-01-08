import { EventEmitter } from 'events';

// Lightweight event bus used by the task engine. Emits:
// - task:created (task)
// - task:updated (task)
// - task:log ({ id, message })
// - task:output ({ id, data })
// - task:completed (task)
export const eventBus = new EventEmitter();
