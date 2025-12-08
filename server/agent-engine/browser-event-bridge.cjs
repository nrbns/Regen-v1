/**
 * Browser Event Bridge
 * Captures and forwards browser events to the agent system
 * Enables browser automation tracking and event logging
 */

const EventEmitter = require('events');
const Pino = require('pino');

const logger = Pino({ name: 'browser-event-bridge' });

// Global event bus for cross-session communication
const eventBus = new EventEmitter();

// Session-specific event history
const eventHistory = new Map(); // sessionId -> Array<Event>
const MAX_HISTORY = 100;

/**
 * Get browser event bridge for a session
 */
function getBrowserEventBridge(options = {}) {
  const { sessionId = 'default' } = options;

  // Initialize history for session if not exists
  if (!eventHistory.has(sessionId)) {
    eventHistory.set(sessionId, []);
  }

  /**
   * Record a browser event
   */
  const recordEvent = (event) => {
    const history = eventHistory.get(sessionId);
    const timestampedEvent = {
      timestamp: Date.now(),
      sessionId,
      ...event,
    };
    
    history.push(timestampedEvent);
    
    // Keep only last MAX_HISTORY events
    if (history.length > MAX_HISTORY) {
      history.shift();
    }
    
    // Emit to global event bus
    eventBus.emit('browser:event', timestampedEvent);
    
    logger.debug({ sessionId, type: event.type }, 'Browser event recorded');
  };

  /**
   * Get recent events for this session
   */
  const getRecentEvents = (limit = 10) => {
    const history = eventHistory.get(sessionId) || [];
    return history.slice(-limit);
  };

  /**
   * Get event statistics
   */
  const getEventStats = () => {
    const history = eventHistory.get(sessionId) || [];
    const eventTypes = {};
    
    history.forEach(event => {
      eventTypes[event.type] = (eventTypes[event.type] || 0) + 1;
    });
    
    return {
      sessionId,
      totalEvents: history.length,
      lastEvent: history[history.length - 1] || null,
      eventTypes,
      oldestEvent: history[0] || null,
    };
  };

  /**
   * Clear event history for this session
   */
  const clearHistory = () => {
    eventHistory.set(sessionId, []);
    logger.info({ sessionId }, 'Event history cleared');
  };

  /**
   * Get all events for this session
   */
  const getAllEvents = () => {
    return eventHistory.get(sessionId) || [];
  };

  /**
   * Search events by type or properties
   */
  const searchEvents = (query) => {
    const history = eventHistory.get(sessionId) || [];
    
    if (typeof query === 'string') {
      // Search by type
      return history.filter(event => event.type === query);
    }
    
    if (typeof query === 'object') {
      // Search by properties
      return history.filter(event => {
        return Object.keys(query).every(key => event[key] === query[key]);
      });
    }
    
    return [];
  };

  return {
    recordEvent,
    getRecentEvents,
    getEventStats,
    clearHistory,
    getAllEvents,
    searchEvents,
    // Event emitter methods for listening
    on: (event, handler) => eventBus.on(event, handler),
    off: (event, handler) => eventBus.off(event, handler),
    once: (event, handler) => eventBus.once(event, handler),
  };
}

/**
 * Get global event bus (for cross-session monitoring)
 */
function getEventBus() {
  return eventBus;
}

/**
 * Get all session IDs with active event history
 */
function getActiveSessions() {
  return Array.from(eventHistory.keys());
}

/**
 * Clear all event history (use with caution)
 */
function clearAllHistory() {
  eventHistory.clear();
  logger.warn('All event history cleared');
}

module.exports = {
  getBrowserEventBridge,
  getEventBus,
  getActiveSessions,
  clearAllHistory,
};







