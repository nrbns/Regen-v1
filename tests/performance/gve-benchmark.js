// Performance Benchmark for GVE Optimizations
// Run this in browser console or with Playwright

async function benchmarkGVE() {
  const results = {
    iframeSwitching: [],
    renderPerformance: [],
    memoryUsage: [],
    frameRates: [],
  };

  // Test 1: Iframe switching performance
  console.log('Testing iframe switching...');
  const iframeSwitchStart = performance.now();
  // Simulate tab switching
  for (let i = 0; i < 100; i++) {
    // This would be actual tab switching in real test
    await new Promise(resolve => requestAnimationFrame(resolve));
  }
  const iframeSwitchTime = performance.now() - iframeSwitchStart;
  results.iframeSwitching.push(iframeSwitchTime);

  // Test 2: Render performance
  console.log('Testing render performance...');
  const renderStart = performance.now();
  // Simulate multiple renders
  for (let i = 0; i < 50; i++) {
    document.body.style.display = 'none';
    document.body.offsetHeight; // Force reflow
    document.body.style.display = '';
  }
  const renderTime = performance.now() - renderStart;
  results.renderPerformance.push(renderTime);

  // Test 3: Memory usage
  console.log('Checking memory usage...');
  if (performance.memory) {
    results.memoryUsage.push({
      used: performance.memory.usedJSHeapSize,
      total: performance.memory.totalJSHeapSize,
      limit: performance.memory.jsHeapSizeLimit,
    });
  }

  // Test 4: Frame rate monitoring
  console.log('Monitoring frame rates...');
  let frameCount = 0;
  let lastTime = performance.now();
  const frameRateStart = performance.now();

  function countFrame() {
    frameCount++;
    const currentTime = performance.now();
    if (currentTime - frameRateStart < 5000) {
      requestAnimationFrame(countFrame);
    } else {
      const fps = frameCount / ((currentTime - frameRateStart) / 1000);
      results.frameRates.push(fps);
      console.log(`Average FPS: ${fps.toFixed(2)}`);
    }
  }
  requestAnimationFrame(countFrame);

  return results;
}

// Run benchmark
benchmarkGVE().then(results => {
  console.log('\n📊 Benchmark Results:');
  console.log(JSON.stringify(results, null, 2));

  // Save to window for external access
  window.benchmarkResults = results;
});
