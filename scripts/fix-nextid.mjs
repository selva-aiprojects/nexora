import fs from 'fs';
import path from 'path';

const dir = path.join(process.cwd(), 'server', 'src');

function walk(currentDir) {
  for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
    const full = path.join(currentDir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.ts')) processFile(full);
  }
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  content = content.replace(/db\.nextId\(/g, 'await db.nextId(');
  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log('Fixed nextId in', path.relative(process.cwd(), filePath));
  }
}

walk(dir);
