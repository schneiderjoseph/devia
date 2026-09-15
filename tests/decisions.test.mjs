import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { packageRoot } from "../src/lib/fs.mjs";
import { parseYaml } from "../src/lib/yaml.mjs";
import {
  STATUSES,
  slotsForProfile,
  loadRegister,
  slotIssues,
  registerIssues,
  countByStatus,
  blockingPending,
  missingAssets,
  stackDrift,
  majorOf,
  renderSlot,
  upsertSlot,
  yamlScalar,
} from "../src/lib/decisions.mjs";
import { buildCorpus, classify, select, renderDecision } from "../src/lib/context.mjs";

const bin = path.join(packageRoot, "bin", "devia.mjs");
const { FORCE_COLOR, ...cleanEnv } = process.env;

function devia(args, cwd, { allowFailure = false } = {}) {
  const options = { cwd, encoding: "utf8", env: { ...cleanEnv, NO_COLOR: "1" } };
  try {
    return { code: 0, out: execFileSync(process.execPath, [bin, ...args], options), err: "" };
  } catch (e) {
    if (!allowFailure) throw e;
    return { code: e.status ?? 1, out: e.stdout || "", err: e.stderr || "" };
  }
}

function scratch(pkg = { name: "scratch-app", version: "1.0.0" }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "devia-decide-"));
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify(pkg, null, 2));
  return dir;
}

const slot = (over = {}) => ({
  key: "brand.logo",
  group: "brand",
  status: "pending",
  question: "",
  value: "",
  because: "",
  owner: "human",
  to: "",
  bounded_by: "",
  path: "",
  package: "",
  blocks: [],
  decided_at: "",
  note: "",
  ...over,
});

/* ------------------------------------------------------------------- shape */

test("a profile is asked only for decisions it can actually have", () => {
  const cli = slotsForProfile("cli").map((s) => s.key);
  const web = slotsForProfile("web-app").map((s) => s.key);

  assert.ok(cli.includes("stack.language"), "every project owes its runtime");
  assert.ok(!cli.includes("brand.typography"), "a CLI has no typeface to license");
  assert.ok(!cli.includes("discovery.indexing"), "a CLI has nothing to index");
  assert.ok(web.includes("brand.logo") && web.includes("discovery.ai_crawlers"));
  // A register full of not_required teaches the reader to skim it.
  assert.ok(web.length > cli.length);
});

test("the four statuses are the four states, and not_required is one of them", () => {
  assert.deepEqual(STATUSES, ["decided", "pending", "delegated", "not_required"]);
});

/* -------------------------------------------------------------- integrity */

test("a decision recorded without a reason is not a decision", () => {
  const issues = slotIssues(slot({ status: "decided", value: "16.x" }));
  assert.match(issues.join(" "), /because/);
  assert.match(issues.join(" "), /date/);
});

test("delegation without bounds is rejected as absence, not accepted as freedom", () => {
  const issues = slotIssues(slot({ key: "testing.framework", status: "delegated" }));
  assert.equal(issues.length, 1);
  assert.match(issues[0], /DEC-002/);
  assert.equal(
    slotIssues(slot({ status: "delegated", bounded_by: "runs in CI with no network" })).length,
    0
  );
});

test("a pending decision nobody owns is reported", () => {
  assert.match(slotIssues(slot({ owner: "" })).join(" "), /owner/);
  assert.equal(slotIssues(slot()).length, 0);
});

test("not_required needs a reason, or it is indistinguishable from forgotten", () => {
  assert.match(slotIssues(slot({ status: "not_required" })).join(" "), /reason/);
  assert.equal(slotIssues(slot({ status: "not_required", because: "ships no imagery" })).length, 0);
});

test("an unknown status is named rather than silently ignored", () => {
  assert.match(slotIssues(slot({ status: "provided" })).join(" "), /unknown status "provided"/);
});

/* ----------------------------------------------------------------- checks */

test("a pending decision blocks only what the project said it blocks", () => {
  const dir = scratch();
  try {
    fs.mkdirSync(path.join(dir, "app", "marketing"), { recursive: true });
    const open = slot({ key: "design.direction", blocks: ["app/marketing"] });
    const quiet = slot({ key: "brand.logo", blocks: ["app/admin"] });
    const unblocked = slot({ key: "brand.colors" });

    const blocked = blockingPending(dir, [open, quiet, unblocked]);
    assert.equal(blocked.length, 1);
    assert.equal(blocked[0].slot.key, "design.direction");
    assert.deepEqual(blocked[0].built, ["app/marketing"]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("a decided asset that is not in the repository is a failure, not a promise", () => {
  const dir = scratch();
  try {
    const promised = slot({
      status: "decided",
      path: "assets/brand/logo.svg",
      because: "supplied by the client",
      decided_at: "2026-09-14",
    });
    assert.equal(missingAssets(dir, [promised]).length, 1);

    fs.mkdirSync(path.join(dir, "assets", "brand"), { recursive: true });
    fs.writeFileSync(path.join(dir, "assets", "brand", "logo.svg"), "<svg/>");
    assert.equal(missingAssets(dir, [promised]).length, 0);
    // A pending asset promises nothing, so it cannot break this promise.
    assert.equal(missingAssets(dir, [slot({ path: "assets/brand/logo.svg" })]).length, 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("stack drift compares the decision with the manifest, on majors only", () => {
  const decided = slot({
    key: "stack.framework",
    status: "decided",
    value: "16.x",
    package: "next",
    because: "latest stable at initialisation",
    decided_at: "2026-09-14",
  });

  assert.equal(stackDrift([decided], { next: "^16.1.4" }).length, 0, "a patch bump is not drift");
  const drift = stackDrift([decided], { next: "^15.2.0" });
  assert.equal(drift.length, 1);
  assert.equal(drift[0].kind, "drift");
  assert.equal(drift[0].installed, "^15.2.0");

  const absent = stackDrift([decided], {});
  assert.equal(absent[0].kind, "absent", "a pin nothing declares is reported differently");
});

test("majorOf reads a major out of every shape a manifest uses", () => {
  assert.equal(majorOf("16.x"), "16");
  assert.equal(majorOf("^16.1.4"), "16");
  assert.equal(majorOf("~16.0.0-rc.1"), "16");
  assert.equal(majorOf("next"), null);
});

/* ---------------------------------------------------------------- writing */

test("upsertSlot leaves every line it is not editing alone, comments included", () => {
  const before = [
    "# a header somebody wrote",
    "version: 1",
    "",
    "decisions:",
    "  brand.logo:",
    "    status: pending",
    "    owner: human",
    "  stack.framework:",
    "    status: pending",
    "    owner: human",
    "",
  ].join("\n");

  const after = upsertSlot(before, "stack.framework", {
    status: "decided",
    value: "16.x",
    package: "next",
    because: "latest stable at initialisation",
    decided_at: "2026-09-14",
  });

  assert.match(after, /# a header somebody wrote/);
  assert.match(after, /brand\.logo:\n {4}status: pending/);
  const parsed = parseYaml(after);
  assert.equal(parsed.decisions["stack.framework"].value, "16.x");
  assert.equal(parsed.decisions["brand.logo"].status, "pending");
});

test("a new slot is inserted in key order, so a diff shows one block and not a reshuffle", () => {
  const before = "version: 1\n\ndecisions:\n  brand.logo:\n    status: pending\n  stack.language:\n    status: pending\n";
  const after = upsertSlot(before, "design.direction", { status: "pending", owner: "human" });
  const keys = after.split("\n").filter((l) => /^ {2}\S+:$/.test(l)).map((l) => l.trim());
  assert.deepEqual(keys, ["brand.logo:", "design.direction:", "stack.language:"]);
});

test("a value that would parse as something else is quoted on the way out", () => {
  assert.equal(yamlScalar("16.x"), "16.x");
  assert.equal(yamlScalar("true"), '"true"');
  assert.equal(yamlScalar("16"), '"16"');
  assert.match(yamlScalar("a: b"), /^".*"$/);
  const text = upsertSlot("decisions:\n", "x.y", { status: "decided", value: "a: b # not a comment" });
  assert.equal(parseYaml(text).decisions["x.y"].value, "a: b # not a comment");
});

test("renderSlot writes only the fields that carry something", () => {
  const out = renderSlot("brand.logo", { status: "pending", owner: "human", value: "", blocks: [] });
  assert.equal(out, "  brand.logo:\n    status: pending\n    owner: human");
});

/* ----------------------------------------------------------------- the CLI */

test("init seeds a register from the profile, and every slot starts pending", () => {
  const dir = scratch({ name: "web", dependencies: { next: "^15.2.0" } });
  try {
    devia(["init", "--root", dir, "--no-agents"], dir);
    const register = loadRegister(path.join(dir, ".devia"));
    assert.ok(register.exists);
    assert.equal(registerIssues(register).length, 0, "a seeded register is valid");
    const counts = countByStatus(register.slots);
    assert.equal(counts.decided, 0);
    assert.equal(counts.pending, register.slots.length);
    assert.ok(register.slots.some((s) => s.key === "discovery.ai_crawlers"));
    // The profile that owes a discovery file gets one; the core set never carries it.
    assert.ok(fs.existsSync(path.join(dir, ".devia", "08_DISCOVERY.md")));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("a CLI profile is not given a discovery file to fill with placeholders", () => {
  const dir = scratch({ name: "tool", bin: { tool: "bin/tool.mjs" } });
  try {
    devia(["init", "--root", dir, "--no-agents"], dir);
    assert.ok(!fs.existsSync(path.join(dir, ".devia", "08_DISCOVERY.md")));
    // And validate does not then ask for the file the profile was never given.
    const res = devia(["validate", "--root", dir, "--json"], dir, { allowFailure: true });
    const report = JSON.parse(res.out);
    assert.equal(report.ok, true, JSON.stringify(report.results.filter((r) => r.kind === "FAIL")));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("init does not regenerate a register that already holds rulings", () => {
  const dir = scratch();
  try {
    devia(["init", "--root", dir, "--no-agents"], dir);
    devia(
      ["decide", "set", "stack.language", "Node.js 20", "--because", "the engines field", "--root", dir],
      dir
    );
    devia(["init", "--root", dir, "--no-agents"], dir);
    const register = loadRegister(path.join(dir, ".devia"));
    assert.equal(register.slots.find((s) => s.key === "stack.language").status, "decided");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("set refuses a ruling with no reason, and delegate refuses one with no bounds", () => {
  const dir = scratch();
  try {
    devia(["init", "--root", dir, "--no-agents"], dir);

    const noReason = devia(["decide", "set", "ops.hosting", "Fly.io", "--root", dir], dir, {
      allowFailure: true,
    });
    assert.equal(noReason.code, 2);
    assert.match(noReason.out, /--because/);

    const noBounds = devia(["decide", "delegate", "testing.framework", "--root", dir], dir, {
      allowFailure: true,
    });
    assert.equal(noBounds.code, 2);
    assert.match(noBounds.out, /DEC-002/);

    // Neither refusal wrote anything.
    const register = loadRegister(path.join(dir, ".devia"));
    assert.equal(register.slots.find((s) => s.key === "ops.hosting").status, "pending");
    assert.equal(register.slots.find((s) => s.key === "testing.framework").status, "pending");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("there is no verb that deletes a slot — drop records a ruling instead", () => {
  const dir = scratch();
  try {
    devia(["init", "--root", dir, "--no-agents"], dir);
    devia(
      ["decide", "drop", "stack.data_store", "--because", "state is the filesystem", "--root", dir],
      dir
    );
    const register = loadRegister(path.join(dir, ".devia"));
    const dropped = register.slots.find((s) => s.key === "stack.data_store");
    assert.equal(dropped.status, "not_required");
    assert.match(dropped.because, /filesystem/);
    assert.ok(dropped.decided_at, "a ruling is dated even when it rules something out");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("check blocks on a pending decision the project declared blocking, and only then", () => {
  const dir = scratch({ name: "web", dependencies: { next: "^15.2.0" } });
  try {
    devia(["init", "--root", dir, "--no-agents"], dir);

    const before = JSON.parse(devia(["check", "--root", dir, "--json"], dir, { allowFailure: true }).out);
    assert.ok(
      !before.blocking.includes("DEC-BLOCKING"),
      "17 pending decisions on a fresh register must not block anything"
    );

    fs.mkdirSync(path.join(dir, "app", "marketing"), { recursive: true });
    devia(["decide", "open", "design.direction", "--blocks", "app/marketing", "--root", dir], dir);

    const after = JSON.parse(devia(["check", "--root", dir, "--json"], dir, { allowFailure: true }).out);
    assert.ok(after.blocking.includes("DEC-BLOCKING"));
    const gate = after.results.find((r) => r.id === "DEC-BLOCKING");
    assert.match(gate.detail, /design\.direction is pending and app\/marketing exists/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("check reports the decision the manifest contradicts", () => {
  const dir = scratch({ name: "web", dependencies: { next: "^15.2.0" } });
  try {
    devia(["init", "--root", dir, "--no-agents"], dir);
    devia(
      ["decide", "set", "stack.framework", "16.x", "--package", "next", "--because", "latest stable", "--root", dir],
      dir
    );
    const report = JSON.parse(devia(["check", "--root", dir, "--json"], dir, { allowFailure: true }).out);
    const gate = report.results.find((r) => r.id === "DEC-STACK");
    assert.equal(gate.kind, "FAIL");
    assert.match(gate.detail, /decided 16\.x, manifest says \^15\.2\.0/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("a repository with no register is skipped, not failed", () => {
  const dir = scratch();
  try {
    devia(["init", "--root", dir, "--no-agents"], dir);
    fs.rmSync(path.join(dir, ".devia", "decisions.yaml"));
    const report = JSON.parse(devia(["check", "--root", dir, "--json"], dir, { allowFailure: true }).out);
    for (const id of ["DEC-BLOCKING", "DEC-REGISTER", "DEC-ASSETS", "DEC-STACK", "DEC-PENDING"]) {
      assert.equal(report.results.find((r) => r.id === id).kind, "SKIP", id);
    }
    assert.equal(report.blocking.includes("DEC-BLOCKING"), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

/* --------------------------------------------------------------- context */

test("a pending decision the task touches is mandatory context, and a budget cannot evict it", () => {
  const dir = scratch({ name: "web", dependencies: { next: "^15.2.0" } });
  try {
    devia(["init", "--root", dir, "--no-agents"], dir);
    const deviaDir = path.join(dir, ".devia");

    const corpus = buildCorpus({ root: dir, deviaDir });
    classify(corpus, { task: "style the marketing hero", files: ["app/marketing/page.tsx"] });

    const direction = corpus.find((i) => i.kind === "decision" && i.id === "design.direction");
    assert.equal(direction.tier, "T0", "the decision this task would have invented is blocking");

    // Even at a target far below the floor, advisory mode keeps it.
    const selection = select(corpus, { target: 50, mode: "advisory" });
    assert.ok(selection.included.some((i) => i.id === "design.direction"));
    assert.equal(selection.status, "over");

    // And strict mode compresses it to its name rather than dropping it.
    const compressed = select(corpus, { target: 50, mode: "strict" });
    const kept = compressed.included.find((i) => i.id === "design.direction");
    assert.ok(kept, "a mandatory decision is never dropped, only shortened");
    assert.match(kept.level === "short" ? kept.short : kept.text, /design\.direction/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("a decision unrelated to the task does not ride along in the blocking tier", () => {
  const dir = scratch({ name: "web", dependencies: { next: "^15.2.0" } });
  try {
    devia(["init", "--root", dir, "--no-agents"], dir);
    const deviaDir = path.join(dir, ".devia");
    const corpus = buildCorpus({ root: dir, deviaDir });
    classify(corpus, { task: "add a database migration for the orders table", files: ["migrations/004.sql"] });

    const brand = corpus.find((i) => i.kind === "decision" && i.id === "brand.typography");
    assert.notEqual(brand.tier, "T0");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("a pending decision says what not to do, because that is all it has to say", () => {
  const text = renderDecision(slot({ key: "design.direction", question: "The visual direction" }));
  assert.match(text, /pending/);
  assert.match(text, /Do not encode an answer/);
  assert.match(text, /DEC-001/);

  const ruled = renderDecision(
    slot({ status: "not_required", because: "this product ships no imagery" })
  );
  assert.match(ruled, /Do not add one/);
});
