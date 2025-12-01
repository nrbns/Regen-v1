import { Kafka, logLevel } from 'kafkajs';
import { config } from './config.js';

const kafka = new Kafka({
  clientId: config.kafka.clientId,
  brokers: config.kafka.brokers,
  logLevel: logLevel.ERROR,
});

export const consumer = kafka.consumer({
  groupId: `${config.kafka.clientId}-group`,
});

export const producer = kafka.producer();

export async function startKafka() {
  await Promise.all([consumer.connect(), producer.connect()]);

  await consumer.subscribe({
    topic: config.kafka.rawTopic,
    fromBeginning: false,
  });
}

export async function shutdownKafka() {
  await Promise.all([consumer.disconnect(), producer.disconnect()]);
}

export async function publishCleanDoc(payload: Record<string, unknown>) {
  await producer.send({
    topic: config.kafka.cleanTopic,
    messages: [
      {
        key: payload.url as string,
        value: JSON.stringify(payload),
        headers: {
          source_type: String(payload.source_type ?? ''),
          language: String(payload.language ?? ''),
        },
      },
    ],
  });
}



