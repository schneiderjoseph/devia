#!/usr/bin/env node
/** Every relative markdown link in this repository must resolve to a file that exists. */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { packageRoot, walk } from "../src/lib/fs.mjs";

const linkRe = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

// `templates/` is written into a project, where its links resolve against `.devia/`.
// Those are checked against a materialised project in tests/cli.test.mjs instead.
const skipDirs = new Set([".git", "node_modules", ".devia", "templates"]);

const files = walk(packageRoot, {
  filter: (rel) => rel.endsWith(".md"),
  skip: (rel) => skipDirs.has(rel.split(path.sep)[0]),
});

let broken = 0;
let checked = 0;

for (const rel of files) {
  const file = path.join(packageRoot, rel);
  const text = fs.readFileSync(file, "utf8");
  let m;
  while ((m = linkRe.exec(text))) {
    const target = m[1].split("#")[0].split("?")[0];
    if (!target) continue;
    if (/^(https?:|mailto:|tel:)/.test(target)) continue;
    checked++;
    const resolved = path.resolve(path.dirname(file), target);
    if (!fs.existsSync(resolved)) {
      console.error(`broken link  ${rel.split(path.sep).join("/")} -> ${target}`);
      broken++;
    }
  }
}

if (broken) {
  console.error(`validate-links FAILED: ${broken} broken of ${checked}`);
  process.exit(1);
}
console.log(`validate-links OK: ${checked} links in ${files.length} files`);
