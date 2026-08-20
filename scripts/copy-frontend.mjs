import fs from 'fs';
import path from 'path';

const src = path.join(process.cwd(), 'frontend', 'dist');
const dest = path.join(process.cwd(), 'server', 'public');

function copyRecursive(srcDir, destDir) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (!fs.existsSync(dest)) {
  fs.mkdirSync(dest, { recursive: true });
}

copyRecursive(src, dest);

console.log('Copied frontend dist to server/public');
