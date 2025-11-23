/**
 * Agent System Test Script
 * Comprehensive test for AI agent functionality
 * Run with: node scripts/test-agent-system.js
 */

const fs = require('fs');
const path = require('path');

const TEST_RESULTS = {
  passed: [],
  failed: [],
  skipped: [],
};

function log(message, type = 'info') {
  const prefix =
    {
      info: 'ℹ️',
      success: '✅',
      error: '❌',
      warning: '⚠️',
    }[type] || 'ℹ️';
  console.log(`${prefix} ${message}`);
}

function test(name, fn) {
  try {
    fn();
    TEST_RESULTS.passed.push(name);
    log(`${name}`, 'success');
  } catch (error) {
    TEST_RESULTS.failed.push({ name, error: error.message });
    log(`${name}: ${error.message}`, 'error');
  }
}

function testAsync(name, fn) {
  return fn()
    .then(() => {
      TEST_RESULTS.passed.push(name);
      log(`${name}`, 'success');
    })
    .catch(error => {
      TEST_RESULTS.failed.push({ name, error: error.message });
      log(`${name}: ${error.message}`, 'error');
    });
}

async function checkFileExists(filePath, description) {
  return testAsync(`${description} - File exists: ${filePath}`, async () => {
    const fullPath = path.join(__dirname, '..', filePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${fullPath}`);
    }
  });
}

async function checkCodeContains(filePath, searchString, description) {
  return testAsync(`${description} - Code contains: ${searchString}`, async () => {
    const fullPath = path.join(__dirname, '..', filePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${fullPath}`);
    }
    const content = fs.readFileSync(fullPath, 'utf-8');
    if (!content.includes(searchString)) {
      throw new Error(`Code not found: ${searchString} in ${filePath}`);
    }
  });
}

async function checkImportExists(filePath, importPath, description) {
  return testAsync(`${description} - Import exists: ${importPath}`, async () => {
    const fullPath = path.join(__dirname, '..', filePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${fullPath}`);
    }
    const content = fs.readFileSync(fullPath, 'utf-8');
    // Check for various import styles
    const importPatterns = [
      `from '${importPath}'`,
      `from "${importPath}"`,
      `require('${importPath}')`,
      `require("${importPath}")`,
      `import '${importPath}'`,
      `import "${importPath}"`,
    ];
    const found = importPatterns.some(pattern => content.includes(pattern));
    if (!found) {
      throw new Error(`Import not found: ${importPath} in ${filePath}`);
    }
  });
}

async function runTests() {
  log('Starting Agent System Tests...', 'info');
  log('='.repeat(60), 'info');
  log('');

  // Test 1: Core Agent Files
  log('Test 1: Core Agent Files', 'info');
  await checkFileExists('electron/services/agent/store.ts', 'AgentStore');
  await checkFileExists('electron/services/agent/ipc.ts', 'Agent IPC Handlers');
  await checkFileExists('electron/services/agent/brain.ts', 'Agent Brain');
  await checkFileExists('src/agent/registry.ts', 'Agent Tool Registry');
  await checkFileExists('src/agent/runAgent.ts', 'Agent Runner');
  log('');

  // Test 2: Agent Store Initialization
  log('Test 2: Agent Store Initialization', 'info');
  await checkCodeContains(
    'electron/main.ts',
    'const agentStore = new AgentStore()',
    'AgentStore initialized'
  );
  await checkCodeContains('electron/main.ts', 'import { AgentStore }', 'AgentStore imported');
  await checkCodeContains('electron/main.ts', 'registerAgentIpc()', 'Agent IPC registered');
  log('');

  // Test 3: Agent IPC Handlers (New System)
  log('Test 3: Agent IPC Handlers (New System)', 'info');
  await checkCodeContains(
    'electron/services/agent/ipc.ts',
    "registerHandler('agent:createTask'",
    'agent:createTask handler'
  );
  await checkCodeContains(
    'electron/services/agent/ipc.ts',
    "registerHandler('agent:executeSkill'",
    'agent:executeSkill handler'
  );
  await checkCodeContains(
    'electron/services/agent/ipc.ts',
    "registerHandler('agent:getStatus'",
    'agent:getStatus handler'
  );
  await checkCodeContains(
    'electron/services/agent/ipc.ts',
    "registerHandler('agent:generatePlanFromGoal'",
    'agent:generatePlanFromGoal handler'
  );
  await checkCodeContains(
    'electron/services/agent/ipc.ts',
    "registerHandler('agent:executePlan'",
    'agent:executePlan handler'
  );
  log('');

  // Test 3b: Legacy Agent IPC Handlers (Backward Compatibility)
  log('Test 3b: Legacy Agent IPC Handlers', 'info');
  await checkCodeContains(
    'electron/main.ts',
    "ipcMain.handle('agent:start'",
    'Legacy agent:start handler'
  );
  await checkCodeContains(
    'electron/main.ts',
    "ipcMain.handle('agent:stop'",
    'Legacy agent:stop handler'
  );
  await checkCodeContains(
    'electron/main.ts',
    "ipcMain.handle('agent:status'",
    'Legacy agent:status handler'
  );
  await checkCodeContains(
    'electron/main.ts',
    "ipcMain.handle('agent:runs'",
    'Legacy agent:runs handler'
  );
  await checkCodeContains(
    'electron/main.ts',
    "ipcMain.handle('agent:run:get'",
    'Legacy agent:run:get handler'
  );
  log('');

  // Test 4: Preload API
  log('Test 4: Preload API', 'info');
  await checkCodeContains('electron/preload.ts', 'agent:', 'Agent API in preload');
  await checkCodeContains('electron/preload.cjs', 'agent:', 'Agent API in preload.cjs');
  log('');

  // Test 5: Frontend Components
  log('Test 5: Frontend Components', 'info');
  await checkFileExists('src/routes/AgentConsole.tsx', 'AgentConsole component');
  await checkFileExists('src/components/AgentOverlay.tsx', 'AgentOverlay component');
  log('');

  // Test 6: Agent Tools Registry
  log('Test 6: Agent Tools Registry', 'info');
  await checkCodeContains(
    'src/agent/registry.ts',
    'toolRegistry.register',
    'Tool registry has tools'
  );
  await checkCodeContains('src/agent/registry.ts', 'scrapePage', 'scrapePage tool registered');
  await checkCodeContains(
    'src/agent/registry.ts',
    'summarizeText',
    'summarizeText tool registered'
  );
  await checkCodeContains('src/agent/registry.ts', 'searchWeb', 'searchWeb tool registered');
  log('');

  // Test 7: Agent Runner Tasks
  log('Test 7: Agent Runner Tasks', 'info');
  await checkCodeContains('src/agent/runAgent.ts', 'quick_summary', 'quick_summary task type');
  await checkCodeContains('src/agent/runAgent.ts', 'deep_research', 'deep_research task type');
  await checkCodeContains('src/agent/runAgent.ts', 'compare_urls', 'compare_urls task type');
  await checkCodeContains('src/agent/runAgent.ts', 'explain_page', 'explain_page task type');
  log('');

  // Test 8: Skills System
  log('Test 8: Skills System', 'info');
  await checkFileExists('electron/services/agent/skills/index.ts', 'Skills index');
  await checkCodeContains(
    'electron/services/agent/ipc.ts',
    "import('./skills/index')",
    'Skills imported'
  );
  log('');

  // Test 9: Agent Host
  log('Test 9: Agent Host', 'info');
  await checkFileExists('electron/services/agent/host.ts', 'AgentHost');
  await checkCodeContains('electron/services/agent/ipc.ts', 'AgentHost', 'AgentHost used');
  log('');

  // Test 10: Planner and Executor
  log('Test 10: Planner and Executor', 'info');
  await checkCodeContains('electron/services/agent/ipc.ts', 'getPlanner', 'Planner used');
  await checkCodeContains('electron/services/agent/ipc.ts', 'getPlanExecutor', 'PlanExecutor used');
  await checkCodeContains('electron/services/agent/ipc.ts', 'getGuardrails', 'Guardrails used');
  log('');

  // Test 11: Type Definitions
  log('Test 11: Type Definitions', 'info');
  await checkCodeContains(
    'src/agent/registry.ts',
    'export type AgentTool',
    'AgentTool type exported'
  );
  await checkCodeContains(
    'src/agent/registry.ts',
    'export interface ToolDefinition',
    'ToolDefinition interface exported'
  );
  await checkCodeContains(
    'src/agent/runAgent.ts',
    'export type AgentTask',
    'AgentTask type exported'
  );
  await checkCodeContains(
    'src/agent/runAgent.ts',
    'export interface AgentResult',
    'AgentResult interface exported'
  );
  log('');

  // Summary
  log('');
  log('='.repeat(60), 'info');
  log('Test Summary', 'info');
  log('='.repeat(60), 'info');
  log(`✅ Passed: ${TEST_RESULTS.passed.length}`, 'success');
  log(
    `❌ Failed: ${TEST_RESULTS.failed.length}`,
    TEST_RESULTS.failed.length > 0 ? 'error' : 'info'
  );
  log(`⏭️  Skipped: ${TEST_RESULTS.skipped.length}`, 'warning');
  log('');

  if (TEST_RESULTS.failed.length > 0) {
    log('Failed Tests:', 'error');
    TEST_RESULTS.failed.forEach(({ name, error }) => {
      log(`  - ${name}: ${error}`, 'error');
    });
    log('');
    process.exit(1);
  } else {
    log('All agent system tests passed! 🎉', 'success');
    log('');
    log('Next Steps:', 'info');
    log('1. Start the Electron app: npm run dev', 'info');
    log('2. Open DevTools console', 'info');
    log('3. Test agent API: console.log(typeof window.agent)', 'info');
    log('4. Test agent start: await window.agent.start({goal: "test", steps: []})', 'info');
    log('');
    process.exit(0);
  }
}

runTests().catch(error => {
  log(`Test runner error: ${error.message}`, 'error');
  process.exit(1);
});
