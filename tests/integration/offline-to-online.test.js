/**
 * Integration Test: Offline → Online Handoff
 * Tests: Work offline → Reconnect → Verify sync
 *
 * Run: node tests/integration/offline-to-online.test.js
 */

const { performance } = require('perf_hooks');

// Mock implementations
class MockSyncService {
  constructor() {
    this.queue = [];
    this.isOnline = false;
    this.syncedItems = [];
  }

  goOffline() {
    this.isOnline = false;
    console.log('   📴 Switched to offline mode');
  }

  goOnline() {
    this.isOnline = true;
    console.log('   📶 Switched to online mode');
  }

  queueUpdate(item) {
    if (!this.isOnline) {
      this.queue.push({
        ...item,
        queuedAt: Date.now(),
      });
      console.log(`   📦 Queued update: ${item.type} (queue size: ${this.queue.length})`);
      return true;
    }
    return false;
  }

  async syncQueue() {
    if (!this.isOnline) {
      throw new Error('Cannot sync while offline');
    }

    const itemsToSync = [...this.queue];
    this.queue = [];

    for (const item of itemsToSync) {
      await this.syncItem(item);
    }

    return itemsToSync.length;
  }

  async syncItem(item) {
    // Simulate sync delay
    await new Promise(resolve => setTimeout(resolve, 10));
    this.syncedItems.push(item);
    console.log(`   ✅ Synced: ${item.type}`);
  }

  getQueueSize() {
    return this.queue.length;
  }

  getSyncedCount() {
    return this.syncedItems.length;
  }
}

// Test flow
async function testOfflineToOnlineFlow() {
  console.log('🧪 Testing Offline → Online Handoff');
  console.log('='.repeat(60));

  const syncService = new MockSyncService();
  const startTime = performance.now();

  try {
    // Step 1: Start online
    console.log('\n1️⃣ Starting online...');
    syncService.goOnline();
    console.log('   ✅ Online mode active');

    // Step 2: Go offline
    console.log('\n2️⃣ Switching to offline...');
    syncService.goOffline();

    // Step 3: Queue updates while offline
    console.log('\n3️⃣ Queuing updates while offline...');
    const updates = [
      { type: 'tab-created', id: 'tab-1', url: 'https://example.com/1' },
      { type: 'tab-created', id: 'tab-2', url: 'https://example.com/2' },
      { type: 'tab-updated', id: 'tab-1', title: 'New Title' },
      { type: 'tab-closed', id: 'tab-2' },
    ];

    updates.forEach(update => syncService.queueUpdate(update));
    const queueSize = syncService.getQueueSize();
    console.log(`   ✅ Queued ${queueSize} updates`);

    if (queueSize !== updates.length) {
      throw new Error(`Queue size mismatch: expected ${updates.length}, got ${queueSize}`);
    }

    // Step 4: Verify queue cap (should not exceed 150)
    console.log('\n4️⃣ Verifying queue cap...');
    if (queueSize > 150) {
      throw new Error(`Queue cap exceeded: ${queueSize} > 150`);
    }
    console.log(`   ✅ Queue size (${queueSize}) within cap (150)`);

    // Step 5: Reconnect to online
    console.log('\n5️⃣ Reconnecting to online...');
    syncService.goOnline();

    // Step 6: Sync queue
    console.log('\n6️⃣ Syncing queued updates...');
    const syncedCount = await syncService.syncQueue();
    console.log(`   ✅ Synced ${syncedCount} updates`);

    if (syncedCount !== updates.length) {
      throw new Error(`Sync count mismatch: expected ${updates.length}, got ${syncedCount}`);
    }

    // Step 7: Verify queue is empty
    console.log('\n7️⃣ Verifying queue is empty...');
    const finalQueueSize = syncService.getQueueSize();
    if (finalQueueSize !== 0) {
      throw new Error(`Queue not empty after sync: ${finalQueueSize} items remaining`);
    }
    console.log('   ✅ Queue is empty');

    // Step 8: Verify all items synced
    console.log('\n8️⃣ Verifying all items synced...');
    const totalSynced = syncService.getSyncedCount();
    if (totalSynced !== updates.length) {
      throw new Error(`Not all items synced: expected ${updates.length}, got ${totalSynced}`);
    }
    console.log(`   ✅ All ${totalSynced} items synced`);

    const duration = (performance.now() - startTime).toFixed(2);
    console.log('\n' + '='.repeat(60));
    console.log(`✅ Offline → Online Handoff: PASSED (${duration}ms)`);
    console.log('='.repeat(60));

    return {
      success: true,
      duration: parseFloat(duration),
      queued: queueSize,
      synced: syncedCount,
    };
  } catch (error) {
    const duration = (performance.now() - startTime).toFixed(2);
    console.error('\n❌ Offline → Online Handoff: FAILED');
    console.error(`   Error: ${error.message}`);
    console.error(`   Duration: ${duration}ms`);
    return { success: false, duration: parseFloat(duration), error: error.message };
  }
}

// Run test
if (require.main === module) {
  testOfflineToOnlineFlow()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { testOfflineToOnlineFlow };
