import fs from 'fs';
import path from 'path';

const modulesDir = path.join(process.cwd(), 'server', 'src', 'modules');
const files = fs.readdirSync(modulesDir).filter((f) => f.endsWith('.ts'));

for (const file of files) {
  const filePath = path.join(modulesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Find all db.seed(...) calls
  const seedRegex = /db\.seed\([^)]+\);/g;
  const seeds = [];
  let match;
  while ((match = seedRegex.exec(content)) !== null) {
    seeds.push(match[0]);
  }

  if (seeds.length === 0) {
    console.log('No seeds in', file);
    continue;
  }

  // Build replacement
  const replacement =
    'async function init() {\n' +
    seeds.map((s) => '  ' + s.replace('db.seed', 'await db.seed')).join('\n') +
    '\n}\ninit().catch(console.error);\n';

  // Remove original seed calls
  for (const seed of seeds) {
    content = content.replace(seed, '');
  }

  // Insert replacement before the last comment or route definition
  const lines = content.split('\n');
  let insertIndex = lines.findIndex((l) => l.startsWith('//'));
  if (insertIndex === -1) insertIndex = lines.findIndex((l) => l.startsWith('router.'));
  if (insertIndex === -1) insertIndex = lines.length;

  lines.splice(insertIndex, 0, replacement);
  content = lines.join('\n');

  fs.writeFileSync(filePath, content);
  console.log('Wrapped seeds in', file, 'count:', seeds.length);
}
