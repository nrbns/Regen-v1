/**
 * Changelog Generator
 * DAY 10 FIX: Generates changelog from git commits
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const VERSION = process.argv[2] || '0.1.0';
const CHANGELOG_PATH = path.join(__dirname, '..', 'CHANGELOG.md');

// Get commits since last tag
function getCommitsSinceLastTag() {
  try {
    const lastTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf-8' }).trim();
    const commits = execSync(`git log ${lastTag}..HEAD --pretty=format:"%h|%s|%an"`, {
      encoding: 'utf-8',
    }).trim();
    return commits.split('\n').filter(Boolean);
  } catch {
    // No previous tag, get all commits
    const commits = execSync('git log --pretty=format:"%h|%s|%an"', { encoding: 'utf-8' }).trim();
    return commits.split('\n').filter(Boolean).slice(0, 50); // Limit to last 50 commits
  }
}

// Categorize commits
function categorizeCommit(message) {
  const lower = message.toLowerCase();

  if (lower.includes('fix') || lower.includes('bug')) {
    return '🐛 Bug Fixes';
  }
  if (lower.includes('feat') || lower.includes('add') || lower.includes('implement')) {
    return '✨ Features';
  }
  if (lower.includes('perf') || lower.includes('performance')) {
    return '⚡ Performance';
  }
  if (lower.includes('security') || lower.includes('secure')) {
    return '🔒 Security';
  }
  if (lower.includes('refactor')) {
    return '♻️ Refactoring';
  }
  if (lower.includes('docs') || lower.includes('readme')) {
    return '📝 Documentation';
  }
  if (lower.includes('test')) {
    return '🧪 Tests';
  }
  if (lower.includes('ci') || lower.includes('workflow')) {
    return '🔧 CI/CD';
  }

  return '📦 Other';
}

// Generate changelog entry
function generateChangelog() {
  const commits = getCommitsSinceLastTag();
  const categorized = {};

  commits.forEach(line => {
    const [hash, message, author] = line.split('|');
    const category = categorizeCommit(message);

    if (!categorized[category]) {
      categorized[category] = [];
    }

    categorized[category].push({
      hash: hash.substring(0, 7),
      message: message.replace(/^[a-z]+(\(.+?\))?: /i, ''), // Remove conventional commit prefix
      author,
    });
  });

  const date = new Date().toISOString().split('T')[0];
  let changelog = `## [${VERSION}] - ${date}\n\n`;

  // Order categories
  const categoryOrder = [
    '✨ Features',
    '🐛 Bug Fixes',
    '⚡ Performance',
    '🔒 Security',
    '♻️ Refactoring',
    '🧪 Tests',
    '🔧 CI/CD',
    '📝 Documentation',
    '📦 Other',
  ];

  categoryOrder.forEach(category => {
    if (categorized[category] && categorized[category].length > 0) {
      changelog += `### ${category}\n\n`;
      categorized[category].forEach(({ hash, message, author }) => {
        changelog += `- ${message} (${hash}) - @${author}\n`;
      });
      changelog += '\n';
    }
  });

  // Read existing changelog
  let existingChangelog = '';
  if (fs.existsSync(CHANGELOG_PATH)) {
    existingChangelog = fs.readFileSync(CHANGELOG_PATH, 'utf-8');
  }

  // Prepend new entry
  const newChangelog = changelog + '\n' + existingChangelog;

  // Write to file
  fs.writeFileSync(CHANGELOG_PATH, newChangelog, 'utf-8');

  // Also output to stdout for GitHub Actions
  console.log(changelog);
}

generateChangelog();
