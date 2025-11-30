#!/usr/bin/env node
/**
 * Check API Configuration from .env
 * Verifies that API endpoints are properly configured
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

function loadEnvFile() {
  try {
    const envPath = join(rootDir, '.env');
    const content = readFileSync(envPath, 'utf-8');
    const env = {};
    
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      // Skip comments and empty lines
      if (trimmed && !trimmed.startsWith('#')) {
        const equalIndex = trimmed.indexOf('=');
        if (equalIndex > 0) {
          const key = trimmed.substring(0, equalIndex).trim();
          const value = trimmed.substring(equalIndex + 1).trim();
          // Remove quotes if present
          const cleanValue = value.replace(/^["']|["']$/g, '');
          env[key] = cleanValue;
        }
      }
    }
    
    return env;
  } catch (error) {
    console.warn('⚠️  .env file not found, using defaults');
    return {};
  }
}

function checkConfig() {
  const env = loadEnvFile();
  
  console.log('🔍 Checking API Configuration from .env...\n');
  
  // Frontend API URL
  const viteApiBaseUrl = env.VITE_API_BASE_URL || env.VITE_APP_API_URL || 'http://127.0.0.1:4000';
  console.log(`✅ Frontend API Base URL: ${viteApiBaseUrl}`);
  console.log(`   (VITE_API_BASE_URL: ${env.VITE_API_BASE_URL || 'not set'})`);
  console.log(`   (VITE_APP_API_URL: ${env.VITE_APP_API_URL || 'not set'})`);
  
  // Backend Server Port
  const redixPort = env.REDIX_PORT || '4000';
  console.log(`\n✅ Backend Server Port: ${redixPort}`);
  console.log(`   (REDIX_PORT: ${env.REDIX_PORT || 'not set, using default 4000'})`);
  
  // Redis URL
  const redisUrl = env.REDIS_URL || 'redis://127.0.0.1:6379';
  console.log(`\n✅ Redis URL: ${redisUrl}`);
  console.log(`   (REDIS_URL: ${env.REDIS_URL || 'not set, using default redis://127.0.0.1:6379'})`);
  
  // Validation
  console.log('\n📋 Configuration Summary:');
  console.log(`   Frontend will connect to: ${viteApiBaseUrl}`);
  console.log(`   Backend will listen on: http://0.0.0.0:${redixPort}`);
  console.log(`   Redis connection: ${redisUrl}`);
  
  // Check if URLs match
  const apiPort = viteApiBaseUrl.split(':').pop()?.replace('/', '') || '4000';
  if (apiPort !== redixPort) {
    console.warn(`\n⚠️  Warning: Frontend API port (${apiPort}) doesn't match backend port (${redixPort})`);
    console.warn('   Make sure VITE_API_BASE_URL matches REDIX_PORT');
  } else {
    console.log('\n✅ Ports match correctly!');
  }
  
  console.log('\n✨ Configuration check complete!');
}

checkConfig();

