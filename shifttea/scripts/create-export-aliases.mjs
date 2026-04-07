import { promises as fs } from 'fs';
import path from 'path';

const outDir = path.resolve(process.cwd(), 'out');

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else {
      files.push(full);
    }
  }
  return files;
}

function normalizeSlash(p) {
  return p.split(path.sep).join('/');
}

async function main() {
  const allFiles = await walk(outDir);
  const txtFiles = allFiles.filter((f) => f.endsWith('.txt'));
  let created = 0;

  for (const file of txtFiles) {
    const rel = normalizeSlash(path.relative(outDir, file));
    const parts = rel.split('/');
    const markerIdx = parts.findIndex((p) => p.startsWith('__next.!'));
    if (markerIdx <= 0) continue;

    const routeRoot = parts.slice(0, markerIdx);
    const marker = parts[markerIdx];
    const tail = parts.slice(markerIdx + 1);
    if (tail.length === 0) continue;

    const flatName = `_next.${marker.slice('__next.'.length)}.${tail.join('.')}`;
    const aliasPath = path.join(outDir, ...routeRoot, flatName);

    try {
      await fs.access(aliasPath);
      continue;
    } catch {
      // file doesn't exist; create below
    }

    const content = await fs.readFile(file);
    await fs.writeFile(aliasPath, content);
    created++;
  }

  console.log(`created ${created} export alias files`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

