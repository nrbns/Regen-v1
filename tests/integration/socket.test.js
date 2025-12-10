/**
 * Socket.IO Integration Tests
 * Tests real-time layer end-to-end
 */

const { io } = require('socket.io-client');
const { EVENTS } = require('../../packages/shared/events.js');

const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:4000';

describe('Socket.IO Integration', () => {
  let client;

  afterEach(() => {
    if (client) {
      client.disconnect();
      client = null;
    }
  });

  test('connects with valid token', done => {
    client = io(SOCKET_URL, {
      auth: { token: 'test-token' },
      transports: ['websocket'],
    });

    client.on('connect', () => {
      expect(client.connected).toBe(true);
      done();
    });

    client.on('connect_error', error => {
      done(error);
    });
  });

  test('rejects connection without token in production', done => {
    // Skip in development
    if (process.env.NODE_ENV === 'development') {
      done();
      return;
    }

    client = io(SOCKET_URL, {
      auth: {},
      transports: ['websocket'],
    });

    client.on('connect_error', error => {
      expect(error.message).toContain('Authentication');
      done();
    });
  });

  test('receives job started event', done => {
    client = io(SOCKET_URL, {
      auth: { token: 'test-token' },
      transports: ['websocket'],
    });

    client.on('connect', () => {
      client.emit(EVENTS.START_SEARCH || 'search:start:v1', {
        query: 'test query',
      });

      client.on('search:started', data => {
        expect(data).toHaveProperty('jobId');
        expect(data).toHaveProperty('query');
        done();
      });
    });
  });

  test('handles reconnection', done => {
    client = io(SOCKET_URL, {
      auth: { token: 'test-token' },
      transports: ['websocket'],
      reconnection: true,
    });

    let connected = false;
    let reconnected = false;

    client.on('connect', () => {
      if (!connected) {
        connected = true;
        // Simulate disconnect
        setTimeout(() => {
          client.io.engine.close();
        }, 1000);
      } else if (!reconnected) {
        reconnected = true;
        done();
      }
    });
  });
});
