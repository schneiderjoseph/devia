import fs from "node:fs";
import path from "node:path";
import { packageRoot, exists, read, readJSON, writeJSON, writeFile, copyDir, walk } from "../lib/fs.mjs";
import { parseYaml } from "../lib/yaml.mjs";
import { color, heading, status, line } from "../lib/ui.mjs";

const VENDOR_FILES = [
  "AGENTS.md",
  "PRINCIPLES.md",
  "MEMORY.md",
  "LEVELS.md",
  "MATURITY.md",
  "GOVERNANCE.md",
  "REFERENCES.md",
  "VERSION",
];
const VENDOR_DIRS = ["rules", "checklists", "standard", "compliance", "schema"];

export default async function sync(ctx) {
  const { root, deviaDir, flags } = ctx;

  if (flags.help) {
    line(`
${color.bold("devia sync")} — refresh the vendored standard in .devia/standard/

  --root <dir>   repository to sync
  --dry-run      report what would change, write nothing

The project memory is never touched: sync replaces the pinned copy of the standard only.
`.trim());
    return 0;
  }

  if (!exists(deviaDir)) {
    status("FAIL", "no .devia/", "run `devia init` first");
    return 1;
  }

  const dest = path.join(deviaDir, "standard");
  const installed = parseYaml(read(path.join(packageRoot, "VERSION")) || "").standard_version;
  const config = readJSON(path.join(deviaDir, "devia.json")) || {};
  const pinned = config.standardVersion;

  heading("devia sync");
  line(`  ${color.dim("pinned")}     ${pinned || "none"}`);
  line(`  ${color.dim("installed")}  ${installed || "unknown"}`);

  const before = new Map();
  for (const rel of walk(dest)) before.set(rel, read(path.join(dest, rel)));

  if (flags["dry-run"]) {
    let changed = 0;
    let added = 0;
    const now = new Map();
    for (const f of VENDOR_FILES) {
      const src = path.join(packageRoot, f);
      if (exists(src)) now.set(f, read(src));
    }
    for (const d of VENDOR_DIRS) {
      for (const rel of walk(path.join(packageRoot, d))) {
        now.set(path.join(d, rel), read(path.join(packageRoot, d, rel)));
      }
    }
    for (const [rel, content] of now) {
      if (!before.has(rel)) added++;
      else if (before.get(rel) !== content) changed++;
    }
    const removed = [...before.keys()].filter((k) => !now.has(k) && k !== "PINNED.md").length;
    status("INFO", `would write ${added} new, ${changed} changed, remove ${removed}`);
    line("");
    return 0;
  }

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

  const today = new Date().toISOString().slice(0, 10);
  writeFile(
    path.join(dest, "PINNED.md"),
    `# Pinned standard\n\nVendored by \`devia sync\` on ${today}.\n\n` +
      `- standard version: ${installed}\n\n` +
      "Do not edit these files. Change the standard upstream, then run `npx devia sync`.\n"
  );

  if (config.standardVersion !== installed) {
    config.standardVersion = installed;
    config.deviaVersion = installed;
    writeJSON(path.join(deviaDir, "devia.json"), config);
    status("PASS", `pin updated to ${installed}`);
  }

  const after = new Map();
  for (const rel of walk(dest)) after.set(rel, read(path.join(dest, rel)));
  const changed = [...after.keys()].filter((k) => before.has(k) && before.get(k) !== after.get(k));
  const added = [...after.keys()].filter((k) => !before.has(k));
  const removed = [...before.keys()].filter((k) => !after.has(k));

  status("PASS", `${files + 1} files vendored`, `v${installed}`);
  if (added.length) status("INFO", `${added.length} new`, added.slice(0, 5).join(", "));
  if (changed.length) status("INFO", `${changed.length} changed`, changed.slice(0, 5).join(", "));
  if (removed.length) status("WARN", `${removed.length} removed`, removed.slice(0, 5).join(", "));

  line("");
  line(color.dim("  Read CHANGELOG.md for what moved, then run `devia check`."));
  line("");
  return 0;
}
