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
    topic: config.kafka.inputTopic,
    fromBeginning: false,
  });
}

export async function shutdownKafka() {
  await Promise.allSettled([consumer.disconnect(), producer.disconnect()]);
}

export async function publishChunk(chunk: Record<string, unknown>) {
  await producer.send({
    topic: config.kafka.outputTopic,
    messages: [
      {
        key: chunk.url as string,
        value: JSON.stringify(chunk),
        headers: {
          source_type: String(chunk.source_type ?? ''),
        },
      },
    ],
  });
}
