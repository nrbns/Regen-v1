/**
 * Shared Event Types - Real-Time Layer (Compiled JS version)
 * This is a JS version for Node.js server compatibility
 */

module.exports = {
  EVENTS: {
    // Model events
    MODEL_CHUNK: 'model:chunk:v1',
    MODEL_COMPLETE: 'model:complete:v1',
    MODEL_ERROR: 'model:error:v1',
    MODEL_START: 'model:start:v1',

    // Search events
    SEARCH_RESULT: 'search:result:v1',
    SEARCH_COMPLETE: 'search:complete:v1',
    START_SEARCH: 'search:start:v1',
    SEARCH_ERROR: 'search:error:v1',

    // Research events
    RESEARCH_CHUNK: 'research:chunk:v1',
    RESEARCH_COMPLETE: 'research:complete:v1',
    RESEARCH_SOURCE: 'research:source:v1',
    START_RESEARCH: 'research:start:v1',

    // Task management
    CANCEL_TASK: 'task:cancel:v1',
    TASK_PROGRESS: 'task:progress:v1',
    TASK_COMPLETE: 'task:complete:v1',
    TASK_ERROR: 'task:error:v1',

    // Download events
    DOWNLOAD_PROGRESS: 'download:progress:v1',
    DOWNLOAD_COMPLETE: 'download:complete:v1',
    DOWNLOAD_ERROR: 'download:error:v1',

    // Tab & UI events
    TAB_UPDATE: 'tab:update:v1',
    TAB_CREATE: 'tab:create:v1',
    TAB_CLOSE: 'tab:close:v1',

    // User presence
    USER_PRESENCE: 'user:presence:v1',
    USER_JOIN: 'user:join:v1',
    USER_LEAVE: 'user:leave:v1',

    // Analytics
    ANALYTICS_EVENT: 'analytics:event:v1',

    // Connection events
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected',
    RECONNECTING: 'reconnecting',
    ERROR: 'error',
  },
};
