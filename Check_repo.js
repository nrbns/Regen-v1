// check_repo.js
// Node 18+
// Usage: node check_repo.js
import fs from 'fs';
import path from 'path';
// import { execSync } from "child_process"; // Reserved for future use

const root = process.cwd();

function exists(p) {
  return fs.existsSync(path.join(root, p));
}

function readJSON(p) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
  } catch {
    return null;
  }
}

function searchFilesForKeywords(dir, exts, keywords, maxFiles = 2000) {
  const found = {};
  let count = 0;
  function walk(d) {
    if (count > maxFiles) return;
    const entries = fs.readdirSync(d, { withFileTypes: true });
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        if (['node_modules', '.git', 'dist', 'build'].includes(e.name)) continue;
        walk(p);
      } else {
        const ext = path.extname(e.name).toLowerCase();
        if (exts.includes(ext)) {
          count++;
          const txt = fs.readFileSync(p, 'utf8').toLowerCase();
          for (const kw of keywords) {
            if (txt.includes(kw) && !found[kw]) found[kw] = [];
            if (txt.includes(kw)) found[kw].push(path.relative(root, p));
          }
        }
      }
    }
  }
  try {
    walk(dir);
  } catch {
    // Ignore directory read errors
  }
  return found;
}

console.log('\n=== Regen Repo Diagnostic — quick audit ===\n');
// const report = []; // Reserved for future use

const checks = [];

// 1. basic structure
checks.push({
  id: 'src_folder',
  ok: exists('src') || exists('app') || exists('frontend'),
  note: 'Has frontend source folder (src / app / frontend).',
});
checks.push({
  id: 'package_json',
  ok: exists('package.json'),
  note: 'Has package.json',
});
checks.push({
  id: 'tauri_folder',
  ok: exists('src-tauri') || exists('tauri-migration') || exists('tauri'),
  note: 'Has Tauri / Rust folder (src-tauri / tauri-migration / tauri).',
});
checks.push({
  id: 'rust_files',
  ok:
    exists('src-tauri/src/main.rs') ||
    (exists('src-tauri') &&
      fs.readdirSync(path.join(root, 'src-tauri')).some(f => f.endsWith('.rs'))),
  note: 'Rust (Tauri) sources present (src-tauri/src/main.rs).',
});
checks.push({
  id: 'env_example',
  ok: exists('.env.example') || exists('example.env') || exists('.env'),
  note: 'Has example env or .env (env management).',
});
checks.push({
  id: 'readme',
  ok: exists('README.md') || exists('readme.md'),
  note: 'Has README.md (docs).',
});
checks.push({
  id: 'server_folder',
  ok: exists('server') || exists('backend') || exists('api'),
  note: 'Has server/backend folder (server / backend / api).',
});
checks.push({
  id: 'mock_llm',
  ok:
    exists('server/mock-llm.js') ||
    exists('server/mock-llm') ||
    exists('server/mock') ||
    exists('server/mock-llm.py'),
  note: 'Has mock LLM server file (mock-llm.js / mock server).',
});
checks.push({
  id: 'build_scripts',
  ok: false,
  note: 'Has build/dev scripts in package.json (dev, dev:web, tauri, build, start).',
});

// analyze package.json scripts & deps
const pkg = readJSON('package.json');
if (pkg) {
  const scripts = pkg.scripts || {};
  const neededScripts = ['dev', 'start', 'build', 'tauri', 'dev:web', 'dev:mock-llm', 'tauri:dev'];
  const present = neededScripts.filter(s => scripts[s]);
  checks.find(c => c.id === 'build_scripts').ok = present.length > 0;
  checks.find(c => c.id === 'build_scripts').note +=
    ` Found scripts: ${Object.keys(scripts).slice(0, 10).join(', ')}`;
}

// search keywords for AI/agent
const keywords = [
  'llm',
  'ollama',
  'huggingface',
  'openai',
  'agent',
  'automate',
  'automation',
  'webview',
  'browserview',
  'tauri',
  'whisper',
  'tts',
  'stt',
  'gguf',
  'ggml',
];
const kwResults = searchFilesForKeywords(
  root,
  ['.js', '.ts', '.jsx', '.tsx', '.rs', '.py', '.json', '.md'],
  keywords
);
const kwFound = Object.keys(kwResults).length;

checks.push({
  id: 'ai_keywords',
  ok: kwFound > 0,
  note: `Found AI/agent keywords in code: ${Object.keys(kwResults).join(', ') || 'none'}.`,
});

// modularity hint: check for folders that suggest separation
const modules = ['agent', 'ai', 'memory', 'services', 'components', 'utils', 'lib'];
const moduleFound = modules.filter(m => exists(m) || exists(`src/${m}`) || exists(`app/${m}`));
checks.push({
  id: 'modular',
  ok: moduleFound.length >= 2,
  note: `Module-like folders found: ${moduleFound.join(', ') || 'none'}.`,
});

// error handling/logging presence
const logKeywords = [
  'console.error',
  'sentry',
  'rollbar',
  'winston',
  'pino',
  'logger',
  'loggly',
  'crash',
  'error-report',
];
const logResults = searchFilesForKeywords(root, ['.js', '.ts', '.rs', '.py'], logKeywords);
checks.push({
  id: 'logging',
  ok: Object.keys(logResults).length > 0,
  note: `Logging / crash keywords found: ${Object.keys(logResults).join(', ') || 'none'}`,
});

// packaging
const packagingKeywords = [
  'tauri build',
  'electron',
  'pkg',
  'nsis',
  'deb',
  'rpm',
  'notarize',
  'sign',
  'codesign',
  'tauri.conf.json',
];
const pkgResults = searchFilesForKeywords(
  root,
  ['.json', '.md', '.js', '.sh', '.rs'],
  packagingKeywords
);
checks.push({
  id: 'packaging',
  ok: Object.keys(pkgResults).length > 0 || exists('tauri.conf.json'),
  note: `Packaging-related files/mentions: ${Object.keys(pkgResults).join(', ') || (exists('tauri.conf.json') ? 'tauri.conf.json' : 'none')}`,
});

// tests & ci
checks.push({
  id: 'ci_tests',
  ok:
    exists('.github') ||
    exists('.gitlab-ci.yml') ||
    exists('playwright.config.js') ||
    exists('tests'),
  note: 'Has CI or tests directory (.github, tests, playwright).',
});

// tauri dev URL check in config file
let tauriConfPresent = exists('tauri.conf.json') || exists('src-tauri/tauri.conf.json');
checks.push({
  id: 'tauri_config',
  ok: tauriConfPresent,
  note: 'Tauri config present (tauri.conf.json).',
});

// Summarize checks and calculate score
let score = 0;
checks.forEach(c => {
  if (c.ok) score += 1;
});

const total = checks.length;
const pct = Math.round((score / total) * 100);

console.log('Quick checks:');
checks.forEach(c => {
  console.log(`${c.ok ? '✅' : '❌'} ${c.note}`);
});

console.log('\nAI/Keyword scan summary:');
if (kwFound > 0) {
  Object.entries(kwResults).forEach(([k, files]) => {
    console.log(
      `- "${k}" found in ${Math.min(files.length, 6)} file(s): ${files.slice(0, 6).join(', ')}`
    );
  });
} else {
  console.log('- No AI/agent keywords found in scanned file types.');
}

console.log('\nPackaging & build hints:');
if (pkg) {
  console.log(
    `- package.json detected. name: ${pkg.name || '(unnamed)'} scripts: ${Object.keys(
      pkg.scripts || {}
    )
      .slice(0, 20)
      .join(', ')}`
  );
} else {
  console.log('- package.json not found or unreadable.');
}

console.log(`\nOverall readiness score: ${pct}% (${score}/${total})`);
if (pct >= 80) {
  console.log('🔥 Your repo structure looks advanced-ready. Many core elements are present.');
} else if (pct >= 50) {
  console.log(
    '⚠️ Your repo has a decent foundation but needs focused cleanup and a few missing modules.'
  );
} else {
  console.log(
    "⚠️ Your repo is missing several critical pieces. Don't panic — fixes are clear and doable."
  );
}

// Prioritized next steps based on missing checks
console.log('\nPRIORITIZED NEXT STEPS:');
const missing = checks.filter(c => !c.ok).map(c => c.id);
if (missing.includes('src_folder'))
  console.log('- Add or reorganize frontend source into /src (React/TS recommended).');
if (missing.includes('package_json'))
  console.log('- Create package.json and add dev/build scripts.');
if (missing.includes('tauri_folder') || missing.includes('rust_files'))
  console.log('- Add Tauri src-tauri or ensure Rust sources are present for desktop packaging.');
if (missing.includes('mock_llm'))
  console.log(
    '- Add a small mock-llm (server/mock-llm.js) to simulate AI replies for development.'
  );
if (missing.includes('build_scripts'))
  console.log('- Add npm scripts: dev, dev:web, dev:mock-llm, tauri:dev, build.');
if (missing.includes('ai_keywords'))
  console.log(
    '- Integrate AI adapter module (llm client wrapper). Check for OpenAI/HuggingFace/Ollama usage.'
  );
if (missing.includes('modular'))
  console.log('- Split code into modules: agent/, ai/, memory/, services/, components/.');
if (missing.includes('logging'))
  console.log('- Add basic logging and crash reporting (console + optional Sentry).');
if (missing.includes('packaging'))
  console.log('- Ensure tauri.conf.json or packaging scripts exist and test `tauri dev` locally.');
if (missing.includes('ci_tests'))
  console.log('- Add at least basic tests or a GitHub Actions workflow for builds.');

console.log(
  '\nIf you want, copy the script output here and I will tell you EXACT code snippets or files to add next (mock-llm, BrowserView component, redix stub, package.json scripts, tauri.conf.json sample).\n'
);

process.exit(0);
