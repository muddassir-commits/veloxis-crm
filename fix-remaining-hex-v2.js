/**
 * fix-remaining-hex-v2.js
 * Round 2: Fix remaining hardcoded hex values
 */

const fs = require('fs');
const path = require('path');

const replacements = [
  // Dark theme bg patterns
  ['bg-[#060D1A]', 'bg-bg-dark'],
  ['bg-[#0A1628]', 'bg-bg-card'],
  ['bg-[#0B132B]', 'bg-bg-darker'],
  ['bg-[#132035]', 'bg-bg-elevated'],
  ['bg-[#132237]', 'bg-bg-elevated'],
  ['bg-[#1E3352]', 'bg-border'],
  ['bg-[#1C2C42]', 'bg-bg-card-hover'],
  ['bg-[#2E66FF]', 'bg-primary'],
  ['bg-[#10B981]', 'bg-success'],
  
  // hover bg patterns
  ['hover:bg-[#1E4DFF]', 'hover:bg-primary/90'],
  ['hover:bg-[#1E3352]', 'hover:bg-border'],
  ['hover:bg-[#132237]', 'hover:bg-bg-elevated'],
  ['hover:bg-[#059669]', 'hover:bg-success/90'],
  
  // text patterns
  ['text-[#F0F4FF]', 'text-text-primary'],
  ['text-[#E2E8F0]', 'text-text-primary'],
  ['text-[#4B5E7D]', 'text-text-muted'],
  ['text-[#4B6B94]', 'text-text-muted'],
  
  // placeholder patterns
  ['placeholder-[#4B5E7D]', 'placeholder-text-muted'],
  
  // divide patterns  
  ['divide-[#1E3352]', 'divide-border'],
];

const dirsToProcess = [
  path.join(__dirname, 'app'),
  path.join(__dirname, 'components'),
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  for (const [search, replace] of replacements) {
    if (content.includes(search)) {
      content = content.split(search).join(replace);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${path.relative(__dirname, filePath)}`);
    return true;
  }
  return false;
}

function walkDir(dir) {
  let count = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue;
      count += walkDir(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
      if (processFile(fullPath)) count++;
    }
  }
  return count;
}

console.log('🔄 Round 2: Fixing remaining hex colors...\n');
let totalFixed = 0;
for (const dir of dirsToProcess) {
  totalFixed += walkDir(dir);
}
console.log(`\n✨ Done! Fixed ${totalFixed} files.`);
