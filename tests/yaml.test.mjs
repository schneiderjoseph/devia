import { test } from "node:test";
import assert from "node:assert/strict";
import { parseYaml, parseFrontmatter } from "../src/lib/yaml.mjs";

test("parses scalars, booleans and numbers", () => {
  const y = parseYaml("name: devia\nactive: true\ncount: 12\nempty:\n");
  assert.equal(y.name, "devia");
  assert.equal(y.active, true);
  assert.equal(y.count, 12);
  assert.equal(y.empty, null);
});

test("parses lists and inline empty lists", () => {
  const y = parseYaml("source:\n  - WCAG-2.2\n  - NN/g\nsuccess_criteria:\n  []\n");
  assert.deepEqual(y.source, ["WCAG-2.2", "NN/g"]);
  assert.deepEqual(y.success_criteria, []);
});

test("parses nested mappings", () => {
  const y = parseYaml("validation:\n  automated: false\n  manual: true\n");
  assert.deepEqual(y.validation, { automated: false, manual: true });
});

test("folds block scalars", () => {
  const y = parseYaml("requirement: >\n  One line\n  and another.\nafter: x\n");
  assert.equal(y.requirement, "One line and another.");
  assert.equal(y.after, "x");
});

test("keeps literal block scalars", () => {
  const y = parseYaml("body: |\n  line one\n  line two\n");
  assert.equal(y.body, "line one\nline two");
});

test("ignores comments", () => {
  const y = parseYaml("# a comment\nkey: value # trailing\n");
  assert.equal(y.key, "value");
});

test("parses an impact map", () => {
  const y = parseYaml(
    'version: 1\nimpacts:\n  new_endpoint:        ["02_SURFACES.md"]\n  new_table:           ["03_DATA_MODEL.md", "docs/DB.md"]\n'
  );
  assert.equal(y.version, 1);
  assert.deepEqual(y.impacts.new_endpoint, ["02_SURFACES.md"]);
  assert.equal(y.impacts.new_table.length, 2);
});

test("splits frontmatter from the body", () => {
  const { data, body } = parseFrontmatter("---\nid: SEC-001\n---\n\n# SEC-001\n\ntext\n");
  assert.equal(data.id, "SEC-001");
  assert.match(body, /# SEC-001/);
});

test("reports unclosed frontmatter instead of guessing", () => {
  const { data, error } = parseFrontmatter("---\nid: X\n");
  assert.equal(data, null);
  assert.equal(error, "unclosed frontmatter");
});

test("a document without frontmatter is all body", () => {
  const { data, body } = parseFrontmatter("# just markdown\n");
  assert.equal(data, null);
  assert.match(body, /just markdown/);
});
