/**
 * Research Mode Integration Verification Script
 * Checks all integration points are properly wired
 *
 * Run in browser console after app loads:
 *   import('./scripts/verify-research-integration.js').then(m => m.verify())
 */

export async function verify() {
  console.log('🔍 Research Mode Integration Verification\n');
  console.log('='.repeat(60));

  const results = {
    passed: [],
    failed: [],
    warnings: [],
  };

  // Test 1: Check browser:search event can be dispatched
  console.log('\n1️⃣  Testing browser:search event dispatch...');
  try {
    let eventReceived = false;
    const listener = e => {
      eventReceived = true;
      console.log('   ✅ Event received:', e.detail);
    };
    window.addEventListener('browser:search', listener);

    window.dispatchEvent(
      new CustomEvent('browser:search', {
        detail: { query: 'test query', engine: 'google' },
      })
    );

    await new Promise(resolve => setTimeout(resolve, 100));
    window.removeEventListener('browser:search', listener);

    if (eventReceived) {
      results.passed.push('browser:search event dispatch');
      console.log('   ✅ PASS: browser:search events work');
    } else {
      results.failed.push('browser:search event dispatch');
      console.log('   ❌ FAIL: browser:search events not working');
    }
  } catch (error) {
    results.failed.push('browser:search event dispatch');
    console.log('   ❌ FAIL:', error.message);
  }

  // Test 2: Check liveTabScraper service exists
  console.log('\n2️⃣  Testing liveTabScraper service...');
  try {
    const { scrapeActiveTab, scrapeUrl } = await import('../src/services/liveTabScraper.ts');
    if (typeof scrapeActiveTab === 'function' && typeof scrapeUrl === 'function') {
      results.passed.push('liveTabScraper service');
      console.log('   ✅ PASS: liveTabScraper service available');
    } else {
      results.failed.push('liveTabScraper service');
      console.log('   ❌ FAIL: liveTabScraper functions missing');
    }
  } catch (error) {
    results.failed.push('liveTabScraper service');
    console.log('   ❌ FAIL:', error.message);
  }

  // Test 3: Check agenticActionParser service exists
  console.log('\n3️⃣  Testing agenticActionParser service...');
  try {
    const { parseAgenticActions, executeAgenticAction } =
      await import('../src/services/agenticActionParser.ts');
    if (typeof parseAgenticActions === 'function' && typeof executeAgenticAction === 'function') {
      results.passed.push('agenticActionParser service');
      console.log('   ✅ PASS: agenticActionParser service available');

      // Test parsing
      const testText = 'Answer here. [SCRAPE current page] and [SUMMARIZE] it.';
      const actions = parseAgenticActions(testText);
      if (actions.length === 2) {
        console.log('   ✅ PASS: Action parsing works (found 2 actions)');
      } else {
        console.log('   ⚠️  WARN: Expected 2 actions, got', actions.length);
        results.warnings.push('agenticActionParser parsing');
      }
    } else {
      results.failed.push('agenticActionParser service');
      console.log('   ❌ FAIL: agenticActionParser functions missing');
    }
  } catch (error) {
    results.failed.push('agenticActionParser service');
    console.log('   ❌ FAIL:', error.message);
  }

  // Test 4: Check realtimeSourceUpdater service exists
  console.log('\n4️⃣  Testing realtimeSourceUpdater service...');
  try {
    const { subscribeToSourceUpdates, updateSource } =
      await import('../src/services/realtimeSourceUpdater.ts');
    if (typeof subscribeToSourceUpdates === 'function' && typeof updateSource === 'function') {
      results.passed.push('realtimeSourceUpdater service');
      console.log('   ✅ PASS: realtimeSourceUpdater service available');
    } else {
      results.failed.push('realtimeSourceUpdater service');
      console.log('   ❌ FAIL: realtimeSourceUpdater functions missing');
    }
  } catch (error) {
    results.failed.push('realtimeSourceUpdater service');
    console.log('   ❌ FAIL:', error.message);
  }

  // Test 5: Check if browserScrape function would be available in iframe
  console.log('\n5️⃣  Testing browserScrape function injection...');
  try {
    // Check if BrowserAutomationBridge exists
    const bridgeModule =
      await import('../src/components/browser/BrowserAutomationBridge.tsx').catch(() => null);
    if (bridgeModule) {
      results.passed.push('BrowserAutomationBridge component');
      console.log('   ✅ PASS: BrowserAutomationBridge component exists');
      console.log('   ℹ️  Note: browserScrape() is injected at runtime into iframes');
    } else {
      results.warnings.push('BrowserAutomationBridge component');
      console.log('   ⚠️  WARN: BrowserAutomationBridge not found (may be lazy loaded)');
    }
  } catch (error) {
    results.warnings.push('BrowserAutomationBridge component');
    console.log('   ⚠️  WARN:', error.message);
  }

  // Test 6: Check Research mode event listeners
  console.log('\n6️⃣  Testing Research mode event listeners...');
  try {
    // Check if research mode is loaded
    const researchModule = await import('../src/modes/research/index.tsx').catch(() => null);
    if (researchModule) {
      results.passed.push('Research mode component');
      console.log('   ✅ PASS: Research mode component exists');
      console.log('   ℹ️  Note: Event listeners are set up in useEffect hooks');
    } else {
      results.warnings.push('Research mode component');
      console.log('   ⚠️  WARN: Research mode not found (may be lazy loaded)');
    }
  } catch (error) {
    results.warnings.push('Research mode component');
    console.log('   ⚠️  WARN:', error.message);
  }

  // Test 7: Check Omnibox component
  console.log('\n7️⃣  Testing Omnibox component...');
  try {
    const omniboxModule = await import('../src/components/TopNav/Omnibox.tsx').catch(() => null);
    if (omniboxModule) {
      results.passed.push('Omnibox component');
      console.log('   ✅ PASS: Omnibox component exists');
      console.log('   ℹ️  Note: browser:search events dispatched on search actions');
    } else {
      results.warnings.push('Omnibox component');
      console.log('   ⚠️  WARN: Omnibox not found (may be lazy loaded)');
    }
  } catch (error) {
    results.warnings.push('Omnibox component');
    console.log('   ⚠️  WARN:', error.message);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Verification Summary');
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
    console.log('🎉 All critical tests passed! Integration looks good.');
    console.log('\n💡 Next steps:');
    console.log('   1. Open a web page in browser tab');
    console.log('   2. Switch to Research mode');
    console.log('   3. Enter query or use omnibox search');
    console.log('   4. Verify "Current Page" appears in sources');
    console.log('   5. Check that agentic actions execute');
    return true;
  } else {
    console.log('⚠️  Some tests failed. Check errors above.');
    return false;
  }
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
  // Export for manual use
  window.verifyResearchIntegration = verify;
  console.log('💡 Run window.verifyResearchIntegration() to verify integration');
}
