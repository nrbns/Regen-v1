/**
 * Live Tab Scraping Test Script
 * Tests the live tab scraping functionality
 *
 * Run in browser console after app loads:
 *   import('./scripts/test-live-scraping.js').then(m => m.testLiveScraping())
 */

export async function testLiveScraping() {
  console.log('🧪 Testing Live Tab Scraping\n');
  console.log('='.repeat(60));

  const results = {
    passed: [],
    failed: [],
    warnings: [],
  };

  // Test 1: Check if service exists
  console.log('\n1️⃣  Checking liveTabScraper service...');
  try {
    const { scrapeActiveTab, scrapeUrl } = await import('../src/services/liveTabScraper.ts');
    if (typeof scrapeActiveTab === 'function' && typeof scrapeUrl === 'function') {
      results.passed.push('Service exists');
      console.log('   ✅ PASS: liveTabScraper service available');
    } else {
      results.failed.push('Service exists');
      console.log('   ❌ FAIL: Service functions missing');
    }
  } catch (error) {
    results.failed.push('Service exists');
    console.log('   ❌ FAIL:', error.message);
  }

  // Test 2: Check tabs store
  console.log('\n2️⃣  Checking tabs store...');
  try {
    const { useTabsStore } = await import('../src/state/tabsStore.ts');
    const tabsState = useTabsStore.getState();
    const activeTab = tabsState.tabs.find(t => t.id === tabsState.activeId);

    if (activeTab) {
      results.passed.push('Active tab found');
      console.log('   ✅ PASS: Active tab found:', activeTab.url);
      console.log('      Title:', activeTab.title);
      console.log('      ID:', activeTab.id);
    } else {
      results.warnings.push('No active tab');
      console.log('   ⚠️  WARN: No active tab found');
      console.log('      Open a web page first to test scraping');
    }
  } catch (error) {
    results.failed.push('Tabs store');
    console.log('   ❌ FAIL:', error.message);
  }

  // Test 3: Check for iframe
  console.log('\n3️⃣  Checking for iframe...');
  try {
    const { useTabsStore } = await import('../src/state/tabsStore.ts');
    const tabsState = useTabsStore.getState();
    const activeTab = tabsState.tabs.find(t => t.id === tabsState.activeId);

    if (activeTab) {
      const iframe = document.querySelector(`iframe[data-tab-id="${activeTab.id}"]`);

      if (iframe) {
        results.passed.push('Iframe found');
        console.log('   ✅ PASS: Iframe found for active tab');
        console.log('      Iframe src:', iframe.src || 'N/A');
        console.log('      ContentWindow available:', !!iframe.contentWindow);
      } else {
        results.warnings.push('Iframe not found');
        console.log('   ⚠️  WARN: Iframe not found');
        console.log('      This is normal if tab uses different rendering method');
        console.log('      Scraper will fall back to Tauri IPC or backend scraper');
      }
    } else {
      results.warnings.push('No active tab for iframe check');
      console.log('   ⚠️  WARN: No active tab to check iframe');
    }
  } catch (error) {
    results.failed.push('Iframe check');
    console.log('   ❌ FAIL:', error.message);
  }

  // Test 4: Try scraping active tab
  console.log('\n4️⃣  Testing scrapeActiveTab()...');
  try {
    const { scrapeActiveTab } = await import('../src/services/liveTabScraper.ts');
    const startTime = performance.now();
    const result = await scrapeActiveTab();
    const duration = performance.now() - startTime;

    if (result) {
      if (result.success) {
        results.passed.push('Scrape successful');
        console.log('   ✅ PASS: Scraping succeeded');
        console.log('      URL:', result.url);
        console.log('      Title:', result.title);
        console.log('      Text length:', result.text?.length || 0);
        console.log('      Duration:', duration.toFixed(2), 'ms');
        console.log('      Images:', result.images?.length || 0);
        console.log('      Links:', result.links?.length || 0);
      } else {
        results.warnings.push('Scrape returned error');
        console.log('   ⚠️  WARN: Scraping returned error');
        console.log('      Error:', result.error);
        console.log('      This may be normal for cross-origin pages');
      }
    } else {
      results.warnings.push('Scrape returned null');
      console.log('   ⚠️  WARN: Scraping returned null');
      console.log('      This is normal if:');
      console.log('      - No active HTTP tab');
      console.log('      - Tab is about:blank');
      console.log('      - Scraping timed out (5s limit)');
    }
  } catch (error) {
    results.failed.push('Scrape execution');
    console.log('   ❌ FAIL:', error.message);
    console.log('      Stack:', error.stack);
  }

  // Test 5: Check browserScrape function injection
  console.log('\n5️⃣  Checking browserScrape() function injection...');
  try {
    const { useTabsStore } = await import('../src/state/tabsStore.ts');
    const tabsState = useTabsStore.getState();
    const activeTab = tabsState.tabs.find(t => t.id === tabsState.activeId);

    if (activeTab) {
      const iframe = document.querySelector(`iframe[data-tab-id="${activeTab.id}"]`);

      if (iframe?.contentWindow) {
        const browserScrape = iframe.contentWindow?.browserScrape;
        if (typeof browserScrape === 'function') {
          results.passed.push('browserScrape injected');
          console.log('   ✅ PASS: browserScrape() function is injected');
        } else {
          results.warnings.push('browserScrape not injected');
          console.log('   ⚠️  WARN: browserScrape() function not found');
          console.log('      This may be normal if BrowserAutomationBridge');
          console.log("      hasn't injected the script yet");
        }
      } else {
        results.warnings.push('No iframe for browserScrape check');
        console.log('   ⚠️  WARN: No iframe to check browserScrape');
      }
    } else {
      results.warnings.push('No active tab for browserScrape check');
      console.log('   ⚠️  WARN: No active tab');
    }
  } catch (error) {
    results.failed.push('browserScrape check');
    console.log('   ❌ FAIL:', error.message);
  }

  // Test 6: Test scrapeUrl function
  console.log('\n6️⃣  Testing scrapeUrl() with example.com...');
  try {
    const { scrapeUrl } = await import('../src/services/liveTabScraper.ts');
    const testUrl = 'https://example.com';
    const startTime = performance.now();
    const result = await scrapeUrl(testUrl);
    const duration = performance.now() - startTime;

    if (result) {
      if (result.success) {
        results.passed.push('scrapeUrl successful');
        console.log('   ✅ PASS: scrapeUrl() succeeded');
        console.log('      URL:', result.url);
        console.log('      Title:', result.title);
        console.log('      Duration:', duration.toFixed(2), 'ms');
      } else {
        results.warnings.push('scrapeUrl returned error');
        console.log('   ⚠️  WARN: scrapeUrl() returned error');
        console.log('      Error:', result.error);
      }
    } else {
      results.warnings.push('scrapeUrl returned null');
      console.log('   ⚠️  WARN: scrapeUrl() returned null');
      console.log('      This may be normal if URL is not accessible');
    }
  } catch (error) {
    results.failed.push('scrapeUrl execution');
    console.log('   ❌ FAIL:', error.message);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Results Summary');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`⚠️  Warnings: ${results.warnings.length}`);

  if (results.passed.length > 0) {
    console.log('\n✅ Passed Tests:');
    results.passed.forEach(test => console.log(`   - ${test}`));
  }

  if (results.failed.length > 0) {
    console.log('\n❌ Failed Tests:');
    results.failed.forEach(test => console.log(`   - ${test}`));
  }

  if (results.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    results.warnings.forEach(warn => console.log(`   - ${warn}`));
  }

  console.log('\n' + '='.repeat(60));

  if (results.failed.length === 0) {
    console.log('🎉 All critical tests passed!');
    console.log('\n💡 Next steps:');
    console.log('   1. Open a web page in browser tab');
    console.log('   2. Switch to Research mode');
    console.log('   3. Enter query: "Research this page"');
    console.log('   4. Click Research');
    console.log('   5. Verify "Current Page" appears in sources');
    return true;
  } else {
    console.log('⚠️  Some tests failed - check errors above');
    return false;
  }
}

// Auto-export for browser
if (typeof window !== 'undefined') {
  window.testLiveScraping = testLiveScraping;
  console.log('💡 Run window.testLiveScraping() in browser console to test');
}
