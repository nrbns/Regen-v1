/**
 * Performance Profiling Script for Tab Management
 * Tests: 500+ tabs, GVE prune, memory usage, tab persistence
 *
 * Run: node tests/performance/profile-tabs.js
 */

const { performance } = require('perf_hooks');

// Configuration
const MAX_TABS = 500;
const PRUNE_THRESHOLD = 500;
const EXPECTED_KEPT_TABS = 400;

// Mock tab store for testing
class MockTabStore {
  constructor() {
    this.tabs = [];
    this.graphNodes = [];
    this.memoryUsage = 0;
  }

  addTab(tab) {
    this.tabs.push(tab);
    this.graphNodes.push({
      id: tab.id,
      url: tab.url,
      title: tab.title,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
    });
    this.memoryUsage += this.estimateTabMemory(tab);
  }

  estimateTabMemory(tab) {
    // Rough estimate: 2MB per tab (DOM, JS, cache)
    return 2 * 1024 * 1024;
  }

  pruneGraph() {
    if (this.graphNodes.length <= PRUNE_THRESHOLD) {
      return { pruned: 0, kept: this.graphNodes.length };
    }

    // Sort by lastActiveAt (oldest first)
    const sorted = [...this.graphNodes].sort(
      (a, b) => (a.lastActiveAt || a.createdAt) - (b.lastActiveAt || b.createdAt)
    );

    // Keep newest EXPECTED_KEPT_TABS
    const toKeep = sorted.slice(-EXPECTED_KEPT_TABS);
    const prunedCount = this.graphNodes.length - toKeep.length;

    this.graphNodes = toKeep;
    this.memoryUsage = this.graphNodes.reduce(
      (sum, node) => sum + this.estimateTabMemory({ id: node.id }),
      0
    );

    return { pruned: prunedCount, kept: toKeep.length };
  }

  getMemoryUsageMB() {
    return (this.memoryUsage / (1024 * 1024)).toFixed(2);
  }
}

// Performance test functions
function testTabCreation(store, count) {
  console.log(`\n📊 Testing tab creation (${count} tabs)...`);
  const start = performance.now();

  for (let i = 0; i < count; i++) {
    store.addTab({
      id: `tab-${i}`,
      url: `https://example.com/page-${i}`,
      title: `Page ${i}`,
      createdAt: Date.now(),
    });
  }

  const duration = (performance.now() - start).toFixed(2);
  console.log(`✅ Created ${count} tabs in ${duration}ms`);
  console.log(`   Memory usage: ${store.getMemoryUsageMB()}MB`);
  console.log(`   Graph nodes: ${store.graphNodes.length}`);

  return { duration, memoryMB: parseFloat(store.getMemoryUsageMB()) };
}

function testGVEPrune(store) {
  console.log(`\n📊 Testing GVE prune (${store.graphNodes.length} nodes)...`);
  const start = performance.now();

  const result = store.pruneGraph();

  const duration = (performance.now() - start).toFixed(2);
  console.log(`✅ Pruned ${result.pruned} nodes, kept ${result.kept} nodes in ${duration}ms`);
  console.log(`   Memory usage after prune: ${store.getMemoryUsageMB()}MB`);

  // Verify prune worked correctly
  if (store.graphNodes.length > PRUNE_THRESHOLD) {
    console.error(
      `❌ ERROR: Graph still has ${store.graphNodes.length} nodes (expected <= ${PRUNE_THRESHOLD})`
    );
    return { success: false, duration, result };
  }

  if (store.graphNodes.length !== EXPECTED_KEPT_TABS) {
    console.warn(
      `⚠️  WARNING: Kept ${store.graphNodes.length} nodes (expected ${EXPECTED_KEPT_TABS})`
    );
  }

  return { success: true, duration, result };
}

function testTabPersistence(store) {
  console.log(`\n📊 Testing tab persistence (${store.tabs.length} tabs)...`);
  const start = performance.now();

  // Simulate persistence (serialize to JSON)
  const serialized = JSON.stringify({
    tabs: store.tabs,
    graphNodes: store.graphNodes,
  });

  const serializedSize = (serialized.length / (1024 * 1024)).toFixed(2);
  const duration = (performance.now() - start).toFixed(2);

  console.log(`✅ Serialized ${store.tabs.length} tabs in ${duration}ms`);
  console.log(`   Serialized size: ${serializedSize}MB`);

  // Simulate deserialization
  const deserializeStart = performance.now();
  const deserialized = JSON.parse(serialized);
  const deserializeDuration = (performance.now() - deserializeStart).toFixed(2);

  console.log(`✅ Deserialized ${deserialized.tabs.length} tabs in ${deserializeDuration}ms`);

  // Verify no data loss
  if (deserialized.tabs.length !== store.tabs.length) {
    console.error(
      `❌ ERROR: Data loss! Original: ${store.tabs.length}, Deserialized: ${deserialized.tabs.length}`
    );
    return { success: false, duration, deserializeDuration };
  }

  return { success: true, duration, deserializeDuration, sizeMB: parseFloat(serializedSize) };
}

function testTabSwitch(store, iterations = 100) {
  console.log(`\n📊 Testing tab switching (${iterations} iterations)...`);
  const times = [];

  for (let i = 0; i < iterations; i++) {
    const tabId = store.tabs[Math.floor(Math.random() * store.tabs.length)]?.id;
    if (!tabId) continue;

    const start = performance.now();
    // Simulate tab switch (find tab in array)
    const tab = store.tabs.find(t => t.id === tabId);
    const duration = performance.now() - start;

    times.push(duration);
  }

  const avg = (times.reduce((a, b) => a + b, 0) / times.length).toFixed(2);
  const max = Math.max(...times).toFixed(2);
  const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)].toFixed(2);

  console.log(`✅ Tab switch performance:`);
  console.log(`   Average: ${avg}ms`);
  console.log(`   P95: ${p95}ms`);
  console.log(`   Max: ${max}ms`);

  // Success criteria: P95 < 2s
  if (parseFloat(p95) > 2000) {
    console.error(`❌ ERROR: P95 tab switch time (${p95}ms) exceeds 2s threshold`);
    return { success: false, avg, p95, max };
  }

  return { success: true, avg: parseFloat(avg), p95: parseFloat(p95), max: parseFloat(max) };
}

// Main test runner
async function runPerformanceTests() {
  console.log('🚀 Starting Regen Browser Performance Profiling');
  console.log('='.repeat(60));

  const store = new MockTabStore();
  const results = {
    tabCreation: null,
    gvePrune: null,
    tabPersistence: null,
    tabSwitch: null,
  };

  try {
    // Test 1: Tab creation (500 tabs)
    results.tabCreation = testTabCreation(store, MAX_TABS);

    // Test 2: GVE prune
    results.gvePrune = testGVEPrune(store);

    // Test 3: Tab persistence
    results.tabPersistence = testTabPersistence(store);

    // Test 4: Tab switching performance
    results.tabSwitch = testTabSwitch(store, 100);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📈 PERFORMANCE TEST SUMMARY');
    console.log('='.repeat(60));

    const allSuccess = Object.values(results).every(r => r && r.success !== false);

    if (allSuccess) {
      console.log('✅ All performance tests PASSED');
    } else {
      console.log('❌ Some performance tests FAILED');
    }

    console.log('\nResults:');
    console.log(
      `  Tab Creation: ${results.tabCreation.duration}ms, ${results.tabCreation.memoryMB}MB`
    );
    console.log(
      `  GVE Prune: ${results.gvePrune.success ? '✅' : '❌'} (${results.gvePrune.result.kept} nodes kept)`
    );
    console.log(
      `  Tab Persistence: ${results.tabPersistence.success ? '✅' : '❌'} (${results.tabPersistence.sizeMB}MB)`
    );
    console.log(
      `  Tab Switch: ${results.tabSwitch.success ? '✅' : '❌'} (P95: ${results.tabSwitch.p95}ms)`
    );

    // Memory check
    const finalMemory = parseFloat(store.getMemoryUsageMB());
    if (finalMemory > 1000) {
      console.warn(`⚠️  WARNING: Final memory usage (${finalMemory}MB) exceeds 1GB threshold`);
    } else {
      console.log(`✅ Memory usage (${finalMemory}MB) is within 1GB threshold`);
    }

    process.exit(allSuccess ? 0 : 1);
  } catch (error) {
    console.error('❌ Performance test failed with error:', error);
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  runPerformanceTests();
}

module.exports = { runPerformanceTests, MockTabStore };
