import fs from 'fs';
import path from 'path';

const src = path.join(process.cwd(), '..', 'frontend', 'dist');
const dest = path.join(process.cwd(), 'public');

if (!fs.existsSync(dest)) {
  fs.mkdirSync(dest, { recursive: true });
}

const entries = fs.readdirSync(src, { withFileTypes: true });
for (const entry of entries) {
  const srcPath = path.join(src, entry.name);
  const destPath = path.join(dest, entry.name);
  if (entry.isDirectory()) {
    copyRecursive(srcPath, destPath);
  } else {
    fs.copyFileSync(srcPath, destPath);
  }
}

console.log('Copied frontend dist to server/public');
