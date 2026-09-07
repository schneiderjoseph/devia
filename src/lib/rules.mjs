import path from "node:path";
import { parseFrontmatter } from "./yaml.mjs";
import { read, walk, packageRoot } from "./fs.mjs";

export const SEVERITIES = ["MUST", "MUST NOT", "SHOULD", "MAY"];
export const STATUSES = [
  "draft",
  "proposed",
  "active",
  "deprecated",
  "superseded",
  "removed",
];
export const PRIORITIES = ["P0", "P1", "P2", "P3"];
export const ID_PATTERN = /^[A-Z][A-Z0-9]*(-[A-Z0-9]+)+$/;

const NOT_A_RULE = new Set(["README.md", "LIFECYCLE.md"]);

/**
 * Load every rule under a `rules/` directory.
 * Returns `{ rules, errors }`; a malformed file becomes an error, never a silent skip.
 */
export function loadRules(rulesDir = path.join(packageRoot, "rules")) {
  const files = walk(rulesDir, {
    filter: (rel) => rel.endsWith(".md") && !NOT_A_RULE.has(path.basename(rel)),
  });
  const rules = [];
  const errors = [];
  const seen = new Map();

  for (const rel of files) {
    const abs = path.join(rulesDir, rel);
    const text = read(abs);
    const { data, error } = parseFrontmatter(text ?? "");
    const where = rel.split(path.sep).join("/");

    if (error || !data) {
      errors.push(`${where}: ${error || "missing frontmatter"}`);
      continue;
    }
    const rule = { ...data, file: where };
    const id = rule.id;

    if (!id || !ID_PATTERN.test(String(id))) errors.push(`${where}: invalid id ${id}`);
    else if (seen.has(id)) errors.push(`${where}: duplicate id ${id} (also ${seen.get(id)})`);
    else seen.set(id, where);

    if (path.basename(where, ".md") !== id) errors.push(`${where}: filename must match id`);
    if (!SEVERITIES.includes(rule.severity)) errors.push(`${where}: bad severity ${rule.severity}`);
    if (!STATUSES.includes(rule.status)) errors.push(`${where}: bad status ${rule.status}`);
    if (!PRIORITIES.includes(rule.priority)) errors.push(`${where}: bad priority ${rule.priority}`);
    if (!rule.domain) errors.push(`${where}: missing domain`);
    if (!Array.isArray(rule.source) || rule.source.length === 0)
      errors.push(`${where}: at least one source is required`);
    if (!rule.requirement || String(rule.requirement).length < 10)
      errors.push(`${where}: requirement too short`);
    if (
      typeof rule.validation?.automated !== "boolean" ||
      typeof rule.validation?.manual !== "boolean"
    )
      errors.push(`${where}: validation.automated and validation.manual are required`);

    const dir = where.split("/")[0];
    if (rule.domain && dir !== rule.domain)
      errors.push(`${where}: lives in ${dir}/ but declares domain ${rule.domain}`);

    rules.push(rule);
  }

  rules.sort((a, b) => String(a.id).localeCompare(String(b.id)));
  return { rules, errors };
}

export function ruleStats(rules) {
  const by = (key) =>
    rules.reduce((acc, r) => ((acc[r[key]] = (acc[r[key]] || 0) + 1), acc), {});
  return {
    total: rules.length,
    severity: by("severity"),
    priority: by("priority"),
    domain: by("domain"),
    automatable: rules.filter((r) => r.validation?.automated).length,
    active: rules.filter((r) => r.status === "active").length,
  };
}
