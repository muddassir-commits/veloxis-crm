const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'detected-colors.json'), 'utf8'));

// Find components\portal\portal-header.tsx
const ph = data.find(item => item.file.includes('portal-header.tsx'));
if (ph) {
  console.log('portal-header.tsx matches:');
  console.log(ph.matches.slice(0, 10));
}

// Find app\(auth)\login\page.tsx
const lp = data.find(item => item.file.includes('login\\page.tsx') || item.file.includes('login/page.tsx'));
if (lp) {
  console.log('\nlogin/page.tsx matches:');
  console.log(lp.matches.slice(0, 10));
}
