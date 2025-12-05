#!/usr/bin/env node

/**
 * Integration Verification Script
 * 
 * Verifies all AI features, UI components, and browser integrations are properly connected
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

const checks = {
  passed: 0,
  failed: 0,
  warnings: 0,
};

function check(name, condition, warning = false) {
  if (condition) {
    log(`  ✓ ${name}`, 'green');
    checks.passed++;
  } else {
    if (warning) {
      log(`  ⚠ ${name}`, 'yellow');
      checks.warnings++;
    } else {
      log(`  ✗ ${name}`, 'red');
      checks.failed++;
    }
  }
}

async function checkServer(url, timeout = 3000) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout }, (res) => {
      resolve({ status: res.statusCode, healthy: res.statusCode < 400, running: true });
    });
    req.on('error', () => resolve({ status: 0, healthy: false, running: false }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 0, healthy: false, running: false });
    });
  });
}

function checkFileExists(filePath, description) {
  const fullPath = path.join(process.cwd(), filePath);
  const exists = fs.existsSync(fullPath);
  check(`${description}: ${filePath}`, exists);
  return exists;
}

function checkFileContains(filePath, searchText, description) {
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    check(`${description}: ${filePath}`, false);
    return false;
  }
  const content = fs.readFileSync(fullPath, 'utf8');
  const contains = content.includes(searchText);
  check(`${description}: ${filePath}`, contains);
  return contains;
}

async function verifyAIIntegrations() {
  log('\n🤖 Verifying AI Integrations...', 'blue');
  
  // Check AI engine
  checkFileExists('src/core/ai/engine.ts', 'AI Engine');
  checkFileExists('src/core/llm/adapter.ts', 'LLM Adapter');
  
  // Check agent client
  checkFileExists('src/lib/agent-client.ts', 'Agent Client');
  checkFileContains('src/main.tsx', "import './lib/agent-client'", 'Agent Client Import');
  
  // Check agent console
  checkFileExists('src/routes/AgentConsole.tsx', 'Agent Console');
  checkFileContains('src/routes/AgentConsole.tsx', 'window.agent', 'Agent Console uses window.agent');
  checkFileContains('src/routes/AgentConsole.tsx', 'aiEngine', 'Agent Console uses aiEngine');
  
  // Check multi-agent system
  checkFileExists('src/core/agents/multiAgentSystem.ts', 'Multi-Agent System');
  
  // Check research AI integration
  checkFileContains('src/modes/research/index.tsx', 'aiEngine', 'Research uses AI Engine');
  checkFileContains('src/components/research/RegenResearchPanel.tsx', 'researchApi', 'Research Panel uses API');
}

async function verifyUIIntegrations() {
  log('\n🎨 Verifying UI/UX Integrations...', 'blue');
  
  // Check main layout
  checkFileExists('src/components/layout/AppShell.tsx', 'App Shell');
  checkFileExists('src/components/layout/TabContentSurface.tsx', 'Tab Content Surface');
  checkFileExists('src/components/layout/TabIframeManager.tsx', 'Tab Iframe Manager');
  
  // Check routing
  checkFileExists('src/main.tsx', 'Main Entry Point');
  checkFileContains('src/main.tsx', 'createBrowserRouter', 'Router Setup');
  checkFileContains('src/main.tsx', 'RouterProvider', 'Router Provider');
  
  // Check state management
  checkFileExists('src/state/tabsStore.ts', 'Tabs Store');
  checkFileExists('src/state/appStore.ts', 'App Store');
  checkFileExists('src/state/settingsStore.ts', 'Settings Store');
  
  // Check API client
  checkFileExists('src/lib/api-client.ts', 'API Client');
  checkFileContains('src/lib/api-client.ts', 'researchApi', 'Research API');
  checkFileContains('src/lib/api-client.ts', 'agentApi', 'Agent API');
}

async function verifyBrowserIntegration() {
  log('\n🌐 Verifying Browser Integration...', 'blue');
  
  // Check IPC
  checkFileExists('src/lib/ipc-typed.ts', 'IPC Typed');
  checkFileExists('src/lib/ipc-events.ts', 'IPC Events');
  
  // Check tab management
  checkFileContains('src/components/layout/AppShell.tsx', 'useTabsStore', 'App Shell uses Tabs Store');
  checkFileContains('src/components/layout/TabIframeManager.tsx', 'iframe', 'Tab Iframe Manager');
  
  // Check browser automation
  checkFileExists('src/components/browser/BrowserAutomationBridge.tsx', 'Browser Automation Bridge');
  checkFileExists('src/hooks/useBrowserAutomation.ts', 'Browser Automation Hook');
}

async function verifyBackendConnections() {
  log('\n🔌 Verifying Backend Connections...', 'blue');
  
  const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://127.0.0.1:4000';
  
  // Check server files
  checkFileExists('server/redix-server.js', 'Redix Server');
  checkFileExists('server/api/research-controller.js', 'Research Controller');
  checkFileExists('server/api/agent-controller.js', 'Agent Controller');
  
  // Check API endpoints
  log('  Checking API endpoints...', 'yellow');
  const endpoints = [
    { path: '/api/ping', name: 'Ping Endpoint' },
    { path: '/api/research/run', name: 'Research Run Endpoint' },
    { path: '/api/agent/query', name: 'Agent Query Endpoint' },
  ];
  
  for (const endpoint of endpoints) {
    const result = await checkServer(`${API_BASE_URL}${endpoint.path}`);
    check(`${endpoint.name} (${endpoint.path})`, result.running, true);
  }
}

async function verifyServiceInitialization() {
  log('\n⚙️  Verifying Service Initialization...', 'blue');
  
  // Check initialization in main.tsx
  checkFileContains('src/main.tsx', 'initializePrefetcher', 'Prefetcher Initialization');
  checkFileContains('src/main.tsx', 'startSnapshotting', 'Snapshot Service');
  
  // Check backend status
  checkFileExists('src/lib/backend-status.ts', 'Backend Status');
  checkFileContains('src/lib/backend-status.ts', 'markBackendAvailable', 'Backend Status Tracking');
  
  // Check error handling
  checkFileExists('src/core/errors/ErrorBoundary.tsx', 'Error Boundary');
  checkFileContains('src/main.tsx', 'GlobalErrorBoundary', 'Global Error Boundary');
}

async function verifyResearchIntegration() {
  log('\n🔬 Verifying Research Integration...', 'blue');
  
  checkFileExists('src/modes/research/index.tsx', 'Research Mode');
  checkFileExists('src/components/research/RegenResearchPanel.tsx', 'Regen Research Panel');
  checkFileExists('src/components/research/ResearchPanel.tsx', 'Research Panel');
  checkFileExists('src/hooks/useResearchWS.ts', 'Research WebSocket Hook');
  
  checkFileContains('src/modes/research/index.tsx', 'researchApi', 'Research Mode uses API');
  checkFileContains('src/components/research/RegenResearchPanel.tsx', 'researchApi.run', 'Research Panel calls API');
}

async function verifyAllIntegrations() {
  log('\n' + '='.repeat(70), 'cyan');
  log('🔍 Comprehensive Integration Verification', 'blue');
  log('='.repeat(70), 'cyan');

  await verifyAIIntegrations();
  await verifyUIIntegrations();
  await verifyBrowserIntegration();
  await verifyBackendConnections();
  await verifyServiceInitialization();
  await verifyResearchIntegration();

  // Summary
  log('\n' + '='.repeat(70), 'cyan');
  log('📊 Verification Summary', 'blue');
  log('='.repeat(70), 'cyan');
  log(`  ✓ Passed: ${checks.passed}`, 'green');
  log(`  ⚠ Warnings: ${checks.warnings}`, 'yellow');
  log(`  ✗ Failed: ${checks.failed}`, 'red');
  log('');

  if (checks.failed === 0) {
    log('✅ All critical integrations verified!', 'green');
    log('\n💡 Next steps:', 'yellow');
    log('   1. Start server: npm run dev:server', 'cyan');
    log('   2. Start frontend: npm run dev:web', 'cyan');
    log('   3. Test AI Agent: Navigate to /agent route', 'cyan');
    log('   4. Test Research: Navigate to research mode', 'cyan');
    return 0;
  } else {
    log('⚠ Some integrations need attention', 'yellow');
    log('\n🔧 Recommended actions:', 'yellow');
    log('   1. Review failed checks above', 'cyan');
    log('   2. Run: npm run arch:fix', 'cyan');
    log('   3. Check file paths and imports', 'cyan');
    return 1;
  }
}

if (require.main === module) {
  verifyAllIntegrations()
    .then(exitCode => process.exit(exitCode))
    .catch(error => {
      log(`\n❌ Error: ${error.message}`, 'red');
      process.exit(1);
    });
}

module.exports = { verifyAllIntegrations };

