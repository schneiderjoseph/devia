import fs from "node:fs";
import path from "node:path";
import { packageRoot, exists, read, writeFile, copyDir, walk } from "./fs.mjs";

/**
 * What `.devia/standard/` receives.
 *
 * A file is vendored together with whatever it links to: a relative link that resolves in this
 * repository and not in the adopter's copy is a broken link shipped to every project
 * (`tests/cli.test.mjs` walks the materialised tree and fails on one).
 *
 * `templates/project/` and `templates/agents/` are deliberately absent: their links are written
 * for a materialised `.devia/`, so they only resolve once `init` has expanded them.
 */
export const VENDOR_FILES = [
  "AGENTS.md",
  "PRINCIPLES.md",
  "MEMORY.md",
  "LEVELS.md",
  "MATURITY.md",
  "GOVERNANCE.md",
  "MIGRATION.md",
  "REFERENCES.md",
  "CHANGELOG.md",
  "VERSION",
];

export const VENDOR_DIRS = [
  "rules",
  "checklists",
  "standard",
  "compliance",
  "schema",
  path.join("templates", "docs"),
  path.join("templates", "github"),
];

/** Everything the vendor would write, as `relative path -> content`. */
export function vendorContents() {
  const out = new Map();
  for (const f of VENDOR_FILES) {
    const src = path.join(packageRoot, f);
    if (exists(src)) out.set(f, read(src));
  }
  for (const d of VENDOR_DIRS) {
    const from = path.join(packageRoot, d);
    for (const rel of walk(from)) out.set(path.join(d, rel), read(path.join(from, rel)));
  }
  return out;
}

/**
 * Rewrite the pinned copy from scratch. Returns the number of files written, `PINNED.md`
 * included.
 */
export function vendorStandard(dest, { by, cli, standard, date }) {
  fs.rmSync(dest, { recursive: true, force: true });
  let files = 0;
  for (const f of VENDOR_FILES) {
    const src = path.join(packageRoot, f);
    if (exists(src)) {
      writeFile(path.join(dest, f), read(src));
      files++;
    }
  }
  for (const d of VENDOR_DIRS) files += copyDir(path.join(packageRoot, d), path.join(dest, d));
  writeFile(
    path.join(dest, "PINNED.md"),
    `# Pinned standard\n\nVendored by \`${by}\` on ${date}.\n\n` +
      `- devia version: ${cli}\n- standard version: ${standard}\n\n` +
      "Do not edit these files. Change the standard upstream, then run `npx devia sync`.\n"
  );
  return files + 1;
}
