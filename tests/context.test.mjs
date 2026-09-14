import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { packageRoot } from "../src/lib/fs.mjs";
import {
  buildCorpus,
  classify,
  select,
  render,
  routeDomains,
  terms,
  budgetFor,
  DEFAULT_BUDGET,
} from "../src/lib/context.mjs";

const bin = path.join(packageRoot, "bin", "devia.mjs");
const root = packageRoot;
const deviaDir = path.join(root, ".devia");

const { FORCE_COLOR, ...cleanEnv } = process.env;

function devia(args, cwd, { allowFailure = false } = {}) {
  const options = { cwd, encoding: "utf8", env: { ...cleanEnv, NO_COLOR: "1" } };
  try {
    return { code: 0, out: execFileSync(process.execPath, [bin, ...args], options) };
  } catch (e) {
    if (!allowFailure) throw e;
    return { code: e.status ?? 1, out: e.stdout || "" };
  }
}

function run(task, { files = [], target = 4000, domains = [], mode = "advisory", changeTypes = [] } = {}) {
  const corpus = buildCorpus({ root, deviaDir });
  const routed = classify(corpus, { task, files, domains, changeTypes });
  return { ...select(corpus, { target, mode }), routed, corpus };
}

const ids = (selection) => new Set(selection.included.map((i) => i.id));

test("task words route to the domains that own them", () => {
  const d = routeDomains("add a migration for the orders table", []);
  assert.ok(d.has("database"));
  assert.ok(!d.has("accessibility"), "a schema change is not a screen");
});

test("a changed path routes even when the words do not", () => {
  const d = routeDomains("tidy this up", ["src/components/Button.tsx"]);
  assert.ok(d.has("ui"));
  assert.ok(d.has("accessibility"));
});

// Routing on the words a task happens to use is not routing on what the task is. A write
// endpoint is an authorization surface whether or not anyone typed "authorization".
test("an endpoint implies the authorization surface it is", () => {
  const d = routeDomains("add POST /api/orders", ["src/api/orders.ts"]);
  assert.ok(d.has("api"));
  assert.ok(d.has("security"), "api must imply security");
  assert.ok(
    [...d.get("security")].some((why) => /implied by api/.test(why)),
    "and must say why"
  );
});

test("plural and singular meet", () => {
  const t = terms("add the orders table");
  assert.ok(t.has("orders") && t.has("order"));
});

test("irrelevant domains are excluded, with a reason", () => {
  const s = run("add a migration for the orders table", { files: ["migrations/1.sql"] });
  const excluded = s.excluded.find((i) => i.id === "A11Y-006");
  assert.ok(excluded, "a screen rule has no business in a schema change");
  assert.equal(excluded.reason, "not relevant");
  assert.match(excluded.why[0], /domain accessibility is not in scope/);
});

test("every selected item can say why it is there", () => {
  const s = run("add POST /api/orders", { files: ["src/api/orders.ts"] });
  for (const item of s.included) {
    assert.ok(item.why.length > 0, `${item.id} was selected with no reason`);
  }
});

// The whole safety constraint, stated as a test: a budget may cut, and it may never cut this.
test("a blocking rule survives a budget far too small to hold it", () => {
  const tiny = run("add POST /api/orders", { files: ["src/api/orders.ts"], target: 1 });
  assert.equal(tiny.overrun, true, "an impossible budget must be reported as an overrun");
  for (const id of ["SEC-001", "SEC-003", "AGT-004", "MEM-009"]) {
    assert.ok(ids(tiny).has(id), `${id} must survive a budget of 1`);
  }
  assert.ok(tiny.spent > 1, "the overrun is real, not a rounding of the report");
});

test("the blocking set is identical at every budget", () => {
  const task = "add POST /api/orders";
  const files = ["src/api/orders.ts"];
  const blocking = (budget) =>
    [...ids(run(task, { files, target: budget }))]
      .filter((id) => /^[A-Z]+-\d+$/.test(id))
      .sort();
  const small = run(task, { files, target: 1 }).included.filter((i) => i.tier === "T0");
  const large = run(task, { files, target: 100000 }).included.filter((i) => i.tier === "T0");
  assert.deepEqual(
    small.map((i) => i.id).sort(),
    large.map((i) => i.id).sort(),
    "the budget must not decide what blocks"
  );
  assert.ok(blocking(100000).length > blocking(1).length, "a larger budget still adds more");
});

test("a larger budget adds items and never removes one", () => {
  const task = "build the empty state for the orders screen";
  const files = ["src/components/Orders.tsx"];
  const small = ids(run(task, { files, target: 1500 }));
  const large = ids(run(task, { files, target: 8000 }));
  for (const id of small) {
    assert.ok(large.has(id), `${id} was in the small selection and vanished from the large one`);
  }
  assert.ok(large.size > small.size);
});

test("the project's own never/always lines are never budget-evicted", () => {
  const tiny = run("anything at all", { target: 1 });
  const lines = [...ids(tiny)].filter((id) => id.startsWith("10_NEVER_ALWAYS.md#"));
  assert.ok(lines.length > 5, "this repository has earned more than five of them");
  assert.deepEqual(
    tiny.excluded.filter((i) => i.id.startsWith("10_NEVER_ALWAYS.md#")),
    [],
    "a line this project earned is not a candidate for eviction"
  );
});

// --- budget semantics ------------------------------------------------------------------------
//
// Three numbers, kept apart. Reporting only the target and the selection made a stated design
// ("a mandatory item is never evicted") read as a broken promise.

test("target, mandatory floor and selected are reported separately", () => {
  const s = run("add POST /api/orders", { files: ["src/api/orders.ts"], target: 200 });
  assert.equal(s.target, 200);
  assert.ok(s.floor > s.target, "this corpus cannot hold its mandatory items in 200 tokens");
  assert.equal(s.spent, s.floor, "nothing optional fits once the floor is over the target");
  assert.equal(s.status, "over");
  assert.equal(s.compliant, false, "advisory does not pretend to comply");
});

test("advisory keeps every mandatory item whole, whatever the target", () => {
  const s = run("add POST /api/orders", { files: ["src/api/orders.ts"], target: 1, mode: "advisory" });
  assert.equal(s.status, "over");
  assert.ok(s.included.every((i) => i.level === "full"), "advisory never degrades a form");
  assert.ok(ids(s).has("SEC-001"));
});

// The promise the word "strict" makes. It is the one the first version quietly broke.
test("strict never exceeds its target", () => {
  for (const target of [300, 600, 1200, 2400, 6000]) {
    const s = run("add POST /api/orders", { files: ["src/api/orders.ts"], target, mode: "strict" });
    assert.ok(
      s.spent <= target,
      `strict selected ${s.spent} against a target of ${target} (${s.status})`
    );
    assert.equal(s.compliant, true);
  }
});

test("strict compresses a mandatory item rather than dropping it", () => {
  const s = run("add POST /api/orders", { files: ["src/api/orders.ts"], target: 600, mode: "strict" });
  assert.equal(s.status, "degraded");
  // Still present, still named — the floor compresses, it does not disappear.
  for (const id of ["SEC-001", "SEC-003", "AGT-004", "MEM-009"]) {
    assert.ok(ids(s).has(id), `${id} must survive compression`);
  }
  assert.ok(s.degraded.length, "what was given up is reported");
  assert.ok(s.included.some((i) => i.level !== "full"), "something actually shrank");
});

// Degrading everything and then spending the freed tokens on optional rules at full text is
// precisely backwards, and is what the first implementation did.
test("strict degrades only as far as it has to", () => {
  const tight = run("add POST /api/orders", { files: ["src/api/orders.ts"], target: 600, mode: "strict" });
  const loose = run("add POST /api/orders", { files: ["src/api/orders.ts"], target: 2400, mode: "strict" });
  const shrunk = (s) => s.included.filter((i) => i.level !== "full").length;
  assert.ok(shrunk(loose) < shrunk(tight), "a larger target must give more text back");

  const ample = run("add POST /api/orders", { files: ["src/api/orders.ts"], target: 100000, mode: "strict" });
  assert.equal(ample.status, "within");
  assert.equal(shrunk(ample), 0, "an ample target degrades nothing at all");
});

test("a target too small even for identifiers is impossible, not exceeded", () => {
  const s = run("add POST /api/orders", { files: ["src/api/orders.ts"], target: 20, mode: "strict" });
  assert.equal(s.status, "impossible");
  assert.ok(s.floor > 20, "and it says what the smallest possible floor costs");
});

test("a compressed rule still tells the agent where to read it", () => {
  const s = run("add POST /api/orders", { files: ["src/api/orders.ts"], target: 400, mode: "strict" });
  const text = render(s, { task: "add POST /api/orders" });
  assert.match(text, /devia rules --id/, "a reference must say how to expand it");
  assert.match(text, /mandatory floor/, "the three numbers travel with the context");
});

// --- impact-map routing (AGT-013, D12) ---------------------------------------------------------
//
// The impact map is the one routing table the project wrote, in the project's own vocabulary.

test("a change type routes the domains of the memory files it declares", () => {
  // Nothing in this sentence is a security keyword. The project's own impact map says a
  // permission change updates 04_PERMISSIONS.md, and that file speaks for security.
  const s = run("record a permission_change for the maintainer", { target: 100000 });
  const why = [...s.routed.domains.get("security") || []];
  assert.ok(why.some((w) => /permission_change updates 04_PERMISSIONS\.md/.test(w)), why.join("; "));
  assert.ok(ids(s).has("SEC-001"));
});

test("the memory files a change type names are promoted, and say why", () => {
  const s = run("add a new endpoint", { target: 100000 });
  const section = s.included.find((i) => i.kind === "memory" && i.id.startsWith("02_SURFACES.md#"));
  assert.ok(section, "the file the impact map names must be delivered");
  assert.ok(section.why.some((w) => /impact map says this change updates 02_SURFACES\.md/.test(w)));
});

test("--type declares the change explicitly", () => {
  const s = run("tidy things up", { target: 100000, changeTypes: ["permission_change"] });
  assert.ok(s.routed.changeTypes.includes("permission_change"));
  const impact = s.included.find((i) => i.kind === "impact" && i.id === "permission_change");
  assert.ok(impact.why.some((w) => /--type/.test(w)));
});

test("one shared word does not make a task a change type", () => {
  // `state_machine_change` shares "state" with this task and nothing else.
  const s = run("fix the empty state on the orders screen", { target: 100000 });
  assert.ok(!s.routed.changeTypes.includes("state_machine_change"), s.routed.changeTypes.join(", "));
});

// AGT-013: what devia verifies itself is cited; what only a human can check is stated in full.
test("a rule a devia gate blocks on is cited, not recited", () => {
  const s = run("initialise the memory", { target: 100000 });
  const compact = s.corpus.find((i) => i.id === "AGT-002");
  assert.equal(compact.compacted, true);
  assert.match(compact.text, /devia check/);
  assert.ok(compact.tokens < compact.rawTokens, "citing must actually cost less");
});

test("a P0 rule whose only gate warns keeps its full text", () => {
  // MEM-009 is P0; MEM-FILLED, the gate that touches it, is P1. Compacting it would swap a
  // blocking obligation for a gate that lets the change through.
  const s = run("change the architecture", { target: 100000 });
  const rule = s.corpus.find((i) => i.id === "MEM-009");
  assert.equal(rule.compacted, false);
  assert.equal(rule.text, rule.full);
});

test("the impact map duty for the change type is included", () => {
  const s = run("add a new endpoint to the CLI", { target: 100000 });
  const impact = s.included.find((i) => i.kind === "impact" && i.id === "new_endpoint");
  assert.ok(impact, "a task that is a known change type carries its MEM-009 duty");
  assert.match(impact.text, /02_SURFACES\.md/);
  assert.equal(impact.tier, "T0");
});

test("an unrelated change type is not included", () => {
  const s = run("add a new endpoint to the CLI", { target: 100000 });
  assert.ok(!ids(s).has("design_token"));
});

test("the selection is smaller than the corpus it came from", () => {
  const s = run("fix a typo in the readme", { target: DEFAULT_BUDGET });
  assert.ok(s.spent < s.raw / 4, `${s.spent} of ${s.raw} is not a reduction worth the name`);
});

test("the rendered context carries every selected item", () => {
  const s = run("add POST /api/orders", { files: ["src/api/orders.ts"], target: 4000 });
  const text = render(s, { task: "add POST /api/orders" });
  for (const item of s.included.slice(0, 20)) {
    assert.ok(text.includes(item.text.split("\n")[0]), `${item.id} is missing from the render`);
  }
});

test("--domain forces a domain the words did not reach", () => {
  const s = run("tidy this up", { target: 100000, domains: ["database"] });
  assert.ok(ids(s).has("DB-001"));
  const item = s.included.find((i) => i.id === "DB-001");
  assert.ok(item.why.some((w) => /--domain/.test(w)));
});

test("the target and the mode come from devia.json, and degrade to the defaults", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "devia-budget-"));
  const cfg = path.join(dir, "devia.json");
  const write = (context) => fs.writeFileSync(cfg, JSON.stringify({ context }));
  try {
    assert.deepEqual(budgetFor(dir, {}), { target: DEFAULT_BUDGET, mode: "advisory" });

    write({ budget: 777, mode: "strict" });
    assert.deepEqual(budgetFor(dir, {}), { target: 777, mode: "strict" });
    assert.equal(budgetFor(dir, { budget: "350" }).target, 350, "a flag beats the config");
    assert.equal(budgetFor(dir, { mode: "advisory" }).mode, "advisory");
    assert.equal(budgetFor(dir, { strict: true }).mode, "strict");

    // The first shipped spelling still works: an adopter who wrote it keeps working untouched.
    write({ maxTokens: 999 });
    assert.equal(budgetFor(dir, {}).target, 999, "maxTokens is still honoured");

    write({ budget: "nonsense", mode: "whatever" });
    assert.deepEqual(
      budgetFor(dir, {}),
      { target: DEFAULT_BUDGET, mode: "advisory" },
      "a bad value degrades, never throws"
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// --- through the binary -------------------------------------------------------------------

test("devia context reports its accounting in json", () => {
  const report = JSON.parse(devia(["context", "add POST /api/orders", "--json", "--root", root], root).out);
  assert.equal(report.ok, true);
  assert.ok(report.context.raw_tokens > report.context.selected_tokens);
  assert.ok(report.context.reduction_pct > 50);
  assert.ok(report.domains.some((d) => d.domain === "security"));
  assert.ok(report.included.every((i) => i.why.length > 0));
});

test("devia context --full is the baseline the reduction is measured against", () => {
  const full = JSON.parse(devia(["context", "--full", "--json", "--root", root], root).out);
  const optimised = JSON.parse(devia(["context", "add POST /api/orders", "--json", "--root", root], root).out);
  assert.equal(full.tokens, optimised.context.raw_tokens, "both must report the same corpus");
  assert.ok(full.text.length > 10000);
});

test("devia context refuses a repository with no memory", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "devia-nomem-"));
  try {
    const res = devia(["context", "anything", "--root", dir], dir, { allowFailure: true });
    assert.equal(res.code, 1);
    assert.match(res.out, /no \.devia/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("devia context --explain names what it withheld and why", () => {
  const out = devia(["context", "fix a typo", "--budget", "700", "--explain", "--root", root], root).out;
  assert.match(out, /Included/);
  assert.match(out, /Not relevant/);
  assert.match(out, /Target|Mandatory floor/);
});

// G11: a target nobody revisits quietly becomes a permanent overrun, so `check` reports it.
test("devia check reports whether the target can hold the mandatory set", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "devia-ctxgate-"));
  try {
    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "app" }));
    devia(["init", "--root", dir, "--no-vendor"], dir);
    const cfg = path.join(dir, ".devia", "devia.json");
    const of = () => {
      const out = devia(["check", "--root", dir, "--json"], dir, { allowFailure: true }).out;
      return JSON.parse(out).results.find((r) => r.id === "CTX-BUDGET");
    };

    const ample = JSON.parse(fs.readFileSync(cfg, "utf8"));
    ample.context = { budget: 100000 };
    fs.writeFileSync(cfg, JSON.stringify(ample, null, 2));
    assert.equal(of().kind, "PASS");
    assert.match(of().detail, /baseline floor \d+ of 100000/);

    // A target no task could ever fit is a finding, not a silent overrun.
    const tiny = { ...ample, context: { budget: 50 } };
    fs.writeFileSync(cfg, JSON.stringify(tiny, null, 2));
    const warned = of();
    assert.equal(warned.kind, "WARN");
    assert.match(warned.detail, /every task starts at \d+ tokens, above the 50 target/);

    // Strict mode answers the same question differently: it compresses rather than overruns.
    const strict = { ...ample, context: { budget: 600, mode: "strict" } };
    fs.writeFileSync(cfg, JSON.stringify(strict, null, 2));
    assert.equal(of().kind, "PASS");
    assert.match(of().detail, /strict: compresses to fit 600/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("the benchmark passes: the saving never costs a blocking rule", () => {
  const out = execFileSync(
    process.execPath,
    [path.join(packageRoot, "scripts", "benchmark-context.mjs"), "--json"],
    { cwd: root, encoding: "utf8", env: { ...cleanEnv, NO_COLOR: "1" } }
  );
  const report = JSON.parse(out);
  assert.equal(report.ok, true);
  for (const row of report.rows) {
    assert.deepEqual(row.missed, [], `${row.scenario} @ ${row.target} lost a blocking rule`);
    assert.deepEqual(row.misrouted, [], `${row.scenario} @ ${row.target} misrouted a rule`);
    // A generous target against a small corpus has little to cut, and pretending otherwise
    // would be a claim about the tool rather than a measurement. The saving is only asserted
    // where the target actually binds.
    assert.ok(row.reduction_pct >= 0, "a selection is never larger than the corpus it came from");
    if (row.target < row.raw_tokens / 2) {
      assert.ok(
        row.reduction_pct > 50,
        `${row.scenario} @ ${row.target} (${row.mode}) cut only ${row.reduction_pct}%`
      );
    }
    if (row.mode === "strict") {
      assert.ok(
        row.selected_tokens <= row.target,
        `strict must never exceed: ${row.selected_tokens} > ${row.target}`
      );
    }
    // The only reason a run may exceed its target is the mandatory floor. An over-target run
    // that also carries optional context would mean the target stopped meaning anything.
    if (row.selected_tokens > row.target) {
      assert.equal(
        row.selected_tokens,
        row.mandatory_floor,
        `${row.scenario} @ ${row.target} went over target carrying optional items`
      );
    }
  }
});
