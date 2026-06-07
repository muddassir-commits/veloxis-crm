/**
 * fix-remaining-hex-v3.js
 * Round 3: Final pass for remaining hardcoded hex values
 */

const fs = require('fs');
const path = require('path');

const replacements = [
  // Remaining specific patterns
  ['bg-[#0A1220]', 'bg-bg-darker'],
  ['bg-[#4D90FE]/10', 'bg-primary/10'],
  ['bg-[#4B5563]/10', 'bg-text-muted/10'],
  ['bg-[#F9731610]', 'bg-accent/10'],
  ['bg-[#F973160c]', 'bg-accent/5'],
  ['bg-[#EF44440c]', 'bg-error/5'],
  ['bg-[#1E335220]', 'bg-border/15'],
  ['bg-[#3B82F615]', 'bg-primary/10'],
  
  // text patterns
  ['text-[#10B981]', 'text-success'],
  ['text-[#3B82F6]', 'text-primary'],
  ['text-[#1D4ED8]', 'text-primary'],
  ['text-[#2A4060]', 'text-text-muted'],
  ['text-[#060D1A]', 'text-bg-dark'],
  ['text-[#E2E8F0]', 'text-text-primary'],
  
  // border patterns
  ['border-[#4D90FE]/20', 'border-primary/20'],
  ['border-[#4D90FE]', 'border-primary'],
  ['border-[#A78BFA]/20', 'border-purple-400/20'],
  ['border-[#8BA3C7]/20', 'border-text-muted/20'],
  ['border-[#4B5563]/20', 'border-text-muted/20'],
  ['border-[#1E335230]', 'border-border/20'],
  ['border-[#3B82F630]', 'border-primary/20'],
  ['border-[#F9731620]', 'border-accent/15'],
  ['border-[#F973161c]', 'border-accent/10'],
  ['border-[#0D1829]', 'border-bg-darker'],
  ['border-[#EF444420]', 'border-error/15'],
  ['border-[#2A4060]', 'border-text-muted'],
  
  // hover patterns
  ['hover:bg-[#EF444425]', 'hover:bg-error/15'],
  ['hover:bg-[#D97706]', 'hover:bg-warning/90'],
  ['hover:bg-[#EA580C]/10', 'hover:bg-accent/10'],
  ['hover:text-[#EA580C]', 'hover:text-accent'],
  ['hover:text-[#7BB3FF]', 'hover:text-primary-light'],
  ['hover:text-[#2563EB]', 'hover:text-primary'],
  ['hover:border-[#2A4060]', 'hover:border-text-muted'],
  
  // divide-y
  ['divide-[#E2E8F4]/50', 'divide-border/50'],
  ['divide-[#E2E8F4]', 'divide-border'],
  
  // Misc text-[#...] patterns
  ['text-[#9px]', 'text-[9px]'],  // skip, not a hex
  ['text-[#2563EB]', 'text-primary'],
  
  // A78BFA patterns
  ['bg-[#A78BFA]/10', 'bg-purple-400/10'],
  
  // 4A6480 patterns
  ['bg-[#4A6480]/10', 'bg-text-muted/10'],
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

console.log('🔄 Round 3: Final pass on remaining hex colors...\n');
let totalFixed = 0;
for (const dir of dirsToProcess) {
  totalFixed += walkDir(dir);
}
console.log(`\n✨ Done! Fixed ${totalFixed} files.`);
