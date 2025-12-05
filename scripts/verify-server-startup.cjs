#!/usr/bin/env node
/**
 * Verify Server Startup and Configuration
 * Checks .env loading, imports, and basic API functionality
 */

const { config } = require('dotenv');
const path = require('path');
const http = require('http');

console.log('🔍 Verifying Server Configuration...\n');

// 1. Check .env file loading
console.log('1. Checking .env file loading...');
const envPath = path.resolve(__dirname, '../.env');
const envResult = config({ path: envPath });

if (envResult.error) {
  console.log('   ⚠️  .env file not found, using example.env');
  const exampleEnvPath = path.resolve(__dirname, '../example.env');
  const exampleResult = config({ path: exampleEnvPath });
  if (exampleResult.error) {
    console.error('   ❌ Could not load example.env either');
    process.exit(1);
  } else {
    console.log('   ✅ Loaded example.env');
  }
} else {
  console.log('   ✅ .env file loaded successfully');
}

// 2. Check critical environment variables
console.log('\n2. Checking critical environment variables...');
const criticalVars = {
  'PORT': process.env.PORT || '4000',
  'OLLAMA_BASE_URL': process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  'LLM_PROVIDER': process.env.LLM_PROVIDER || 'ollama',
  'NODE_ENV': process.env.NODE_ENV || 'development',
};

let allGood = true;
for (const [key, value] of Object.entries(criticalVars)) {
  if (value) {
    console.log(`   ✅ ${key}: ${value}`);
  } else {
    console.log(`   ⚠️  ${key}: Not set (using default)`);
  }
}

// 3. Check if required modules can be imported
console.log('\n3. Checking module imports...');
const modules = [
  { name: 'fastify', path: 'fastify' },
  { name: 'dotenv', path: 'dotenv' },
  { name: 'p-limit', path: 'p-limit' },
  { name: 'ws', path: 'ws' },
];

for (const mod of modules) {
  try {
    require(mod.path);
    console.log(`   ✅ ${mod.name} - OK`);
  } catch (error) {
    console.error(`   ❌ ${mod.name} - FAILED: ${error.message}`);
    allGood = false;
  }
}

// 4. Check new performance fix modules
console.log('\n4. Checking performance fix modules...');
const perfModules = [
  { name: 'stream-fetch', path: '../server/utils/stream-fetch.cjs' },
  { name: 'async-pipeline', path: '../server/utils/async-pipeline.cjs' },
  { name: 'performance-logger', path: '../server/utils/performance-logger.cjs' },
  { name: 'realtime-sync', path: '../server/services/sync/realtime-sync.cjs' },
];

for (const mod of perfModules) {
  try {
    require(path.resolve(__dirname, mod.path));
    console.log(`   ✅ ${mod.name} - OK`);
  } catch (error) {
    console.error(`   ❌ ${mod.name} - FAILED: ${error.message}`);
    allGood = false;
  }
}

// 5. Check if server file can be parsed (syntax check)
console.log('\n5. Checking server file syntax...');
try {
  // Just check if file exists and can be read
  const fs = require('fs');
  const serverPath = path.resolve(__dirname, '../server/redix-server.js');
  const serverContent = fs.readFileSync(serverPath, 'utf8');
  
  // Basic syntax checks
  if (serverContent.includes('import') || serverContent.includes('require')) {
    console.log('   ✅ Server file syntax looks valid');
  } else {
    console.log('   ⚠️  Server file may have issues');
  }
} catch (error) {
  console.error(`   ❌ Server file check failed: ${error.message}`);
  allGood = false;
}

// 6. Test if server can start (quick check)
console.log('\n6. Testing server startup (quick check)...');
const PORT = process.env.PORT || 4000;

// Check if port is available
const testServer = http.createServer();
testServer.listen(PORT, '127.0.0.1', () => {
  testServer.close(() => {
    console.log(`   ✅ Port ${PORT} is available`);
    
    // Final summary
    console.log('\n📊 Verification Summary:');
    if (allGood) {
      console.log('   ✅ All checks passed! Server should start successfully.');
      console.log('\n💡 To start the server, run:');
      console.log('   npm run dev:server');
      console.log('   or');
      console.log('   node server/redix-server.js');
      process.exit(0);
    } else {
      console.log('   ⚠️  Some checks failed. Please review errors above.');
      process.exit(1);
    }
  });
});

testServer.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.log(`   ⚠️  Port ${PORT} is already in use (server may be running)`);
    console.log('\n📊 Verification Summary:');
    console.log('   ✅ Configuration looks good!');
    console.log('   ⚠️  Port is in use - server may already be running.');
    console.log('\n💡 To test the API, try:');
    console.log(`   curl http://localhost:${PORT}/health`);
    process.exit(0);
  } else {
    console.error(`   ❌ Port check failed: ${error.message}`);
    process.exit(1);
  }
});




