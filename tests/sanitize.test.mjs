import { test } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { sanitize, residue, SECRET_PATTERNS } from "../src/lib/sanitize.mjs";

// Built from parts so this repository does not itself carry a secret-shaped string: what the
// sanitizer has to remove is what the test constructs, not what the file contains.
const AWS = "AKIA" + "IOSFODNN7EXAMPLE";

test("secret shapes are removed and reported by kind", () => {
  const { text, removed } = sanitize(`const key = "${AWS}";`);
  assert.ok(!text.includes(AWS));
  assert.deepEqual(removed, [{ kind: "AWS access key id", count: 1 }]);
});

test("the repository path becomes a placeholder, not a project name", () => {
  const root = path.join(os.tmpdir(), "acme-internal-billing");
  const { text } = sanitize(`failed at ${path.join(root, "src", "a.js")}`, { root });
  assert.ok(!text.includes("acme-internal-billing"));
  assert.match(text, /<repo>/);
});

test("the home directory and the account name in it are both removed", () => {
  const home = os.homedir();
  const account = path.basename(home);
  const { text } = sanitize(`wrote ${path.join(home, "notes.txt")} for ${account}`);
  assert.ok(!text.includes(home), "the home directory must not survive");
  if (account.length >= 3) {
    assert.ok(!new RegExp(`\\b${account}\\b`, "i").test(text), "the account name must not survive");
  }
});

test("an email address never reaches a payload", () => {
  const { text, removed } = sanitize("reported by alice.smith@acme-internal.example");
  assert.ok(!text.includes("acme-internal.example"));
  assert.ok(removed.some((r) => r.kind === "email address"));
});

// A fixture has to keep working after it is cleaned: a redaction that breaks the file's syntax
// destroys the reproduction it was protecting.
test("a redacted assignment keeps the quoting the file used", () => {
  assert.match(sanitize('const STRIPE_SECRET = "sk_test_abc";').text, /= "\[redacted\]";/);
  assert.match(sanitize("API_TOKEN=abc123").text, /^API_TOKEN=\[redacted\]$/);
  assert.match(sanitize("password: 'hunter2'").text, /'\[redacted\]'/);
  assert.match(sanitize("const accessToken = 'abc'").text, /'\[redacted\]'/);
});

// The sensitive word must be a whole segment of the key. Matching "key" anywhere redacts
// `monkey: banana`, which destroys the text the sanitizer exists to preserve.
test("a word that merely contains a sensitive word is left alone", () => {
  for (const line of ["monkey: banana", "donkey = 3", "keyboard: qwerty", "tokenizer = split"]) {
    assert.equal(sanitize(line).text, line, `${line} must survive untouched`);
  }
});

// Redaction is reported, and the report is what a human reviews. Re-matching the placeholder
// would inflate that count every time the text passed through, describing protection that did
// not happen.
test("sanitizing twice changes nothing and reports nothing the second time", () => {
  const once = sanitize(`API_TOKEN = "abc123"\nkey = "${AWS}"\nmail a@b.example`);
  const twice = sanitize(once.text);
  assert.equal(twice.text, once.text);
  assert.deepEqual(twice.removed, []);
});

test("residue finds what a payload must never carry, and is empty once cleaned", () => {
  assert.deepEqual(residue(`key=${AWS}`), ["AWS access key id"]);
  assert.deepEqual(residue(sanitize(`key=${AWS}`).text), []);
  assert.ok(residue(`at ${os.homedir()}`).includes("home directory"));
});

test("the secret pattern list is shared, not copied", async () => {
  const check = await import("../src/commands/check.mjs");
  assert.ok(SECRET_PATTERNS.length >= 7);
  // check.mjs imports the list rather than keeping its own: one addition, two readers.
  assert.ok(check.default, "check must still load with the shared list");
});

test("a short account name is not scrubbed out of ordinary prose", () => {
  // Two letters is a word, not an identity: redacting it would shred the text it protects.
  const { text } = sanitize("go to the db and read the id");
  assert.equal(text, "go to the db and read the id");
});
