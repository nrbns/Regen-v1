/**
 * Regen Agent Core - Agent manager and session handling
 * Creates agent sessions, maintains memory, orchestrates workflows
 */

const crypto = require('crypto');
const EventEmitter = require('events');

// Agent Session - Represents a single agent conversation
class AgentSession extends EventEmitter {
  constructor(options = {}) {
    super();
    this.id = options.id || crypto.randomUUID();
    this.userId = options.userId || 'anonymous';
    this.tabId = options.tabId || null;
    this.createdAt = Date.now();
    this.lastActiveAt = Date.now();
    this.status = 'idle'; // idle, thinking, executing, waiting

    // Memory
    this.messages = [];
    this.context = {
      currentUrl: options.currentUrl || null,
      pageTitle: options.pageTitle || null,
      selectedText: null,
      pageContent: null,
    };
    this.variables = new Map();

    // Execution state
    this.currentPlan = null;
    this.executionHistory = [];
    this.pendingActions = [];
  }

  addMessage(role, content, metadata = {}) {
    const message = {
      id: crypto.randomUUID(),
      role, // 'user', 'assistant', 'system', 'tool'
      content,
      timestamp: Date.now(),
      ...metadata,
    };
    this.messages.push(message);
    this.lastActiveAt = Date.now();
    this.emit('message', message);
    return message;
  }

  getMessages(limit = 50) {
    return this.messages.slice(-limit);
  }

  setContext(key, value) {
    this.context[key] = value;
    this.lastActiveAt = Date.now();
  }

  setVariable(key, value) {
    this.variables.set(key, value);
  }

  getVariable(key) {
    return this.variables.get(key);
  }

  setStatus(status) {
    this.status = status;
    this.emit('status', status);
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      tabId: this.tabId,
      createdAt: this.createdAt,
      lastActiveAt: this.lastActiveAt,
      status: this.status,
      messageCount: this.messages.length,
      context: this.context,
    };
  }
}

// Agent Manager - Manages all agent sessions
class AgentManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.sessions = new Map();
    this.maxSessionsPerUser = options.maxSessionsPerUser || 10;
    this.sessionTimeout = options.sessionTimeout || 30 * 60 * 1000; // 30 min
    this.tools = new Map();
    this.llmClient = options.llmClient || null;

    // Start cleanup interval
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  createSession(options = {}) {
    const session = new AgentSession(options);
    this.sessions.set(session.id, session);

    // Enforce per-user limit
    const userSessions = Array.from(this.sessions.values()).filter(
      s => s.userId === session.userId
    );

    if (userSessions.length > this.maxSessionsPerUser) {
      // Remove oldest session
      const oldest = userSessions.sort((a, b) => a.lastActiveAt - b.lastActiveAt)[0];
      this.deleteSession(oldest.id);
    }

    this.emit('session:created', session);
    console.log(`[AgentManager] Created session ${session.id}`);
    return session;
  }

  getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActiveAt = Date.now();
    }
    return session;
  }

  getOrCreateSession(sessionId, options = {}) {
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = this.createSession({ id: sessionId, ...options });
    }
    return session;
  }

  deleteSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.emit('close');
      this.sessions.delete(sessionId);
      this.emit('session:deleted', sessionId);
      console.log(`[AgentManager] Deleted session ${sessionId}`);
    }
  }

  getSessions(userId = null) {
    let sessions = Array.from(this.sessions.values());
    if (userId) {
      sessions = sessions.filter(s => s.userId === userId);
    }
    return sessions.map(s => s.toJSON());
  }

  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, session] of this.sessions) {
      if (now - session.lastActiveAt > this.sessionTimeout) {
        this.deleteSession(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[AgentManager] Cleaned up ${cleaned} stale sessions`);
    }
  }

  registerTool(name, tool) {
    this.tools.set(name, tool);
    console.log(`[AgentManager] Registered tool: ${name}`);
  }

  getTool(name) {
    return this.tools.get(name);
  }

  getAvailableTools() {
    return Array.from(this.tools.entries()).map(([name, tool]) => ({
      name,
      description: tool.description || '',
      parameters: tool.parameters || {},
    }));
  }

  destroy() {
    clearInterval(this.cleanupInterval);
    for (const [id] of this.sessions) {
      this.deleteSession(id);
    }
  }
}

// Agent Memory - Enhanced with vector store (imported from memory.cjs)
// Kept for backward compatibility, but delegates to enhanced version
const { AgentMemory: EnhancedAgentMemory } = require('./memory.cjs');

// Legacy AgentMemory class - wraps enhanced version
class AgentMemory extends EnhancedAgentMemory {
  constructor(options = {}) {
    super(options);
  }

  remember(key, value, scope = 'short') {
    const memory = scope === 'long' ? this.longTerm : this.shortTerm;
    memory.set(key, {
      value,
      timestamp: Date.now(),
      accessCount: 0,
    });
  }

  recall(key, scope = 'short') {
    const memory = scope === 'long' ? this.longTerm : this.shortTerm;
    const item = memory.get(key);
    if (item) {
      item.accessCount++;
      item.lastAccessed = Date.now();
      return item.value;
    }
    return null;
  }

  forget(key, scope = 'short') {
    const memory = scope === 'long' ? this.longTerm : this.shortTerm;
    memory.delete(key);
  }

  addFact(fact, source = null, confidence = 1.0) {
    this.facts.push({
      id: crypto.randomUUID(),
      fact,
      source,
      confidence,
      timestamp: Date.now(),
    });
  }

  searchFacts(query, limit = 10) {
    const queryLower = query.toLowerCase();
    const scored = this.facts.map(f => ({
      ...f,
      score: this.computeRelevance(f.fact, queryLower),
    }));

    return scored
      .filter(f => f.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  computeRelevance(text, query) {
    const textLower = text.toLowerCase();
    const queryTerms = query.split(/\s+/);
    let score = 0;

    for (const term of queryTerms) {
      if (textLower.includes(term)) {
        score += 1;
      }
    }

    return score / queryTerms.length;
  }

  setPreference(key, value) {
    this.preferences[key] = value;
  }

  getPreference(key, defaultValue = null) {
    return this.preferences[key] ?? defaultValue;
  }

  async save() {
    const fs = require('fs').promises;
    const path = require('path');

    await fs.mkdir(path.dirname(this.storagePath), { recursive: true });

    const data = {
      longTerm: Array.from(this.longTerm.entries()),
      facts: this.facts,
      preferences: this.preferences,
    };

    await fs.writeFile(this.storagePath, JSON.stringify(data, null, 2));
    console.log(`[AgentMemory] Saved to ${this.storagePath}`);
  }

  async load() {
    const fs = require('fs').promises;

    try {
      const data = JSON.parse(await fs.readFile(this.storagePath, 'utf-8'));
      this.longTerm = new Map(data.longTerm || []);
      this.facts = data.facts || [];
      this.preferences = data.preferences || {};
      console.log(`[AgentMemory] Loaded from ${this.storagePath}`);
    } catch {
      console.log('[AgentMemory] No existing memory found');
    }
  }

  getStats() {
    return {
      shortTermSize: this.shortTerm.size,
      longTermSize: this.longTerm.size,
      factsCount: this.facts.length,
      preferencesCount: Object.keys(this.preferences).length,
    };
  }
}

// Agent State Machine - Manages agent execution state
class AgentStateMachine {
  constructor(session) {
    this.session = session;
    this.state = 'idle';
    this.transitions = {
      idle: ['thinking', 'waiting'],
      thinking: ['planning', 'responding', 'idle'],
      planning: ['executing', 'idle'],
      executing: ['thinking', 'waiting', 'idle'],
      waiting: ['thinking', 'idle'],
      responding: ['idle', 'executing'],
    };
  }

  canTransition(newState) {
    return this.transitions[this.state]?.includes(newState) ?? false;
  }

  transition(newState) {
    if (!this.canTransition(newState)) {
      throw new Error(`Invalid transition: ${this.state} -> ${newState}`);
    }

    const oldState = this.state;
    this.state = newState;
    this.session.setStatus(newState);
    console.log(`[StateMachine] ${oldState} -> ${newState}`);
    return true;
  }

  getState() {
    return this.state;
  }

  reset() {
    this.state = 'idle';
    this.session.setStatus('idle');
  }
}

// Singleton instance
let agentManager = null;
let agentMemory = null;

function getAgentManager(options = {}) {
  if (!agentManager) {
    agentManager = new AgentManager(options);
  }
  return agentManager;
}

function getAgentMemory(options = {}) {
  if (!agentMemory) {
    agentMemory = new AgentMemory(options);
  }
  return agentMemory;
}

module.exports = {
  AgentSession,
  AgentManager,
  AgentMemory,
  AgentStateMachine,
  getAgentManager,
  getAgentMemory,
};

// CLI Test
if (require.main === module) {
  const manager = getAgentManager();
  const memory = getAgentMemory();

  // Create session
  const session = manager.createSession({ userId: 'test-user' });
  console.log('Created session:', session.toJSON());

  // Add messages
  session.addMessage('user', 'Hello, can you help me search for JavaScript tutorials?');
  session.addMessage('assistant', 'Of course! Let me search for JavaScript tutorials for you.');

  // Add context
  session.setContext('currentUrl', 'https://example.com');
  session.setVariable('lastSearch', 'javascript tutorials');

  // Memory operations
  memory.remember('user_preference', 'prefers video tutorials', 'long');
  memory.addFact('User is learning JavaScript', 'conversation', 0.9);

  console.log('\nSession messages:', session.getMessages());
  console.log('\nMemory stats:', memory.getStats());
  console.log('\nSearch facts:', memory.searchFacts('JavaScript'));

  // Cleanup
  manager.destroy();
}
