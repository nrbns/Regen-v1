#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const IGNORE = ['node_modules', '.git', 'dist', 'dist-web', 'public', 'build', 'coverage'];

const dangerousPatterns = [
  { name: 'eval()', re: /\beval\s*\(/g },
  { name: 'new Function', re: /new\s+Function\s*\(/g },
  { name: 'child_process require', re: /require\(['\"]child_process['\"]\)/g },
  { name: 'child_process access', re: /\bchild_process\b/g },
  { name: 'vm.run', re: /\bvm\.(runInNewContext|runInThisContext|run)\b/g },
  { name: 'dynamic import from variable', re: /import\(\s*[^'\"]/g },
  { name: 'Function constructor', re: /\bFunction\s*\(/g }
];

let issues = [];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    if (IGNORE.includes(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walk(full);
    } else if (ent.isFile()) {
      if (!/\.([tj]s|tsx?|jsx?|json|md|html)$/i.test(ent.name)) continue;
      const txt = fs.readFileSync(full, 'utf8');
      dangerousPatterns.forEach(p => {
        const m = txt.match(p.re);
        if (m && m.length > 0) {
          issues.push({ file: path.relative(ROOT, full), pattern: p.name, matches: m.length });
        }
      });
    }
  }
}

walk(ROOT);

if (issues.length === 0) {
  console.log('security-check: no dangerous patterns detected');
  process.exit(0);
} else {
  console.error('security-check: found dangerous patterns:');
  issues.forEach(i => console.error(` - ${i.file}: ${i.pattern} (${i.matches} matches)`));
  process.exit(2);
}
