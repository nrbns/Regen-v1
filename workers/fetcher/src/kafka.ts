import { Kafka, Producer } from 'kafkajs';
import { config } from './config.js';

let producer: Producer | null = null;

async function ensureProducer(): Promise<Producer> {
  if (producer) {
    return producer;
  }
  const kafka = new Kafka({
    clientId: config.kafka.clientId,
    brokers: config.kafka.brokers,
  });
  producer = kafka.producer({
    allowAutoTopicCreation: false,
  });
  await producer.connect();
  return producer;
}

export async function publishRawPage(payload: Record<string, unknown>) {
  const client = await ensureProducer();
  await client.send({
    topic: config.kafka.topic,
    messages: [
      {
        key: payload.url as string,
        value: JSON.stringify(payload),
        headers: {
          source_type: String(payload.source_type ?? ''),
          license: String(payload.license ?? ''),
        },
      },
    ],
  });
}

export async function shutdownProducer() {
  if (producer) {
    await producer.disconnect();
    producer = null;
  }
}
