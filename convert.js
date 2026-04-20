const fs = require('fs');
const path = require('path');
const OpenCC = require('opencc');

const converter = new OpenCC('s2t.json');

function traverseDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      traverseDir(fullPath);
    } else if (stat.isFile() && (fullPath.endsWith('.html') || fullPath.endsWith('.js') || fullPath.endsWith('.json'))) {
      // Don't convert external libraries if they are minified, but we only have our own js here.
      if (fullPath.includes('lunar.min.js')) continue;
      
      const content = fs.readFileSync(fullPath, 'utf8');
      const converted = converter.convertSync(content);
      if (content !== converted) {
        fs.writeFileSync(fullPath, converted, 'utf8');
        console.log('Converted:', fullPath);
      }
    }
  }
}

traverseDir(path.join(__dirname, 'public'));
console.log('Conversion complete!');
