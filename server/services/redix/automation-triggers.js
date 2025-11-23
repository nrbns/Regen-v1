/**
 * Redix Automation Triggers
 * Real-time trigger-based intelligence using Redis Streams
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const redis = require('../../config/redis-client');
const { publishAutomationTrigger } = require('./event-bus');

const log = {
  info: (msg, meta) => console.log(`[AutomationTriggers] ${msg}`, meta || ''),
  error: (msg, meta) => console.error(`[AutomationTriggers] ERROR: ${msg}`, meta || ''),
};

const STREAM_KEY = 'automation:events';
const CONSUMER_GROUP = 'automation-processors';

/**
 * Initialize consumer group
 */
async function initializeConsumerGroup() {
  try {
    const client = redis.getClient();
    if (!client || !redis.isClientConnected()) {
      return false;
    }

    try {
      await client.xGroupCreate(STREAM_KEY, CONSUMER_GROUP, '0', {
        MKSTREAM: true,
      });
      log.info('Consumer group created', { group: CONSUMER_GROUP });
    } catch (error) {
      // Group might already exist
      if (!error.message.includes('BUSYGROUP')) {
        throw error;
      }
    }

    return true;
  } catch (error) {
    log.error('Failed to initialize consumer group', { error: error.message });
    return false;
  }
}

/**
 * Add automation trigger event
 */
async function addTriggerEvent(trigger) {
  try {
    const client = redis.getClient();
    if (!client || !redis.isClientConnected()) {
      return null;
    }

    const eventData = {
      type: trigger.type,
      userId: trigger.userId,
      automationId: trigger.automationId,
      data: JSON.stringify(trigger.data || {}),
      timestamp: Date.now(),
    };

    const messageId = await client.xAdd(STREAM_KEY, '*', eventData);
    log.info('Trigger event added', { messageId, type: trigger.type, userId: trigger.userId });

    // Also publish via Pub/Sub for real-time
    await publishAutomationTrigger(trigger.userId, trigger);

    return messageId;
  } catch (error) {
    log.error('Failed to add trigger event', { error: error.message });
    return null;
  }
}

/**
 * Read trigger events (consumer)
 */
async function readTriggerEvents(consumerName, count = 10) {
  try {
    const client = redis.getClient();
    if (!client || !redis.isClientConnected()) {
      return [];
    }

    // Initialize group if needed
    await initializeConsumerGroup();

    // Read from stream
    const messages = await client.xReadGroup(
      CONSUMER_GROUP,
      consumerName,
      [
        {
          key: STREAM_KEY,
          id: '>', // Read new messages
        },
      ],
      {
        COUNT: count,
        BLOCK: 1000, // Block for 1 second
      }
    );

    if (!messages || messages.length === 0) {
      return [];
    }

    const events = messages[0].messages.map(msg => ({
      id: msg.id,
      type: msg.message.type,
      userId: msg.message.userId,
      automationId: msg.message.automationId,
      data: JSON.parse(msg.message.data || '{}'),
      timestamp: parseInt(msg.message.timestamp, 10),
    }));

    log.info('Trigger events read', { consumerName, count: events.length });
    return events;
  } catch (error) {
    log.error('Failed to read trigger events', { consumerName, error: error.message });
    return [];
  }
}

/**
 * Acknowledge trigger event
 */
async function acknowledgeTrigger(messageId) {
  try {
    const client = redis.getClient();
    if (!client || !redis.isClientConnected()) {
      return false;
    }

    await client.xAck(STREAM_KEY, CONSUMER_GROUP, messageId);
    log.info('Trigger event acknowledged', { messageId });
    return true;
  } catch (error) {
    log.error('Failed to acknowledge trigger', { messageId, error: error.message });
    return false;
  }
}

/**
 * Get pending events for consumer
 */
async function getPendingEvents(consumerName) {
  try {
    const client = redis.getClient();
    if (!client || !redis.isClientConnected()) {
      return [];
    }

    const pending = await client.xPending(STREAM_KEY, CONSUMER_GROUP, '-', '+', 100, consumerName);

    if (!pending || pending.length === 0) {
      return [];
    }

    // Claim and read pending messages
    const messageIds = pending.map(p => p.id);
    const claimed = await client.xClaim(
      STREAM_KEY,
      CONSUMER_GROUP,
      consumerName,
      60000, // 60 seconds min idle
      messageIds
    );

    const events = claimed.map(msg => ({
      id: msg.id,
      type: msg.message.type,
      userId: msg.message.userId,
      automationId: msg.message.automationId,
      data: JSON.parse(msg.message.data || '{}'),
      timestamp: parseInt(msg.message.timestamp, 10),
    }));

    return events;
  } catch (error) {
    log.error('Failed to get pending events', { consumerName, error: error.message });
    return [];
  }
}

/**
 * Start trigger processor (background worker)
 */
function startTriggerProcessor(processor) {
  const consumerName = `processor-${Date.now()}`;
  let running = true;

  const processLoop = async () => {
    while (running) {
      try {
        // Read new events
        const events = await readTriggerEvents(consumerName, 10);

        for (const event of events) {
          try {
            await processor(event);
            await acknowledgeTrigger(event.id);
          } catch (error) {
            log.error('Failed to process trigger', { eventId: event.id, error: error.message });
            // Don't acknowledge on error - will retry
          }
        }

        // Also check pending events
        const pending = await getPendingEvents(consumerName);
        for (const event of pending) {
          try {
            await processor(event);
            await acknowledgeTrigger(event.id);
          } catch (error) {
            log.error('Failed to process pending trigger', {
              eventId: event.id,
              error: error.message,
            });
          }
        }

        // Small delay to prevent tight loop
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        log.error('Trigger processor error', { error: error.message });
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  };

  processLoop();

  return {
    stop: () => {
      running = false;
      log.info('Trigger processor stopped', { consumerName });
    },
  };
}

module.exports = {
  initializeConsumerGroup,
  addTriggerEvent,
  readTriggerEvents,
  acknowledgeTrigger,
  getPendingEvents,
  startTriggerProcessor,
};
