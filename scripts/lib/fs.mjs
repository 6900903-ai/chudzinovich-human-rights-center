import { mkdir, readFile, writeFile, rm, cp, readdir, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

export async function writeText(path, text) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, text, 'utf8');
}

export async function writeJson(path, value) {
  await writeText(path, JSON.stringify(value, null, 2) + '\n');
}

export async function resetDir(path) {
  await rm(path, { recursive: true, force: true });
  await mkdir(path, { recursive: true });
}

export async function copyDir(src, dest) {
  await cp(src, dest, { recursive: true });
}

export async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir)) {
    const full = join(dir, entry);
    const s = await stat(full);
    if (s.isDirectory()) out.push(...await walk(full));
    else out.push(full);
  }
  return out;
}
