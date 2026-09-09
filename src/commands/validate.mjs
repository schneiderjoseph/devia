import path from "node:path";
import { exists, read, readJSON, packageRoot } from "../lib/fs.mjs";
import { parseYaml } from "../lib/yaml.mjs";
import { standardVersion } from "../lib/version.mjs";
import { color, heading, status, line, summary } from "../lib/ui.mjs";

export const REQUIRED_MEMORY = [
  "AGENTS.md",
  "00_OVERVIEW.md",
  "01_ARCHITECTURE.md",
  "02_SURFACES.md",
  "03_DATA_MODEL.md",
  "04_PERMISSIONS.md",
  "05_FLOWS.md",
  "06_INTEGRATIONS.md",
  "07_DESIGN.md",
  "10_NEVER_ALWAYS.md",
  "11_GAPS.md",
  "12_DEBT.md",
  "13_RECIPES.md",
  "14_INDEX.md",
  "impact-map.yaml",
  "devia.json",
];

const PLACEHOLDER = /TODO\(devia\)/g;

/** Perishable facts do not belong in files that describe what the project is (MEM-007). */
const PERISHABLE = [
  /\b\d+\s+tests?\s+(passing|green|failing)\b/i,
  /\bcurrently\s+(working|building|on)\b/i,
  /\bnext\s+(we|up|sprint|milestone)\b/i,
  /\bas of (today|this week|yesterday)\b/i,
  /\bin progress\b/i,
  /\b(this|next) (sprint|week)\b/i,
];
const PERISHABLE_FILES = ["00_OVERVIEW.md", "01_ARCHITECTURE.md", "14_INDEX.md"];

/** Registry ids look like `| G12 |` (gaps) or `| D7 |` (debt). */
export function registryIds(text, prefix) {
  const re = new RegExp(`^\\|\\s*(${prefix}(\\d+))\\s*\\|`, "gm");
  const out = [];
  let m;
  while ((m = re.exec(text))) out.push({ id: m[1], n: Number(m[2]) });
  return out;
}

export function checkRegistry(text, prefix, name, add) {
  const entries = registryIds(text, prefix);
  const seen = new Map();
  for (const { id, n } of entries) {
    if (seen.has(id)) add("FAIL", `${name}: duplicate id ${id}`, "ids are never reused (MEM-004)");
    else seen.set(id, n);
  }
  const nums = [...seen.values()];
  if (nums.length && new Set(nums).size !== nums.length) {
    add("FAIL", `${name}: repeated numbering`, "MEM-004");
  }
  return seen.size;
}

export default async function validate(ctx) {
  const { root, deviaDir, flags } = ctx;
  const results = [];
  const add = (kind, label, detail = "") => results.push({ kind, label, detail });

  if (flags.help) {
    line(`
${color.bold("devia validate")} — memory integrity

  --root <dir>   repository to validate
  --strict       treat unfilled placeholders as failures
  --json         machine-readable output
`.trim());
    return 0;
  }

  if (!exists(deviaDir)) {
    if (ctx.json) {
      console.log(JSON.stringify({ ok: false, error: "no .devia directory", root }, null, 2));
    } else {
      heading("devia validate");
      status("FAIL", "no .devia/ in this repository", "run `devia init` (AGT-002)");
      line("");
    }
    return 1;
  }

  // 1. Structure
  for (const file of REQUIRED_MEMORY) {
    if (exists(path.join(deviaDir, file))) add("PASS", `memory file ${file}`);
    else add("FAIL", `missing ${file}`, "run `devia init` to restore the template");
  }

  // 2. Configuration
  const config = readJSON(path.join(deviaDir, "devia.json"));
  if (!config) {
    add("FAIL", "devia.json missing or invalid JSON");
  } else {
    for (const key of ["project", "maturity", "standardVersion"]) {
      if (!config[key]) add("FAIL", `devia.json: missing ${key}`);
    }
    if (config.project && !config.project.name) add("FAIL", "devia.json: project.name is empty");
    const installed = standardVersion();
    if (installed && config.standardVersion && installed !== config.standardVersion) {
      add(
        "WARN",
        `standard pinned at ${config.standardVersion}, installed is ${installed}`,
        "run `devia sync`"
      );
    }
  }

  // 3. Impact map
  const mapRaw = read(path.join(deviaDir, "impact-map.yaml"));
  if (mapRaw) {
    const map = parseYaml(mapRaw);
    const impacts = map.impacts || {};
    const keys = Object.keys(impacts);
    if (!keys.length) add("FAIL", "impact-map.yaml has no impacts", "MEM-009 cannot be checked");
    let missing = 0;
    for (const [key, targets] of Object.entries(impacts)) {
      for (const t of [].concat(targets || [])) {
        const rel = String(t);
        if (rel.startsWith(".") || rel.includes("/")) continue; // points outside .devia
        if (!exists(path.join(deviaDir, rel))) {
          add("FAIL", `impact-map: ${key} -> ${rel} does not exist`);
          missing++;
        }
      }
    }
    if (!missing && keys.length) add("PASS", `impact map: ${keys.length} change types`);
  }

  // 4. Registries
  const gaps = read(path.join(deviaDir, "11_GAPS.md")) || "";
  const debt = read(path.join(deviaDir, "12_DEBT.md")) || "";
  const nGaps = checkRegistry(gaps, "G", "11_GAPS.md", add);
  const nDebt = checkRegistry(debt, "D", "12_DEBT.md", add);
  add("PASS", `registries: ${nGaps} gap ids, ${nDebt} debt ids`);

  // 5. Placeholders
  const strict = Boolean(flags.strict);
  const current = String(config?.maturity?.current || "bronze").toLowerCase();
  let placeholders = 0;
  for (const file of REQUIRED_MEMORY) {
    const text = read(path.join(deviaDir, file));
    if (!text) continue;
    const n = (text.match(PLACEHOLDER) || []).length;
    if (!n) continue;
    placeholders += n;
    const blocking = strict || (file === "00_OVERVIEW.md" && current !== "bronze");
    add(blocking ? "FAIL" : "WARN", `${file}: ${n} unfilled placeholder${n > 1 ? "s" : ""}`);
  }
  if (!placeholders) add("PASS", "no unfilled placeholders");

  // 6. Perishable facts (MEM-007)
  for (const file of PERISHABLE_FILES) {
    const text = read(path.join(deviaDir, file));
    if (!text) continue;
    for (const re of PERISHABLE) {
      const m = text.match(re);
      if (m) add("WARN", `${file}: perishable fact "${m[0].trim()}"`, "MEM-007");
    }
  }

  // 7. Committed
  if (exists(path.join(root, ".gitignore"))) {
    const ignore = read(path.join(root, ".gitignore")) || "";
    if (/^\s*\.devia\/?\s*$/m.test(ignore)) {
      add("FAIL", ".devia/ is gitignored", "the memory is part of the repository");
    }
  }

  const counts = results.reduce((a, r) => ((a[r.kind] = (a[r.kind] || 0) + 1), a), {});
  const failed = counts.FAIL || 0;

  if (ctx.json) {
    console.log(JSON.stringify({ ok: failed === 0, counts, results }, null, 2));
    return failed ? 1 : 0;
  }

  heading("devia validate");
  const quiet = !flags.verbose;
  for (const r of results) {
    if (quiet && r.kind === "PASS") continue;
    status(r.kind, r.label, r.detail);
  }
  if (quiet && !failed && !counts.WARN) status("PASS", `${results.length} checks passed`);
  line("");
  line(`  ${failed ? color.red("FAILED") : color.green("OK")}  ${summary(counts)}`);
  line("");
  return failed ? 1 : 0;
}
