// server/services/realtime/user-session-manager.js
// Event-driven user/session management for Regen Backend

const eventBus = require('../../eventBus');
const jwt = require('jsonwebtoken');

// In-memory session store (for demo/POC; replace with Redis/DB for prod)
const sessions = new Map();
const users = new Map();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Create a new session for a user
function createSession(userId, metadata = {}) {
  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const token = jwt.sign({ userId, sessionId }, JWT_SECRET, { expiresIn: '12h' });
  const session = { userId, sessionId, token, createdAt: Date.now(), metadata };
  sessions.set(sessionId, session);
  eventBus.emit('session:created', session);
  return session;
}

// Validate a session token
function validateSession(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const session = sessions.get(decoded.sessionId);
    if (!session) throw new Error('Session not found');
    eventBus.emit('session:validated', session);
    return session;
  } catch (err) {
    eventBus.emit('session:invalid', { token, error: err.message });
    return null;
  }
}

// Destroy a session
function destroySession(sessionId) {
  const session = sessions.get(sessionId);
  if (session) {
    sessions.delete(sessionId);
    eventBus.emit('session:destroyed', session);
  }
}

// Register a user (for demo; replace with real user DB)
function registerUser(userId, profile = {}) {
  users.set(userId, { userId, profile });
  eventBus.emit('user:registered', { userId, profile });
}

// Get user profile
function getUser(userId) {
  return users.get(userId);
}

// Listen for login/logout events (for future UI integration)
eventBus.on('user:login', ({ userId, metadata }) => {
  const session = createSession(userId, metadata);
  eventBus.emit('user:session', session);
});

eventBus.on('user:logout', ({ sessionId }) => {
  destroySession(sessionId);
});

module.exports = {
  createSession,
  validateSession,
  destroySession,
  registerUser,
  getUser,
  sessions,
  users,
};
