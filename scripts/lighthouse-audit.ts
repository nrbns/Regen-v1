/**
 * Lighthouse audit script for Regen
 * Runs Lighthouse CI on the built app
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const DIST_DIR = path.join(process.cwd(), 'dist-web');
const REPORT_DIR = path.join(process.cwd(), 'lighthouse-reports');

// Ensure report directory exists
if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

console.log('🔍 Running Lighthouse audit...\n');

try {
  // Check if dist-web exists
  if (!fs.existsSync(DIST_DIR)) {
    console.error('❌ dist-web directory not found. Run "npm run build" first.');
    process.exit(1);
  }

  // Find index.html
  const indexHtml = path.join(DIST_DIR, 'index.html');
  if (!fs.existsSync(indexHtml)) {
    console.error('❌ index.html not found in dist-web.');
    process.exit(1);
  }

  // Run Lighthouse
  console.log('📊 Analyzing performance, accessibility, best practices, and SEO...\n');

  const reportPath = path.join(REPORT_DIR, `lighthouse-${Date.now()}.html`);

  execSync(
    `npx lighthouse http://localhost:5173 --output html --output-path "${reportPath}" --chrome-flags="--headless --no-sandbox" --only-categories=performance,accessibility,best-practices,seo`,
    {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: {
        ...process.env,
        // Allow non-zero exit codes
      },
    }
  );

  console.log(`\n✅ Lighthouse report saved to: ${reportPath}`);
  console.log(`\n📈 Open the report in your browser to view detailed scores.\n`);
} catch (error: any) {
  console.error('\n❌ Lighthouse audit failed:', error.message);
  console.log('\n💡 Tip: Make sure the dev server is running (npm run dev:web)');
  console.log('   Or build the app first (npm run build) and serve it locally.\n');
  process.exit(1);
}
