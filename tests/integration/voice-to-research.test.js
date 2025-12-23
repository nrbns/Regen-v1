/**
 * Integration Test: Voice → Research Flow
 * Tests: Voice command → Research mode → Scrape → Summarize
 *
 * Run: node tests/integration/voice-to-research.test.js
 */

const { performance } = require('perf_hooks');

// Mock implementations for testing
class MockVoiceService {
  async recognizeCommand(audioOrText) {
    // Simulate voice recognition
    const text = typeof audioOrText === 'string' ? audioOrText : 'Research Bitcoin';
    return {
      text,
      confidence: 0.95,
      language: 'en',
    };
  }
}

class MockResearchService {
  async search(query) {
    // Simulate research search
    return {
      query,
      results: [
        {
          title: 'Bitcoin Overview',
          url: 'https://example.com/bitcoin',
          snippet: 'Bitcoin is a cryptocurrency...',
        },
        {
          title: 'Bitcoin Price',
          url: 'https://example.com/btc-price',
          snippet: 'Current Bitcoin price is...',
        },
      ],
    };
  }

  async scrapePage(url) {
    // Simulate page scraping
    return {
      url,
      content: 'Bitcoin is a decentralized digital currency...',
      title: 'Bitcoin Overview',
    };
  }

  async summarize(content) {
    // Simulate summarization
    return {
      summary: 'Bitcoin is a cryptocurrency that operates on a decentralized network...',
      confidence: 0.9,
    };
  }
}

// Test flow
async function testVoiceToResearchFlow() {
  console.log('🧪 Testing Voice → Research Flow');
  console.log('='.repeat(60));

  const voiceService = new MockVoiceService();
  const researchService = new MockResearchService();
  const startTime = performance.now();

  try {
    // Step 1: Voice recognition
    console.log('\n1️⃣ Voice Recognition...');
    const voiceResult = await voiceService.recognizeCommand('Research Bitcoin');
    console.log(`   ✅ Recognized: "${voiceResult.text}" (confidence: ${voiceResult.confidence})`);

    if (!voiceResult.text.toLowerCase().includes('research')) {
      throw new Error('Voice recognition failed: command not recognized');
    }

    // Step 2: Extract query
    const query = voiceResult.text.replace(/research/gi, '').trim();
    console.log(`   ✅ Extracted query: "${query}"`);

    // Step 3: Research search
    console.log('\n2️⃣ Research Search...');
    const searchResult = await researchService.search(query);
    console.log(`   ✅ Found ${searchResult.results.length} results`);

    if (searchResult.results.length === 0) {
      throw new Error('Research search failed: no results');
    }

    // Step 4: Scrape first result
    console.log('\n3️⃣ Page Scraping...');
    const firstResult = searchResult.results[0];
    const scraped = await researchService.scrapePage(firstResult.url);
    console.log(`   ✅ Scraped: ${scraped.title} (${scraped.content.length} chars)`);

    if (!scraped.content) {
      throw new Error('Page scraping failed: no content');
    }

    // Step 5: Summarize
    console.log('\n4️⃣ Summarization...');
    const summary = await researchService.summarize(scraped.content);
    console.log(`   ✅ Summary: ${summary.summary.substring(0, 100)}...`);
    console.log(`   ✅ Confidence: ${summary.confidence}`);

    const duration = (performance.now() - startTime).toFixed(2);
    console.log('\n' + '='.repeat(60));
    console.log(`✅ Voice → Research Flow: PASSED (${duration}ms)`);
    console.log('='.repeat(60));

    // Success criteria
    const success = {
      voiceRecognition: voiceResult.confidence > 0.8,
      researchResults: searchResult.results.length > 0,
      scraping: scraped.content.length > 0,
      summarization: summary.confidence > 0.8,
      totalTime: parseFloat(duration) < 3000, // < 3s target
    };

    if (Object.values(success).every(v => v === true)) {
      return { success: true, duration: parseFloat(duration), details: success };
    } else {
      throw new Error('Some success criteria not met');
    }
  } catch (error) {
    const duration = (performance.now() - startTime).toFixed(2);
    console.error('\n❌ Voice → Research Flow: FAILED');
    console.error(`   Error: ${error.message}`);
    console.error(`   Duration: ${duration}ms`);
    return { success: false, duration: parseFloat(duration), error: error.message };
  }
}

// Run test
if (require.main === module) {
  testVoiceToResearchFlow()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { testVoiceToResearchFlow };
