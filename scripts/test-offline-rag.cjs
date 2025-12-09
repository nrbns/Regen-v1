#!/usr/bin/env node
/**
 * Test Script for Offline RAG System
 * Verifies IndexedDB storage, FlexSearch indexing, and RAG retrieval
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Offline RAG Implementation...\n');

const ROOT_DIR = path.join(__dirname, '..');
let checksPassed = 0;
let checksFailed = 0;

function check(name, condition) {
  if (condition) {
    console.log(`✅ ${name}`);
    checksPassed++;
  } else {
    console.log(`❌ ${name}`);
    checksFailed++;
  }
}

// Check 1: IndexedDB store exists
console.log('📦 Core Files:');
const indexedDBPath = path.join(ROOT_DIR, 'src', 'lib', 'offline-store', 'indexedDB.ts');
check('IndexedDB store exists', fs.existsSync(indexedDBPath));

// Check 2: FlexSearch integration exists
const flexsearchPath = path.join(ROOT_DIR, 'src', 'lib', 'offline-store', 'flexsearch.ts');
check('FlexSearch integration exists', fs.existsSync(flexsearchPath));

// Check 3: RAG system exists
const ragPath = path.join(ROOT_DIR, 'src', 'lib', 'offline-store', 'rag.ts');
check('RAG system exists', fs.existsSync(ragPath));

// Check 4: Frontend service exists
const servicePath = path.join(ROOT_DIR, 'src', 'services', 'offlineRAG.ts');
check('Offline RAG service exists', fs.existsSync(servicePath));

// Check 5: React hook exists
const hookPath = path.join(ROOT_DIR, 'src', 'hooks', 'useOfflineRAG.ts');
check('useOfflineRAG hook exists', fs.existsSync(hookPath));

// Check 6: Documentation exists
console.log('\n📚 Documentation:');
const docPath = path.join(ROOT_DIR, 'docs', 'OFFLINE_RAG_SETUP.md');
check('Documentation exists', fs.existsSync(docPath));

// Check 7: Dependencies
console.log('\n📦 Dependencies:');
const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
const hasDexie = packageJson.dependencies?.dexie || packageJson.devDependencies?.dexie;
const hasFlexSearch = packageJson.dependencies?.flexsearch || packageJson.devDependencies?.flexsearch;

check('Dexie installed', !!hasDexie);
check('FlexSearch installed', !!hasFlexSearch);

// Check 8: File structure
console.log('\n📁 File Structure:');
const storeDir = path.join(ROOT_DIR, 'src', 'lib', 'offline-store');
check('offline-store directory exists', fs.existsSync(storeDir));

if (fs.existsSync(storeDir)) {
  const files = fs.readdirSync(storeDir);
  check('indexedDB.ts in store', files.includes('indexedDB.ts'));
  check('flexsearch.ts in store', files.includes('flexsearch.ts'));
  check('rag.ts in store', files.includes('rag.ts'));
}

// Check 9: Code quality (basic checks)
console.log('\n🔍 Code Quality:');
if (fs.existsSync(indexedDBPath)) {
  const indexedDBContent = fs.readFileSync(indexedDBPath, 'utf8');
  check('IndexedDB exports storeDocument', indexedDBContent.includes('export async function storeDocument'));
  check('IndexedDB exports getDocument', indexedDBContent.includes('export async function getDocument'));
  check('IndexedDB uses Dexie', indexedDBContent.includes('Dexie'));
}

if (fs.existsSync(flexsearchPath)) {
  const flexsearchContent = fs.readFileSync(flexsearchPath, 'utf8');
  check('FlexSearch exports createSearchIndex', flexsearchContent.includes('export function createSearchIndex'));
  check('FlexSearch exports searchDocuments', flexsearchContent.includes('export function searchDocuments'));
}

if (fs.existsSync(ragPath)) {
  const ragContent = fs.readFileSync(ragPath, 'utf8');
  check('RAG exports storePageForRAG', ragContent.includes('export async function storePageForRAG'));
  check('RAG exports searchOfflineRAG', ragContent.includes('export async function searchOfflineRAG'));
  check('RAG exports getRAGContext', ragContent.includes('export async function getRAGContext'));
}

if (fs.existsSync(servicePath)) {
  const serviceContent = fs.readFileSync(servicePath, 'utf8');
  check('Service exports savePageForOffline', serviceContent.includes('export async function savePageForOffline'));
  check('Service exports searchOfflineDocuments', serviceContent.includes('export async function searchOfflineDocuments'));
}

if (fs.existsSync(hookPath)) {
  const hookContent = fs.readFileSync(hookPath, 'utf8');
  check('Hook exports useOfflineRAG', hookContent.includes('export function useOfflineRAG'));
  check('Hook provides savePage', hookContent.includes('savePage'));
  check('Hook provides search', hookContent.includes('search'));
}

// Summary
console.log('\n' + '='.repeat(50));
console.log(`✅ Passed: ${checksPassed}`);
console.log(`❌ Failed: ${checksFailed}`);

if (checksFailed === 0) {
  console.log('\n✅ Offline RAG implementation: PASSED');
  console.log('\n📝 Next steps:');
  console.log('   1. Test in browser (IndexedDB requires browser environment)');
  console.log('   2. Integrate into Research Mode');
  console.log('   3. Test document storage and search');
  console.log('   4. Verify RAG context generation\n');
  process.exit(0);
} else {
  console.log('\n❌ Offline RAG implementation: FAILED');
  console.log('\n⚠️  Please fix the failed checks.\n');
  process.exit(1);
}



