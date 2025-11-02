/**
 * IPC handlers for multi-session management
 */

import { registerHandler } from '../shared/ipc/router';
import { z } from 'zod';
import { getSessionManager } from './sessions';

export function registerSessionsIpc() {
  const sessionManager = getSessionManager();

  // Create new session
  registerHandler('sessions:create', z.object({
    name: z.string().min(1),
    profileId: z.string().optional(),
    color: z.string().optional(),
  }), async (_event, request) => {
    const newSession = sessionManager.createSession(request.name, request.profileId, request.color);
    return newSession;
  });

  // List all sessions
  registerHandler('sessions:list', z.object({}), async () => {
    return sessionManager.listSessions();
  });

  // Get active session
  registerHandler('sessions:getActive', z.object({}), async () => {
    return sessionManager.getActiveSession();
  });

  // Set active session
  registerHandler('sessions:setActive', z.object({
    sessionId: z.string(),
  }), async (_event, request) => {
    const success = sessionManager.setActiveSession(request.sessionId);
    return { success };
  });

  // Get session by ID
  registerHandler('sessions:get', z.object({
    sessionId: z.string(),
  }), async (_event, request) => {
    const sess = sessionManager.getSession(request.sessionId);
    if (!sess) {
      throw new Error('Session not found');
    }
    return sess;
  });

  // Delete session
  registerHandler('sessions:delete', z.object({
    sessionId: z.string(),
  }), async (_event, request) => {
    const success = sessionManager.deleteSession(request.sessionId);
    return { success };
  });

  // Update session (name, color, etc.)
  registerHandler('sessions:update', z.object({
    sessionId: z.string(),
    name: z.string().optional(),
    color: z.string().optional(),
  }), async (_event, request) => {
    const sess = sessionManager.getSession(request.sessionId);
    if (!sess) {
      throw new Error('Session not found');
    }
    
    if (request.name !== undefined) sess.name = request.name;
    if (request.color !== undefined) sess.color = request.color;
    
    return sess;
  });

  // Get session partition for tab creation
  registerHandler('sessions:getPartition', z.object({
    sessionId: z.string(),
  }), async (_event, request) => {
    return { partition: sessionManager.getSessionPartition(request.sessionId) };
  });
}

