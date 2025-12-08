#!/usr/bin/env node
/**
 * Verification script for ErrorBoundary + Sentry setup
 * Checks that all necessary files exist and configurations are correct
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ERRORS = [];
const WARNINGS = [];

console.log('🔍 Verifying ErrorBoundary + Sentry Setup...\n');

// Check 1: ErrorBoundary exists
const errorBoundaryPath = path.join(ROOT, 'src', 'core', 'errors', 'ErrorBoundary.tsx');
if (fs.existsSync(errorBoundaryPath)) {
  console.log('✅ ErrorBoundary component found');
  const content = fs.readFileSync(errorBoundaryPath, 'utf8');
  
  if (content.includes('GlobalErrorBoundary')) {
    console.log('✅ GlobalErrorBoundary export found');
  } else {
    ERRORS.push('GlobalErrorBoundary export missing in ErrorBoundary.tsx');
  }
  
  if (content.includes('Sentry.captureException')) {
    console.log('✅ Sentry integration found in ErrorBoundary');
  } else {
    WARNINGS.push('Sentry.captureException not found in ErrorBoundary (may use window.Sentry)');
  }
} else {
  ERRORS.push('ErrorBoundary.tsx not found at src/core/errors/ErrorBoundary.tsx');
}

// Check 2: Sentry client exists
const sentryClientPath = path.join(ROOT, 'src', 'lib', 'monitoring', 'sentry-client.ts');
if (fs.existsSync(sentryClientPath)) {
  console.log('✅ Sentry client found');
  const content = fs.readFileSync(sentryClientPath, 'utf8');
  
  if (content.includes('syncRendererTelemetry')) {
    console.log('✅ syncRendererTelemetry function found');
  } else {
    ERRORS.push('syncRendererTelemetry function missing in sentry-client.ts');
  }
} else {
  ERRORS.push('sentry-client.ts not found at src/lib/monitoring/sentry-client.ts');
}

// Check 3: main.tsx uses ErrorBoundary
const mainPath = path.join(ROOT, 'src', 'main.tsx');
if (fs.existsSync(mainPath)) {
  const content = fs.readFileSync(mainPath, 'utf8');
  
  if (content.includes('GlobalErrorBoundary')) {
    console.log('✅ GlobalErrorBoundary used in main.tsx');
  } else {
    ERRORS.push('GlobalErrorBoundary not found in main.tsx');
  }
  
  if (content.includes('syncRendererTelemetry')) {
    console.log('✅ Sentry initialization found in main.tsx');
  } else {
    WARNINGS.push('syncRendererTelemetry not found in main.tsx (may use different init method)');
  }
  
  // Check for global error handlers
  if (content.includes('unhandledrejection') || content.includes('unhandled rejection')) {
    console.log('✅ Global error handlers found');
  } else {
    WARNINGS.push('Global unhandled rejection handler not found');
  }
} else {
  ERRORS.push('main.tsx not found at src/main.tsx');
}

// Check 4: Environment variables
const envPath = path.join(ROOT, '.env');
const exampleEnvPath = path.join(ROOT, 'example.env');

if (fs.existsSync(exampleEnvPath)) {
  console.log('✅ example.env found');
  const content = fs.readFileSync(exampleEnvPath, 'utf8');
  
  if (content.includes('SENTRY_DSN')) {
    console.log('✅ SENTRY_DSN placeholder found in example.env');
  } else {
    WARNINGS.push('SENTRY_DSN not found in example.env');
  }
} else {
  WARNINGS.push('example.env not found');
}

if (fs.existsSync(envPath)) {
  console.log('✅ .env file found');
  const content = fs.readFileSync(envPath, 'utf8');
  
  if (content.includes('SENTRY_DSN') && !content.includes('your-sentry-dsn')) {
    const dsnMatch = content.match(/SENTRY_DSN=(.+)/);
    if (dsnMatch && dsnMatch[1].includes('https://')) {
      console.log('✅ Valid Sentry DSN configured in .env');
    } else {
      WARNINGS.push('SENTRY_DSN in .env appears to be a placeholder');
    }
  } else {
    WARNINGS.push('SENTRY_DSN not configured in .env (optional - ErrorBoundary works without it)');
  }
} else {
  WARNINGS.push('.env file not found (create from example.env)');
}

// Check 5: Package.json dependencies
const packageJsonPath = path.join(ROOT, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  if (deps['@sentry/react']) {
    console.log('✅ @sentry/react dependency found');
  } else {
    WARNINGS.push('@sentry/react not in dependencies (may be optional)');
  }
} else {
  ERRORS.push('package.json not found');
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 Verification Summary\n');

if (ERRORS.length === 0 && WARNINGS.length === 0) {
  console.log('✅ All checks passed! ErrorBoundary + Sentry setup is complete.\n');
  console.log('📝 Next steps:');
  console.log('   1. Add your Sentry DSN to .env (optional)');
  console.log('   2. Test error handling: npm run dev');
  console.log('   3. Trigger a test error to verify ErrorBoundary works\n');
  process.exit(0);
}

if (ERRORS.length > 0) {
  console.log('❌ Errors found:\n');
  ERRORS.forEach(err => console.log(`   - ${err}`));
  console.log('');
}

if (WARNINGS.length > 0) {
  console.log('⚠️  Warnings (non-critical):\n');
  WARNINGS.forEach(warn => console.log(`   - ${warn}`));
  console.log('');
}

if (ERRORS.length === 0) {
  console.log('✅ Core setup is complete! Warnings are optional.\n');
  process.exit(0);
} else {
  console.log('❌ Please fix errors before proceeding.\n');
  process.exit(1);
}


