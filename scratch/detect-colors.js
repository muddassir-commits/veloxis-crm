const fs = require('fs');
const path = require('path');

const baseDir = path.resolve(__dirname, '..');
const componentsDir = path.join(baseDir, 'components');
const appDir = path.join(baseDir, 'app');

const hexRegex = /#(?:[0-9a-fA-F]{3}){1,2}\b/g;

function walkDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== 'scratch') {
        walkDir(filePath, fileList);
      }
    } else {
      if (file.endsWith('.tsx') || (file.endsWith('.ts') && !file.endsWith('.d.ts'))) {
        fileList.push(filePath);
      }
    }
  }
  return fileList;
}

const allFiles = [...walkDir(componentsDir), ...walkDir(appDir)];
const results = [];

for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const matches = [];
  
  // Split by line to get line numbers
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    let lineMatches = line.match(hexRegex);
    if (lineMatches) {
      lineMatches.forEach(m => {
        // Exclude some common patterns if needed, but here we report all
        matches.push({
          line: idx + 1,
          content: line.trim(),
          color: m
        });
      });
    }
  });

  if (matches.length > 0) {
    const relPath = path.relative(baseDir, file);
    results.push({
      file: relPath,
      matches
    });
  }
}

const outPath = path.join(__dirname, 'detected-colors.json');
fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8');
console.log(`Scan complete. Found ${results.length} files with hardcoded colors. Output saved to ${outPath}`);
