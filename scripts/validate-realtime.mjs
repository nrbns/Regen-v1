#!/usr/bin/env node

/**
 * Quick validation script for realtime infrastructure
 * Tests that all files compile and basic logic works
 */

import { strict as assert } from 'assert';

console.log('🔍 Validating Realtime Infrastructure...\n');

// Test 1: Job State Machine
console.log('1️⃣ Testing Job State Machine...');
try {
  const { isValidTransition, getValidNextStates, isTerminalState } = await import('../server/jobState.ts');
  
  // Test valid transitions
  assert(isValidTransition('created', 'running') === true, 'created → running should be valid');
  assert(isValidTransition('running', 'completed') === true, 'running → completed should be valid');
  assert(isValidTransition('completed', 'running') === false, 'completed → running should be invalid');
  
  // Test terminal states
  assert(isTerminalState('completed') === true, 'completed should be terminal');
  assert(isTerminalState('running') === false, 'running should not be terminal');
  
  // Test state retrieval
  const nextStates = getValidNextStates('running');
  assert(nextStates.includes('completed'), 'running should allow transition to completed');
  
  console.log('   ✅ Job state machine validation passed\n');
} catch (error) {
  console.error('   ❌ Job state machine validation failed:', error);
  process.exit(1);
}

// Test 2: File Structure
console.log('2️⃣ Checking File Structure...');
try {
  const fs = await import('fs');
  const path = await import('path');
  
  const requiredFiles = [
    'server/realtime.ts',
    'server/streamingWorker.ts',
    'server/jobState.ts',
    'server/index.ts',
    'server/package.json',
    'server/tsconfig.json',
    'src/services/realtimeSocket.ts',
    'src/services/realtimeInit.ts',
    'src/hooks/useRealtimeJob.ts',
    'src/components/jobs/JobStatusPanel.tsx',
    'tests/load/k6-realtime-smoke.js',
    'docs/REALTIME_SETUP.md',
  ];
  
  for (const file of requiredFiles) {
    const filePath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing required file: ${file}`);
    }
  }
  
  console.log('   ✅ All required files present\n');
} catch (error) {
  console.error('   ❌ File structure validation failed:', error);
  process.exit(1);
}

// Test 3: Package.json scripts
console.log('3️⃣ Checking Package Scripts...');
try {
  const fs = await import('fs');
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  
  const requiredScripts = [
    'dev:realtime',
    'test:load:realtime',
  ];
  
  for (const script of requiredScripts) {
    if (!packageJson.scripts[script]) {
      throw new Error(`Missing required script: ${script}`);
    }
  }
  
  console.log('   ✅ All required scripts present\n');
} catch (error) {
  console.error('   ❌ Package scripts validation failed:', error);
  process.exit(1);
}

// Test 4: Dependencies
console.log('4️⃣ Checking Server Dependencies...');
try {
  const fs = await import('fs');
  const serverPackage = JSON.parse(fs.readFileSync('server/package.json', 'utf-8'));
  
  const requiredDeps = [
    'express',
    'socket.io',
    '@socket.io/redis-adapter',
    'redis',
    'jsonwebtoken',
  ];
  
  for (const dep of requiredDeps) {
    if (!serverPackage.dependencies[dep]) {
      throw new Error(`Missing required dependency: ${dep}`);
    }
  }
  
  console.log('   ✅ All required dependencies declared\n');
} catch (error) {
  console.error('   ❌ Dependencies validation failed:', error);
  process.exit(1);
}

console.log('✨ All validations passed!\n');
console.log('Next steps:');
console.log('  1. Install server dependencies: cd server && npm install');
console.log('  2. Start Redis: docker run -d -p 6379:6379 redis:alpine');
console.log('  3. Start realtime server: npm run dev:realtime');
console.log('  4. Run load test: npm run test:load:realtime\n');
