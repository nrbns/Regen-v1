const fs = require('fs');
const path = require('path');

// Read all .tsx and .ts files recursively
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

const files = getAllFiles('./src');
const iconSet = new Set();

files.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const matches = content.match(/import\s+{[^}]*}\s+from\s+['"]lucide-react['"]/g);
    if (matches) {
      matches.forEach(match => {
        const icons = match.match(/{([^}]*)}/)[1];
        icons.split(',').forEach(icon => {
          // Extract just the icon name, handling "as" aliases
          const iconMatch = icon.trim().match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)/);
          if (iconMatch) {
            iconSet.add(iconMatch[1]);
          }
        });
      });
    }
  } catch (e) {}
});

const iconList = Array.from(iconSet).sort();
console.log('Found', iconList.length, 'unique icons:');
console.log(iconList.join(', '));

// Filter out invalid icon names (containing spaces, special chars, etc.)
const validIconList = iconList.filter(icon => /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(icon));

// Generate the shim file
const shimContent = `// Auto-generated shim for lucide-react icons
// Phase 1: Using basic placeholders instead of lucide icons

const IconPlaceholder = () => <span style={{ display: 'inline-block', width: '16px', height: '16px' }} />;

// Explicit exports for all used icons
${validIconList.map(icon => `export const ${icon} = IconPlaceholder;`).join('\n')}

// Default export for compatibility
export default {};
`;

fs.writeFileSync('./src/shims/lucide-react.tsx', shimContent);
console.log('Generated shim file with', iconList.length, 'icon exports');