/**
 * Redix Session Store
 * SuperStore for sessions, memory, and state
 */

const redis = require('../../config/redis-client');

const log = {
  info: (msg, meta) => console.log(`[SessionStore] ${msg}`, meta || ''),
  error: (msg, meta) => console.error(`[SessionStore] ERROR: ${msg}`, meta || ''),
};

const SESSION_TTL = 7 * 24 * 60 * 60; // 7 days
const MEMORY_TTL = 30 * 24 * 60 * 60; // 30 days

/**
 * Save session data
 */
async function saveSession(sessionId, data) {
  try {
    const client = redis.getClient();
    if (!client || !redis.isClientConnected()) {
      return false;
    }

    const key = `session:${sessionId}`;
    await client.setEx(key, SESSION_TTL, JSON.stringify(data));
    log.info('Session saved', { sessionId });
    return true;
  } catch (error) {
    log.error('Failed to save session', { sessionId, error: error.message });
    return false;
  }
}

/**
 * Get session data
 */
async function getSession(sessionId) {
  try {
    const client = redis.getClient();
    if (!client || !redis.isClientConnected()) {
      return null;
    }

    const key = `session:${sessionId}`;
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    log.error('Failed to get session', { sessionId, error: error.message });
    return null;
  }
}

/**
 * Update session field
 */
async function updateSessionField(sessionId, field, value) {
  try {
    let session = await getSession(sessionId);
    if (!session) {
      session = {};
    }

    session[field] = value;
    session.updatedAt = Date.now();

    return await saveSession(sessionId, session);
  } catch (error) {
    log.error('Failed to update session field', { sessionId, field, error: error.message });
    return false;
  }
}

/**
 * Save memory entry
 */
async function saveMemory(userId, memory) {
  try {
    const client = redis.getClient();
    if (!client || !redis.isClientConnected()) {
      return false;
    }

    const timestamp = Date.now();
    const key = `memory:${userId}:${timestamp}`;
    await client.setEx(key, MEMORY_TTL, JSON.stringify(memory));
    log.info('Memory saved', { userId, timestamp });
    return timestamp;
  } catch (error) {
    log.error('Failed to save memory', { userId, error: error.message });
    return null;
  }
}

/**
 * Get user memories
 */
async function getMemories(userId, limit = 50) {
  try {
    const client = redis.getClient();
    if (!client || !redis.isClientConnected()) {
      return [];
    }

    const pattern = `memory:${userId}:*`;
    const keys = await client.keys(pattern);

    // Sort by timestamp (in key) and get latest
    const sortedKeys = keys.sort().slice(-limit);

    const memories = [];
    for (const key of sortedKeys) {
      const data = await client.get(key);
      if (data) {
        memories.push(JSON.parse(data));
      }
    }

    return memories.reverse(); // Latest first
  } catch (error) {
    log.error('Failed to get memories', { userId, error: error.message });
    return [];
  }
}

/**
 * Save automation rule
 */
async function saveAutomation(userId, ruleId, rule) {
  try {
    const client = redis.getClient();
    if (!client || !redis.isClientConnected()) {
      return false;
    }

    const key = `automation:${userId}:${ruleId}`;
    await client.set(key, JSON.stringify(rule));
    log.info('Automation saved', { userId, ruleId });
    return true;
  } catch (error) {
    log.error('Failed to save automation', { userId, ruleId, error: error.message });
    return false;
  }
}

/**
 * Get user automations
 */
async function getAutomations(userId) {
  try {
    const client = redis.getClient();
    if (!client || !redis.isClientConnected()) {
      return [];
    }

    const pattern = `automation:${userId}:*`;
    const keys = await client.keys(pattern);

    const automations = [];
    for (const key of keys) {
      const data = await client.get(key);
      if (data) {
        automations.push(JSON.parse(data));
      }
    }

    return automations;
  } catch (error) {
    log.error('Failed to get automations', { userId, error: error.message });
    return [];
  }
}

/**
 * Delete automation
 */
async function deleteAutomation(userId, ruleId) {
  try {
    const client = redis.getClient();
    if (!client || !redis.isClientConnected()) {
      return false;
    }

    const key = `automation:${userId}:${ruleId}`;
    await client.del(key);
    log.info('Automation deleted', { userId, ruleId });
    return true;
  } catch (error) {
    log.error('Failed to delete automation', { userId, ruleId, error: error.message });
    return false;
  }
}

module.exports = {
  saveSession,
  getSession,
  updateSessionField,
  saveMemory,
  getMemories,
  saveAutomation,
  getAutomations,
  deleteAutomation,
};
