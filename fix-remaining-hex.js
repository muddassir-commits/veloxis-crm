/**
 * fix-remaining-hex.js
 * Replaces remaining hardcoded hex/color values with semantic design tokens
 * across the Veloxis CRM codebase.
 */

const fs = require('fs');
const path = require('path');

// Define replacement rules.
// These are ordered so more specific patterns are matched first.
const replacements = [
  // Portal light-theme replacements (specific hex values from the light theme)
  // bg-white → bg-bg-light (in portal/light theme context)
  ['bg-white', 'bg-bg-light'],
  // bg-[#F8FAFF] → bg-bg-light
  ['bg-[#F8FAFF]', 'bg-bg-light'],
  // border-[#E2E8F4] → border-border
  ['border-[#E2E8F4]', 'border-border'],
  // text-[#0A1628] → text-text-primary
  ['text-[#0A1628]', 'text-text-primary'],
  // text-[#475569] → text-text-secondary
  ['text-[#475569]', 'text-text-secondary'],
  // text-[#94A3B8] → text-text-muted
  ['text-[#94A3B8]', 'text-text-muted'],
  // text-[#8BA3C7] → text-text-muted
  ['text-[#8BA3C7]', 'text-text-muted'],
  // bg-[#1B4FD8] → bg-primary
  ['bg-[#1B4FD8]', 'bg-primary'],
  // hover:bg-[#2563EB] → hover:bg-primary-hover
  ['hover:bg-[#2563EB]', 'hover:bg-primary/90'],
  // text-[#1B4FD8] → text-primary
  ['text-[#1B4FD8]', 'text-primary'],
  // hover:text-[#60A5FA] → hover:text-primary-light
  ['hover:text-[#60A5FA]', 'hover:text-primary-light'],
  // text-[#4B6B94] → text-text-muted
  ['text-[#4B6B94]', 'text-text-muted'],
  // bg-[#0D1829] → bg-bg-darker
  ['bg-[#0D1829]', 'bg-bg-darker'],
  // border-[#1E3352] → border-border
  ['border-[#1E3352]', 'border-border'],
  // text-[#1E3352] → text-border
  ['text-[#1E3352]', 'text-border'],
  // hover:bg-[#F1F5F9] → hover:bg-bg-light
  ['hover:bg-[#F1F5F9]', 'hover:bg-bg-elevated'],
  // hover:text-[#0A1628] → hover:text-text-primary
  ['hover:text-[#0A1628]', 'hover:text-text-primary'],
  // hover:text-[#DC2626] → hover:text-error
  ['hover:text-[#DC2626]', 'hover:text-error'],
  // hover:bg-[#EF444410] → hover:bg-error/10
  ['hover:bg-[#EF444410]', 'hover:bg-error/10'],
  // hover:text-[#FCA5A5] → hover:text-error/70
  ['hover:text-[#FCA5A5]', 'hover:text-error/70'],
  // hover:bg-[#1E335230] → hover:bg-border/20
  ['hover:bg-[#1E335230]', 'hover:bg-border/20'],
  // bg-[#3B82F6] → bg-primary
  ['bg-[#3B82F6]', 'bg-primary'],
  // bg-[#EF444415] → bg-error/10
  ['bg-[#EF444415]', 'bg-error/10'],
  // border-[#EF444430] → border-error/20
  ['border-[#EF444430]', 'border-error/20'],
  // text-[#EF4444] → text-error
  ['text-[#EF4444]', 'text-error'],
  // bg-[#22C55E10] → bg-success/10
  ['bg-[#22C55E10]', 'bg-success/10'],
  // bg-[#22C55E20] → bg-success/15
  ['bg-[#22C55E20]', 'bg-success/15'],
  // border-[#22C55E30] → border-success/20
  ['border-[#22C55E30]', 'border-success/20'],
  // bg-[#EF444410] → bg-error/10
  ['bg-[#EF444410]', 'bg-error/10'],
  // bg-[#EF444420] → bg-error/15
  ['bg-[#EF444420]', 'bg-error/15'],
  // text-[#F87171] → text-error
  ['text-[#F87171]', 'text-error'],
  // bg-[#F9731620] → bg-accent/15
  ['bg-[#F9731620]', 'bg-accent/15'],
  // border-[#F9731630] → border-accent/20
  ['border-[#F9731630]', 'border-accent/20'],
  // border-[#F97316] → border-accent
  ['border-[#F97316]', 'border-accent'],
  // bg-[#EAB30820] → bg-warning/15
  ['bg-[#EAB30820]', 'bg-warning/15'],
  // text-[#EAB308] → text-warning
  ['text-[#EAB308]', 'text-warning'],
  // border-[#EAB30830] → border-warning/20
  ['border-[#EAB30830]', 'border-warning/20'],
  // bg-[#A78BFA20] → bg-purple-500/15
  ['bg-[#A78BFA20]', 'bg-purple-500/15'],
  // bg-[#A78BFA]/20 → bg-purple-500/20
  ['bg-[#A78BFA]/20', 'bg-purple-500/20'],
  // bg-[#A78BFA]/15 → bg-purple-500/15
  ['bg-[#A78BFA]/15', 'bg-purple-500/15'],
  // text-[#A78BFA] → text-purple-400
  ['text-[#A78BFA]', 'text-purple-400'],
  // bg-[#4A648020] → bg-text-muted/15
  ['bg-[#4A648020]', 'bg-text-muted/15'],
  // bg-[#1B4FD820] → bg-primary/15
  ['bg-[#1B4FD820]', 'bg-primary/15'],
  // text-[#38BDF8] → text-sky-400
  ['text-[#38BDF8]', 'text-sky-400'],
  // text-[#34D399] → text-emerald-400
  ['text-[#34D399]', 'text-emerald-400'],
  // bg-[#34D399]/15 → bg-emerald-400/15
  ['bg-[#34D399]/15', 'bg-emerald-400/15'],
  // text-[#FBBF24] → text-amber-400
  ['text-[#FBBF24]', 'text-amber-400'],
  // bg-[#F9731615] → bg-accent/10
  ['bg-[#F9731615]', 'bg-accent/10'],
  // bg-[#1E335215] → bg-border/10
  ['bg-[#1E335215]', 'bg-border/10'],
  // text-[#64748B] → text-text-muted
  ['text-[#64748B]', 'text-text-muted'],
  // bg-[#64748B15] → bg-text-muted/10
  ['bg-[#64748B15]', 'bg-text-muted/10'],
  // bg-[#1B4FD815] → bg-primary/10
  ['bg-[#1B4FD815]', 'bg-primary/10'],
  // bg-[#8B5CF615] → bg-purple-500/10
  ['bg-[#8B5CF615]', 'bg-purple-500/10'],
  // text-[#8B5CF6] → text-purple-500
  ['text-[#8B5CF6]', 'text-purple-500'],
  // bg-[#8BA3C7]/10 → bg-text-muted/10
  ['bg-[#8BA3C7]/10', 'bg-text-muted/10'],
  // bg-[#E2E8F4] skeleton fallback
  ['[&_.skeleton]:bg-[#E2E8F4]', '[&_.skeleton]:bg-border'],
  // text-[#E2E8F4] → text-border
  ['text-[#E2E8F4]', 'text-border'],
];

// Directories to process
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

console.log('🔄 Starting hex color replacement...\n');
let totalFixed = 0;
for (const dir of dirsToProcess) {
  totalFixed += walkDir(dir);
}
console.log(`\n✨ Done! Fixed ${totalFixed} files.`);
