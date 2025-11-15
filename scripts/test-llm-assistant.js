/**
 * Test LLM Assistant API Endpoints
 * Tests page extraction, ask about page, and summarization
 */

const API_URL = process.env.VITE_API_URL || 'http://localhost:8000';

async function testPageExtraction() {
  console.log('\n📄 Testing Page Extraction...');
  try {
    const response = await fetch(`${API_URL}/extract/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://en.wikipedia.org/wiki/TypeScript',
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Page extraction successful');
    console.log(`   Title: ${data.title}`);
    console.log(`   Content length: ${data.content.length} chars`);
    console.log(`   Language: ${data.lang}`);
    return true;
  } catch (error) {
    console.error('❌ Page extraction failed:', error.message);
    return false;
  }
}

async function testAskAboutPage() {
  console.log('\n❓ Testing Ask About Page...');
  try {
    const response = await fetch(`${API_URL}/llm/ask-about-page`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'What is TypeScript?',
        url: 'https://en.wikipedia.org/wiki/TypeScript',
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Handle SSE stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let answer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'token' && data.text) {
              answer += data.text;
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }

    console.log('✅ Ask about page successful');
    console.log(`   Answer length: ${answer.length} chars`);
    console.log(`   Preview: ${answer.substring(0, 100)}...`);
    return true;
  } catch (error) {
    console.error('❌ Ask about page failed:', error.message);
    return false;
  }
}

async function testPageSummarization() {
  console.log('\n📝 Testing Page Summarization...');
  try {
    const response = await fetch(`${API_URL}/llm/summarize-page`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://en.wikipedia.org/wiki/TypeScript',
        style: 'concise',
        max_length: 100,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Handle SSE stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let summary = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'token' && data.text) {
              summary += data.text;
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }

    console.log('✅ Page summarization successful');
    console.log(`   Summary length: ${summary.length} chars`);
    console.log(`   Summary: ${summary.substring(0, 200)}...`);
    return true;
  } catch (error) {
    console.error('❌ Page summarization failed:', error.message);
    return false;
  }
}

async function testLLMAssistant() {
  console.log('\n🤖 Testing LLM Assistant...');
  try {
    const response = await fetch(`${API_URL}/llm/assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Explain quantum computing in simple terms',
        context: 'Quantum computing uses quantum mechanics principles',
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ LLM Assistant successful');
    console.log(`   Model: ${data.model}`);
    console.log(`   Response length: ${data.response.length} chars`);
    console.log(`   Preview: ${data.response.substring(0, 100)}...`);
    return true;
  } catch (error) {
    console.error('❌ LLM Assistant failed:', error.message);
    return false;
  }
}

async function testAISearch() {
  console.log('\n🔍 Testing AI Search...');
  try {
    const response = await fetch(`${API_URL}/search/ai-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'React performance optimization',
        max_results: 10,
        include_summary: true,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ AI Search successful');
    console.log(`   Total results: ${data.total_results}`);
    console.log(`   Summary length: ${data.summary?.length || 0} chars`);
    if (data.summary) {
      console.log(`   Summary preview: ${data.summary.substring(0, 100)}...`);
    }
    return true;
  } catch (error) {
    console.error('❌ AI Search failed:', error.message);
    return false;
  }
}

async function testSearchWithSummary() {
  console.log('\n🔎 Testing Search with Summary...');
  try {
    const response = await fetch(`${API_URL}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'TypeScript best practices',
        max_results: 15,
        include_summary: true,
        summary_length: 150,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Search with summary successful');
    console.log(`   Total results: ${data.total_results}`);
    console.log(`   Sources used: ${data.sources_used.join(', ')}`);
    if (data.summary) {
      console.log(`   Summary: ${data.summary.substring(0, 150)}...`);
    }
    return true;
  } catch (error) {
    console.error('❌ Search with summary failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🧪 Starting LLM Assistant & AI Search Tests\n');
  console.log(`API URL: ${API_URL}\n`);

  const results = {
    pageExtraction: await testPageExtraction(),
    askAboutPage: await testAskAboutPage(),
    pageSummarization: await testPageSummarization(),
    llmAssistant: await testLLMAssistant(),
    aiSearch: await testAISearch(),
    searchWithSummary: await testSearchWithSummary(),
  };

  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;

  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Results Summary');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);
  console.log('\nDetailed Results:');
  for (const [test, result] of Object.entries(results)) {
    console.log(`  ${result ? '✅' : '❌'} ${test}`);
  }

  if (passed === total) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});


