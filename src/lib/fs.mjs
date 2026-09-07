import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Root of the installed devia package. */
export const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  ".."
);

export function exists(p) {
  return fs.existsSync(p);
}

export function read(p) {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return null;
  }
}

export function readJSON(p) {
  const raw = read(p);
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writeFile(p, content) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content.replace(/\r\n/g, "\n"), "utf8");
}

export function writeJSON(p, value) {
  writeFile(p, JSON.stringify(value, null, 2) + "\n");
}

/** Recursively list files under dir, relative to dir. */
export function walk(dir, { filter = () => true, skip = () => false } = {}) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const stack = [""];
  while (stack.length) {
    const rel = stack.pop();
    const abs = path.join(dir, rel);
    for (const ent of fs.readdirSync(abs, { withFileTypes: true })) {
      const childRel = rel ? path.join(rel, ent.name) : ent.name;
      if (skip(childRel, ent)) continue;
      if (ent.isDirectory()) stack.push(childRel);
      else if (ent.isFile() && filter(childRel)) out.push(childRel);
    }
  }
  return out.sort();
}

/** Copy a directory tree. Returns the number of files written. */
export function copyDir(from, to, { filter = () => true, overwrite = true } = {}) {
  let n = 0;
  for (const rel of walk(from, { filter })) {
    const target = path.join(to, rel);
    if (!overwrite && fs.existsSync(target)) continue;
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(from, rel), target);
    n++;
  }
  return n;
}

/** Find the repository root by walking up for a marker, else return cwd. */
export function findProjectRoot(start = process.cwd()) {
  let dir = path.resolve(start);
  for (;;) {
    if (
      fs.existsSync(path.join(dir, ".devia")) ||
      fs.existsSync(path.join(dir, ".git")) ||
      fs.existsSync(path.join(dir, "package.json"))
    ) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) return path.resolve(start);
    dir = parent;
  }
}
