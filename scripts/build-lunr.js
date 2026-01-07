#!/usr/bin/env node
/**
 * Build Lunr search index from markdown/docs files
 * Usage: node scripts/build-lunr.js
 */

const fs = require('fs');
const path = require('path');
const lunr = require('lunr');

const docsDir = path.join(__dirname, '..', 'public', 'docs');
const outputPath = path.join(__dirname, '..', 'public', 'lunr-index.json');

// Ensure docs directory exists
if (!fs.existsSync(docsDir)) {
  console.warn(`Docs directory not found: ${docsDir}`);
  console.warn('Creating empty index...');
  const emptyIndex = {
    index: lunr(function () {
      this.ref('id');
      this.field('title', { boost: 10 });
      this.field('body');
    }).toJSON(),
    documents: {},
  };
  fs.writeFileSync(outputPath, JSON.stringify(emptyIndex, null, 2));
  console.log(`Created empty index at ${outputPath}`);
  process.exit(0);
}

// Find all markdown and HTML files
const files = fs
  .readdirSync(docsDir)
  .filter(f => f.endsWith('.md') || f.endsWith('.html') || f.endsWith('.txt'));

if (files.length === 0) {
  console.warn('No markdown/html files found in docs directory');
  const emptyIndex = {
    index: lunr(function () {
      this.ref('id');
      this.field('title', { boost: 10 });
      this.field('body');
    }).toJSON(),
    documents: {},
  };
  fs.writeFileSync(outputPath, JSON.stringify(emptyIndex, null, 2));
  console.log(`Created empty index at ${outputPath}`);
  process.exit(0);
}

console.log(`Found ${files.length} files to index...`);

const documents = {};
const builder = new lunr.Builder();

builder.field('title', { boost: 10 });
builder.field('body');
builder.ref('id');

files.forEach((file, i) => {
  const fullPath = path.join(docsDir, file);
  let content = '';

  try {
    content = fs.readFileSync(fullPath, 'utf8');
  } catch (err) {
    console.warn(`Failed to read ${file}:`, err.message);
    return;
  }

  // Extract title from filename or first heading
  let title = file.replace(/[-_]/g, ' ').replace(/\.(md|html|txt)$/, '');

  // Try to extract title from markdown
  if (file.endsWith('.md')) {
    const headingMatch = content.match(/^#+\s+(.+)$/m);
    if (headingMatch) {
      title = headingMatch[1].trim();
    }
  }

  // Try to extract title from HTML
  if (file.endsWith('.html')) {
    const titleMatch =
      content.match(/<title>(.*?)<\/title>/i) || content.match(/<h1[^>]*>(.*?)<\/h1>/i);
    if (titleMatch) {
      title = titleMatch[1].replace(/<[^>]+>/g, '').trim();
    }
  }

  const id = String(i);
  documents[id] = { id, title, body: content };

  builder.add({ id, title, body: content });
  console.log(`  ✓ Indexed: ${title}`);
});

const index = builder.build();
const output = {
  index: index.toJSON(),
  documents,
};

fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
console.log(`\n✓ Wrote index with ${Object.keys(documents).length} documents to ${outputPath}`);
