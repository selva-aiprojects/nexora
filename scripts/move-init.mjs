import fs from 'fs';
import path from 'path';

const modulesDir = path.join(process.cwd(), 'server', 'src', 'modules');
const files = fs.readdirSync(modulesDir).filter((f) => f.endsWith('.ts'));

for (const file of files) {
  const filePath = path.join(modulesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Find the init block
  const initMatch = content.match(/async function init\(\)\s*\{[\s\S]*?init\(\)\.catch\(console\.error\);/);
  if (!initMatch) {
    console.log('No init block in', file);
    continue;
  }

  const initBlock = initMatch[0];
  // Remove it from current position
  content = content.replace(initBlock, '');

  // Find the last export default router; and insert before it
  const exportMatch = content.match(/export default router;/);
  if (!exportMatch) {
    console.log('No export in', file);
    continue;
  }

  const insertPoint = exportMatch.index;
  content = content.slice(0, insertPoint) + initBlock + '\n\n' + content.slice(insertPoint);

  fs.writeFileSync(filePath, content);
  console.log('Moved init in', file);
}
