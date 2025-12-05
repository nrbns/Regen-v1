/**
 * Architecture Logger Utility
 * 
 * Provides consistent logging across architecture scripts
 */

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

class ArchitectureLogger {
  constructor(prefix = '') {
    this.prefix = prefix;
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${this.prefix}${message}${colors.reset}`);
  }

  success(message) {
    this.log(`✓ ${message}`, 'green');
  }

  error(message) {
    this.log(`✗ ${message}`, 'red');
  }

  warning(message) {
    this.log(`⚠ ${message}`, 'yellow');
  }

  info(message) {
    this.log(`ℹ ${message}`, 'blue');
  }

  section(title) {
    this.log(`\n${'─'.repeat(50)}`, 'cyan');
    this.log(title, 'cyan');
    this.log('─'.repeat(50), 'cyan');
  }
}

module.exports = ArchitectureLogger;

