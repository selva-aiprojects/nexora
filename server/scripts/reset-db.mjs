import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const target = path.resolve(root, '..', process.env.SQLITE_PATH ?? './data/nexora.db');
fs.rmSync(target, { force: true });
console.log(`Reset Nexora DB: removed ${target}`);
