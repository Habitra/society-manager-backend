const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.controller.ts')) results.push(file);
    }
  });
  return results;
}

const files = walk(path.join(__dirname, 'src'));
let modifiedCount = 0;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  let modified = false;
  let hasImport = content.includes('AuthenticatedOnly');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/^\s*@(Get|Post|Patch|Put|Delete)\(/)) {
      // Look back for decorators
      let j = i - 1;
      let hasAuthDecorator = false;
      while (j >= 0 && lines[j].match(/^\s*@/)) {
        if (lines[j].includes('@Roles') || lines[j].includes('@Public') || lines[j].includes('@AuthenticatedOnly')) {
          hasAuthDecorator = true;
          break;
        }
        j--;
      }
      // Also look ahead for decorators that might be on the same method
      let k = i + 1;
      while (k < lines.length && lines[k].match(/^\s*@/)) {
        if (lines[k].includes('@Roles') || lines[k].includes('@Public') || lines[k].includes('@AuthenticatedOnly')) {
          hasAuthDecorator = true;
          break;
        }
        k++;
      }
      
      if (!hasAuthDecorator) {
        // Insert @AuthenticatedOnly() right above the HTTP verb
        const whitespaceMatch = line.match(/^(\s*)/);
        const indent = whitespaceMatch ? whitespaceMatch[1] : '';
        lines.splice(i, 0, indent + '@AuthenticatedOnly()');
        i++; // Skip the newly inserted line
        modified = true;
      }
    }
  }
  
  if (modified) {
    if (!hasImport) {
      // Find the last import line
      let lastImportIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('import ')) lastImportIndex = i;
      }
      
      // Calculate relative path to src/auth/decorators/authenticated-only.decorator
      const srcDir = path.join(__dirname, 'src');
      const authDecDir = path.join(srcDir, 'auth', 'decorators');
      let relativePath = path.relative(path.dirname(file), authDecDir).replace(/\\/g, '/');
      if (!relativePath.startsWith('.')) relativePath = './' + relativePath;
      
      const importStatement = `import { AuthenticatedOnly } from '${relativePath}/authenticated-only.decorator';`;
      
      if (lastImportIndex !== -1) {
        lines.splice(lastImportIndex + 1, 0, importStatement);
      } else {
        lines.unshift(importStatement);
      }
    }
    fs.writeFileSync(file, lines.join('\n'));
    modifiedCount++;
    console.log('Modified ' + file);
  }
}
console.log('Total files modified: ' + modifiedCount);
