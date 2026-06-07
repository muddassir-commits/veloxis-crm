const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'detected-colors.json'), 'utf8'));

console.log(`Total files with hardcoded colors: ${data.length}`);
console.log('---');

data.forEach((item) => {
  console.log(`${item.file}: ${item.matches.length} occurrences`);
});
