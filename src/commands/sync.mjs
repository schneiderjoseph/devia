import path from "node:path";
import { exists, read, readJSON, writeJSON, walk } from "../lib/fs.mjs";
import { cliVersion, standardVersion } from "../lib/version.mjs";
import { vendorStandard, vendorContents } from "../lib/vendor.mjs";
import { color, heading, status, line } from "../lib/ui.mjs";

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
  const installed = standardVersion();
  const cli = cliVersion();
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
    const now = vendorContents();
    for (const [rel, content] of now) {
      if (!before.has(rel)) added++;
      else if (before.get(rel) !== content) changed++;
    }
    const removed = [...before.keys()].filter((k) => !now.has(k) && k !== "PINNED.md").length;
    status("INFO", `would write ${added} new, ${changed} changed, remove ${removed}`);
    line("");
    return 0;
  }

  const files = vendorStandard(dest, {
    by: "devia sync",
    cli,
    standard: installed,
    date: new Date().toISOString().slice(0, 10),
  });

  if (config.standardVersion !== installed || config.deviaVersion !== cli) {
    config.standardVersion = installed;
    config.deviaVersion = cli;
    writeJSON(path.join(deviaDir, "devia.json"), config);
    status("PASS", `pin updated to ${installed}`, `written by devia ${cli}`);
  }

  const after = new Map();
  for (const rel of walk(dest)) after.set(rel, read(path.join(dest, rel)));
  const changed = [...after.keys()].filter((k) => before.has(k) && before.get(k) !== after.get(k));
  const added = [...after.keys()].filter((k) => !before.has(k));
  const removed = [...before.keys()].filter((k) => !after.has(k));

  status("PASS", `${files} files vendored`, `v${installed}`);
  if (added.length) status("INFO", `${added.length} new`, added.slice(0, 5).join(", "));
  if (changed.length) status("INFO", `${changed.length} changed`, changed.slice(0, 5).join(", "));
  if (removed.length) status("WARN", `${removed.length} removed`, removed.slice(0, 5).join(", "));

  line("");
  line(color.dim("  Read CHANGELOG.md for what moved, then run `devia check`."));
  line("");
  return 0;
}
