#!/usr/bin/env node

/**
 * Week 2 Testing Progress Tracker
 *
 * Quick script to check Week 2 testing progress
 * Usage: node scripts/week2-progress.js
 */

const fs = require('fs');
const path = require('path');

const TRACKER_PATH = path.join(__dirname, '..', 'docs', 'WEEK2_TESTING_TRACKER.md');

function checkProgress() {
  try {
    const content = fs.readFileSync(TRACKER_PATH, 'utf8');

    // Count checkboxes
    const totalCheckboxes = (content.match(/- \[ \]/g) || []).length;
    const completedCheckboxes = (content.match(/- \[x\]/g) || []).length;
    const progress =
      totalCheckboxes > 0
        ? Math.round((completedCheckboxes / (totalCheckboxes + completedCheckboxes)) * 100)
        : 0;

    // Count issues
    const criticalIssues = (content.match(/\| \d+ \|/g) || []).length;

    // Check platform status
    const windowsStatus =
      content.includes('Windows 10/11') && content.includes('Status**: ⏳ Not Started')
        ? 'Not Started'
        : content.includes('Windows 10/11') && content.includes('Status**: ✅')
          ? 'Complete'
          : 'In Progress';

    const linuxStatus =
      content.includes('Linux (Ubuntu/Debian)') && content.includes('Status**: ⏳ Not Started')
        ? 'Not Started'
        : content.includes('Linux (Ubuntu/Debian)') && content.includes('Status**: ✅')
          ? 'Complete'
          : 'In Progress';

    const networkStatus =
      content.includes('Jio 4G') && content.includes('Status**: ⏳ Not Started')
        ? 'Not Started'
        : 'In Progress';

    console.log('\n📊 Week 2 Testing Progress\n');
    console.log('═'.repeat(50));
    console.log(
      `Overall Progress: ${progress}% (${completedCheckboxes}/${totalCheckboxes + completedCheckboxes} tasks)`
    );
    console.log('\nPlatform Status:');
    console.log(`  Windows 10/11: ${windowsStatus}`);
    console.log(`  Linux: ${linuxStatus}`);
    console.log(`  Network Testing: ${networkStatus}`);
    console.log(`\nIssues Found: ${criticalIssues}`);
    console.log('═'.repeat(50));
    console.log('\n💡 Tip: Update WEEK2_TESTING_TRACKER.md as you complete tests\n');
  } catch (error) {
    console.error('❌ Error reading tracker file:', error.message);
    console.log('\n💡 Make sure WEEK2_TESTING_TRACKER.md exists in docs/');
  }
}

// Run if called directly
if (require.main === module) {
  checkProgress();
}

module.exports = { checkProgress };
