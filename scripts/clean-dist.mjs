import { readdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const distDirectory = fileURLToPath(new URL('../dist/', import.meta.url));
const entries = await readdir(distDirectory, { withFileTypes: true });
const generatedFiles = entries.filter((entry) => entry.isFile() && (/\.js$/.test(entry.name) || /\.js\.map$/.test(entry.name)));

await Promise.all(generatedFiles.map((entry) => rm(path.join(distDirectory, entry.name))));

if (generatedFiles.length > 0) {
  console.info(`Removed ${generatedFiles.length} generated JavaScript file(s) from dist.`);
}
