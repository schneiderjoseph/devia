import path from "node:path";
import { exists, read, readJSON, packageRoot, walk } from "../lib/fs.mjs";
import { git, isRepo } from "../lib/git.mjs";
import { standardVersion } from "../lib/version.mjs";
import { color, heading, status, line } from "../lib/ui.mjs";
import { ADAPTERS } from "./skills.mjs";
import { REQUIRED_MEMORY, registryIds } from "./validate.mjs";

function lastCommitTime(root, pathspec) {
  const out = git(root, ["log", "-1", "--format=%ct", "--", ...pathspec]);
  const n = Number(out);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function commitsSince(root, sinceEpoch, pathspec) {
  const out = git(root, [
    "log",
    `--since=${sinceEpoch}`,
    "--format=%h",
    "--",
    ...pathspec,
  ]);
  if (out === null) return null;
  return out ? out.split("\n").filter(Boolean).length : 0;
}

export default async function doctor(ctx) {
  const { root, deviaDir, flags } = ctx;

  if (flags.help) {
    line(`
${color.bold("devia doctor")} — adoption, drift and staleness

  --root <dir>   repository to diagnose
`.trim());
    return 0;
  }

  heading(`devia doctor — ${path.basename(root)}`);

  // Adoption
  if (!exists(deviaDir)) {
    status("FAIL", "no .devia/", "run `devia init` — this is rule zero (AGT-002)");
    line("");
    return 1;
  }
  const missing = REQUIRED_MEMORY.filter((f) => !exists(path.join(deviaDir, f)));
  status(
    missing.length ? "WARN" : "PASS",
    `memory files (${REQUIRED_MEMORY.length - missing.length}/${REQUIRED_MEMORY.length})`,
    missing.length ? `missing ${missing.join(", ")}` : ""
  );

  // Version pin
  const config = readJSON(path.join(deviaDir, "devia.json")) || {};
  const installed = standardVersion();
  if (config.standardVersion && installed && config.standardVersion !== installed) {
    status("WARN", `standard pinned at ${config.standardVersion}`, `installed ${installed} — run \`devia sync\``);
  } else {
    status("PASS", `standard v${config.standardVersion || installed || "?"}`);
  }

  // devia's own repository *is* the standard: it vendors nothing into itself (01_ARCHITECTURE.md).
  const vendored = walk(path.join(deviaDir, "standard")).length;
  if (path.resolve(root) === path.resolve(packageRoot)) {
    status("SKIP", "vendored standard", "this repository is the standard");
  } else {
    status(
      vendored ? "PASS" : "WARN",
      `vendored standard: ${vendored} files`,
      vendored ? "" : "run `devia sync`"
    );
  }

  // Adapters
  const present = Object.entries(ADAPTERS).filter(([, [, t]]) => exists(path.join(root, t)));
  status(
    present.length ? "PASS" : "WARN",
    `agent adapters: ${present.length}/${Object.keys(ADAPTERS).length}`,
    present.map(([k]) => k).join(", ") || "run `devia skills install`"
  );

  // Placeholders
  let placeholders = 0;
  for (const f of REQUIRED_MEMORY) {
    const text = read(path.join(deviaDir, f));
    if (text) placeholders += (text.match(/TODO\(devia\)/g) || []).length;
  }
  status(
    placeholders ? "WARN" : "PASS",
    `unfilled placeholders: ${placeholders}`,
    placeholders ? "memory that describes nothing protects nothing" : ""
  );

  // Registries
  const gaps = registryIds(read(path.join(deviaDir, "11_GAPS.md")) || "", "G");
  const debt = registryIds(read(path.join(deviaDir, "12_DEBT.md")) || "", "D");
  status("INFO", `registries: ${gaps.length} gap ids, ${debt.length} debt ids`);

  // Staleness — is the memory older than the code it describes?
  if (!isRepo(root)) {
    status("SKIP", "staleness", "not a git repository");
  } else {
    const codePaths = (config.code?.paths || []).filter((p) => exists(path.join(root, p)));
    const spec = codePaths.length ? codePaths : ["."];
    const codeTime = lastCommitTime(root, spec);
    const memTime = lastCommitTime(root, [".devia"]);

    if (!codeTime) {
      status("SKIP", "staleness", "no commits touching the code paths yet");
    } else if (!memTime) {
      status("WARN", "the memory has never been committed", "commit .devia/ with the code");
    } else {
      const drift = Math.max(0, codeTime - memTime);
      const days = Math.floor(drift / 86400);
      const behind = commitsSince(root, memTime, spec);
      if (drift === 0) {
        status("PASS", "memory is current with the code");
      } else if (days < 3 && (behind ?? 0) < 5) {
        status("PASS", `memory ${days}d behind the code`, `${behind ?? "?"} commits since`);
      } else {
        status(
          "WARN",
          `memory ${days}d behind the code`,
          `${behind ?? "?"} commits touched ${spec.join(", ")} since the memory changed (MEM-009)`
        );
      }
    }

    const branch = git(root, ["rev-parse", "--abbrev-ref", "HEAD"]);
    const isDefault = ["main", "master"].includes(branch);
    status(isDefault ? "WARN" : "PASS", `branch: ${branch}`, isDefault ? "work happens on a branch (OPS-002)" : "");
  }

  line("");
  line(color.dim("  Next: `devia validate` for integrity, `devia check` for readiness gates."));
  line("");
  return 0;
}
