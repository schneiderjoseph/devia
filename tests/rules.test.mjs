import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadRules, ruleStats, ID_PATTERN } from "../src/lib/rules.mjs";
import { packageRoot } from "../src/lib/fs.mjs";

const { rules, errors } = loadRules(path.join(packageRoot, "rules"));

test("the registry loads without errors", () => {
  assert.deepEqual(errors, []);
  assert.ok(rules.length > 100, `expected a full registry, got ${rules.length}`);
});

test("every rule has a well-formed id and matching filename", () => {
  for (const r of rules) {
    assert.match(r.id, ID_PATTERN, `${r.file}: bad id`);
    assert.equal(path.basename(r.file, ".md"), r.id);
  }
});

test("ids are unique", () => {
  const ids = rules.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("every rule is enforceable: it has a source and a validation method", () => {
  for (const r of rules) {
    assert.ok(r.source?.length, `${r.id}: no source`);
    assert.ok(
      r.validation.automated || r.validation.manual,
      `${r.id}: no validation method at all`
    );
  }
});

test("the domains that carry the agent contract exist", () => {
  const stats = ruleStats(rules);
  for (const d of ["agent", "memory", "security", "accessibility", "ux"]) {
    assert.ok(stats.domain[d] > 0, `missing domain ${d}`);
  }
});

test("the hard stops in AGENTS.md are P0 rules", () => {
  const p0 = new Set(rules.filter((r) => r.priority === "P0").map((r) => r.id));
  for (const id of ["SEC-001", "SEC-002", "DB-001", "TST-003", "OPS-003", "AGT-002", "MEM-009"]) {
    assert.ok(p0.has(id), `${id} should be P0`);
  }
});

test("design rule ids from the previous standard are preserved", () => {
  const ids = new Set(rules.map((r) => r.id));
  for (const id of ["A11Y-001", "UX-007", "UI-004", "CMP-005", "STATE-002", "DS-001"]) {
    assert.ok(ids.has(id), `${id} must survive the consolidation`);
  }
});
