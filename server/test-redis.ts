/**
 * Quick Redis connectivity test
 */

import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

console.log(`Testing Redis connection to: ${REDIS_URL}\n`);

async function testRedis() {
  const client = createClient({ url: REDIS_URL });

  try {
    console.log('Connecting...');
    await client.connect();
    console.log('✅ Connected to Redis\n');

    // Test ping
    const pong = await client.ping();
    console.log(`PING → ${pong}`);

    // Test set/get
    await client.set('test:key', 'Hello Realtime!');
    const value = await client.get('test:key');
    console.log(`SET/GET → ${value}`);

    // Test pub/sub
    const pubClient = client.duplicate();
    const subClient = client.duplicate();

    await pubClient.connect();
    await subClient.connect();

    await subClient.subscribe('test:channel', message => {
      console.log(`SUB received: ${message}`);
    });

    await pubClient.publish('test:channel', 'Test message');

    // Wait a bit for message
    await new Promise(resolve => setTimeout(resolve, 100));

    // Cleanup
    await subClient.unsubscribe('test:channel');
    await client.del('test:key');

    await pubClient.quit();
    await subClient.quit();
    await client.quit();

    console.log('\n✅ All Redis tests passed!');
    console.log('Redis is ready for realtime server.');
  } catch (error) {
    console.error('\n❌ Redis connection failed:', error);
    console.error('\nMake sure Redis is running:');
    console.error('  Docker: docker run -d -p 6379:6379 redis:alpine');
    console.error('  Or install locally and start redis-server');
    process.exit(1);
  }
}

testRedis();
