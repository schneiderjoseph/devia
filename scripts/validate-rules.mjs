#!/usr/bin/env node
/**
 * Validate the rule registry against `schema/rule.schema.json` and the invariants the schema
 * cannot express: unique ids, filename equals id, directory equals domain, superseded rules
 * pointing at a rule that exists.
 */
import path from "node:path";
import process from "node:process";
import { loadRules, ruleStats } from "../src/lib/rules.mjs";
import { packageRoot, readJSON } from "../src/lib/fs.mjs";

const schema = readJSON(path.join(packageRoot, "schema", "rule.schema.json"));
if (!schema) {
  console.error("schema/rule.schema.json is missing or invalid JSON");
  process.exit(1);
}

const { rules, errors } = loadRules(path.join(packageRoot, "rules"));
const ids = new Set(rules.map((r) => r.id));

for (const r of rules) {
  for (const key of schema.required || []) {
    if (r[key] === undefined || r[key] === null) errors.push(`${r.file}: missing ${key}`);
  }
  if (r.status === "superseded" && !ids.has(r.superseded_by)) {
    errors.push(`${r.file}: superseded rules must name an existing superseded_by`);
  }
  if (r.validation && !r.validation.automated && !r.validation.manual) {
    errors.push(`${r.file}: a rule with no validation at all cannot be enforced`);
  }
}

if (errors.length) {
  console.error("validate-rules FAILED:");
  for (const e of errors) console.error(" -", e);
  process.exit(1);
}

const s = ruleStats(rules);
console.log(
  `validate-rules OK: ${s.total} rules · ${s.priority.P0 || 0} P0 · ${s.automatable} automatable · ${Object.keys(s.domain).length} domains`
);
