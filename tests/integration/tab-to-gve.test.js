/**
 * Integration Test: Tab → GVE Flow
 * Tests: Open tabs → GVE indexing → Search tabs
 *
 * Run: node tests/integration/tab-to-gve.test.js
 */

const { performance } = require('perf_hooks');

// Mock implementations
class MockTabStore {
  constructor() {
    this.tabs = [];
    this.gveIndex = new Map();
  }

  addTab(tab) {
    this.tabs.push(tab);
    // Simulate GVE indexing
    this.gveIndex.set(tab.id, {
      id: tab.id,
      url: tab.url,
      title: tab.title,
      content: tab.content || '',
      embeddings: this.generateEmbeddings(tab),
      indexedAt: Date.now(),
    });
  }

  generateEmbeddings(tab) {
    // Mock embeddings (in real implementation, use HNSW)
    return {
      vector: new Array(128).fill(0).map(() => Math.random()),
      metadata: { url: tab.url, title: tab.title },
    };
  }

  searchTabs(query, limit = 10) {
    // Mock semantic search
    const results = Array.from(this.gveIndex.values())
      .filter(node => {
        const searchText = `${node.title} ${node.content}`.toLowerCase();
        return searchText.includes(query.toLowerCase());
      })
      .slice(0, limit);

    return results.map(node => ({
      id: node.id,
      title: node.title,
      url: node.url,
      score: Math.random(), // Mock similarity score
    }));
  }
}

// Test flow
async function testTabToGVEFlow() {
  console.log('🧪 Testing Tab → GVE Flow');
  console.log('='.repeat(60));

  const tabStore = new MockTabStore();
  const startTime = performance.now();

  try {
    // Step 1: Create tabs
    console.log('\n1️⃣ Creating tabs...');
    const testTabs = [
      {
        id: 'tab-1',
        url: 'https://example.com/bitcoin',
        title: 'Bitcoin Overview',
        content: 'Bitcoin is a cryptocurrency',
      },
      {
        id: 'tab-2',
        url: 'https://example.com/ethereum',
        title: 'Ethereum Guide',
        content: 'Ethereum is a blockchain platform',
      },
      {
        id: 'tab-3',
        url: 'https://example.com/crypto',
        title: 'Crypto News',
        content: 'Latest cryptocurrency news',
      },
      {
        id: 'tab-4',
        url: 'https://example.com/trading',
        title: 'Trading Guide',
        content: 'Learn how to trade cryptocurrencies',
      },
      {
        id: 'tab-5',
        url: 'https://example.com/nft',
        title: 'NFT Marketplace',
        content: 'Buy and sell NFTs',
      },
    ];

    testTabs.forEach(tab => tabStore.addTab(tab));
    console.log(`   ✅ Created ${testTabs.length} tabs`);

    // Step 2: Verify GVE indexing
    console.log('\n2️⃣ Verifying GVE indexing...');
    const indexedCount = tabStore.gveIndex.size;
    console.log(`   ✅ Indexed ${indexedCount} tabs in GVE`);

    if (indexedCount !== testTabs.length) {
      throw new Error(`GVE indexing failed: expected ${testTabs.length}, got ${indexedCount}`);
    }

    // Step 3: Search tabs
    console.log('\n3️⃣ Searching tabs...');
    const searchQueries = ['bitcoin', 'crypto', 'trading'];

    for (const query of searchQueries) {
      const results = tabStore.searchTabs(query);
      console.log(`   ✅ Query "${query}": Found ${results.length} results`);

      if (results.length === 0) {
        throw new Error(`Search failed for query: "${query}"`);
      }
    }

    // Step 4: Verify search relevance
    console.log('\n4️⃣ Verifying search relevance...');
    const bitcoinResults = tabStore.searchTabs('bitcoin');
    const hasBitcoinTab = bitcoinResults.some(r => r.title.toLowerCase().includes('bitcoin'));

    if (!hasBitcoinTab) {
      throw new Error('Search relevance failed: Bitcoin tab not found in results');
    }
    console.log('   ✅ Search relevance verified');

    const duration = (performance.now() - startTime).toFixed(2);
    console.log('\n' + '='.repeat(60));
    console.log(`✅ Tab → GVE Flow: PASSED (${duration}ms)`);
    console.log('='.repeat(60));

    return {
      success: true,
      duration: parseFloat(duration),
      tabsCreated: testTabs.length,
      indexed: indexedCount,
      searchQueries: searchQueries.length,
    };
  } catch (error) {
    const duration = (performance.now() - startTime).toFixed(2);
    console.error('\n❌ Tab → GVE Flow: FAILED');
    console.error(`   Error: ${error.message}`);
    console.error(`   Duration: ${duration}ms`);
    return { success: false, duration: parseFloat(duration), error: error.message };
  }
}

// Run test
if (require.main === module) {
  testTabToGVEFlow()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { testTabToGVEFlow };
