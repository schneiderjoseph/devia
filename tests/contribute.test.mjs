import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { packageRoot } from "../src/lib/fs.mjs";
import {
  holds,
  verdict,
  stateOf,
  claimHash,
  eligibility,
  missing,
  pluck,
  identityCheck,
  fixtureHash,
  sourceHash,
  evidenceChain,
  reproPath,
  upstream,
  REPRO_CAPS,
} from "../src/lib/contribution.mjs";

const bin = path.join(packageRoot, "bin", "devia.mjs");
const { FORCE_COLOR, ...cleanEnv } = process.env;

function devia(args, cwd, { allowFailure = true, env = {} } = {}) {
  const options = { cwd, encoding: "utf8", env: { ...cleanEnv, NO_COLOR: "1", DEVIA_NO_UPDATE_CHECK: "1", ...env } };
  try {
    return { code: 0, out: execFileSync(process.execPath, [bin, ...args], options), err: "" };
  } catch (e) {
    if (!allowFailure) throw e;
    return { code: e.status ?? 1, out: e.stdout || "", err: e.stderr || "" };
  }
}

/** A repository with a memory, a secret and a private-looking name. */
function scratch() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "devia-contrib-"));
  fs.writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify({ name: "acme-internal-billing", version: "1.0.0" }, null, 2)
  );
  fs.mkdirSync(path.join(dir, "src"), { recursive: true });
  fs.writeFileSync(
    path.join(dir, "src", "config.js"),
    `export const awsKey = "AKIA${"IOSFODNN7EXAMPLE"}";\n` +
      `export const owner = "alice@acme-internal.example";\n` +
      `export const API_TOKEN = "live-token-value";\n`
  );
  fs.writeFileSync(path.join(dir, ".env"), "SECRET_TOKEN=hunter2\n");
  devia(["init", "--root", dir, "--no-vendor"], dir, { allowFailure: false });
  return dir;
}

/**
 * The assertion is on the `blocking` array, not on the gate id.
 *
 * A gate id appears in `--json` whether the gate passed or failed, so `matches: "SEC-SECRETS"`
 * would hold on a clean repository too and confirm itself. The blocking list carries only the
 * P0 gates that actually failed, so it distinguishes the two behaviours — which is the whole
 * job of the pair.
 */
const FAILED = '"blocking": \\[[^\\]]*"SEC-SECRETS"';

const OBSERVE = [
  "contribute", "new",
  "--type", "false_positive",
  "--gate", "SEC-SECRETS",
  "--rule", "SEC-002",
  "--summary", "SEC-SECRETS reports a fixture file as a live credential",
  "--expected", "a fixture is not reported as a secret",
  "--actual", "the gate fails and names the fixture",
  "--argv", "check --json",
  "--actual-matches", FAILED,
  "--expect-absent", FAILED,
];

const record = (dir, id = "C1") =>
  JSON.parse(fs.readFileSync(path.join(dir, ".devia", "contributions", id, "record.json"), "utf8"));

// --- the evidence model -----------------------------------------------------------------------

test("a profile that states nothing never holds", () => {
  assert.equal(holds({}, { code: 0, out: "" }), false);
  assert.equal(holds(null, { code: 0, out: "" }), false);
});

test("every stated field must hold, and an unstated one is not an opinion", () => {
  const run = { code: 1, out: "SEC-SECRETS failed" };
  assert.equal(holds({ exit: 1 }, run), true);
  assert.equal(holds({ exit: 1, matches: "SEC-SECRETS" }, run), true);
  assert.equal(holds({ exit: 1, matches: "TST-PRESENT" }, run), false);
  assert.equal(holds({ exit: 0, matches: "SEC-SECRETS" }, run), false);
  assert.equal(holds({ absent: "TST-PRESENT" }, run), true);
});

test("a numeric claim reads a dotted path out of the json body", () => {
  const run = { code: 0, out: JSON.stringify({ context: { selected_tokens: 3900 } }) };
  assert.equal(holds({ metric: "context.selected_tokens", op: ">", value: 1000 }, run), true);
  assert.equal(holds({ metric: "context.selected_tokens", op: "<=", value: 1000 }, run), false);
  assert.equal(holds({ metric: "context.nope", op: ">", value: 1 }, run), false);
  assert.equal(pluck({ a: { b: 2 } }, "a.b"), 2);
  assert.equal(pluck({ a: null }, "a.b.c"), undefined);
});

test("a claim that is not json cannot confirm a numeric assertion", () => {
  const run = { code: 0, out: "not json at all" };
  assert.equal(holds({ metric: "context.selected_tokens", op: ">", value: 1 }, run), false);
});

test("a pattern that does not compile matches nothing instead of throwing", () => {
  assert.equal(holds({ matches: "([unclosed" }, { code: 0, out: "anything" }), false);
});

test("neither profile matching is reported, never rounded to one of them", () => {
  const rec = {
    observation: { argv: ["check"], actual: { exit: 1 }, expected: { exit: 0 } },
  };
  assert.equal(verdict(rec, { code: 1, out: "" }).outcome, "reproduced");
  // "expected", not "fixed": one run cannot tell a fix from a fixture that never failed.
  assert.equal(verdict(rec, { code: 0, out: "" }).outcome, "expected");
  assert.equal(verdict(rec, { code: 2, out: "" }).outcome, "inconclusive");
});

test("two profiles that describe the same behaviour are inconclusive, not a reproduction", () => {
  const rec = {
    observation: { argv: ["check"], actual: { matches: "x" }, expected: { matches: "x" } },
  };
  assert.equal(verdict(rec, { code: 0, out: "x" }).outcome, "inconclusive");
});

// --- the loop, through the binary -------------------------------------------------------------

test("a speculative improvement is not eligible, and says so", () => {
  const dir = scratch();
  try {
    const res = devia(
      ["contribute", "new", "--root", dir, "--type", "feature",
       "--summary", "devia could support monorepo profiles",
       "--expected", "a profile per workspace", "--actual", "one profile per repository"],
      dir
    );
    assert.match(res.out, /incomplete|recorded/);
    // No observation, so it cannot reach `reproduced`, so it cannot be submitted.
    const submit = devia(["contribute", "submit", "C1", "--root", dir], dir);
    assert.equal(submit.code, 1);
    assert.match(submit.out, /missing observation\.argv|not reproduced/);
    assert.match(submit.out, /Not eligible/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("a manual proposal is allowed, and is an issue rather than a pull request", () => {
  const dir = scratch();
  try {
    devia(
      ["contribute", "new", "--root", dir, "--manual", "--type", "feature",
       "--summary", "a profile per workspace would help monorepos",
       "--expected", "one profile per workspace", "--actual", "one profile per repository"],
      dir
    );
    const show = JSON.parse(devia(["contribute", "show", "C1", "--root", dir, "--json"], dir).out);
    assert.equal(show.record.source, "manual");
    assert.equal(show.eligibility.route, "issue");
    assert.ok(show.eligibility.notes.some((n) => /never to a pull request/.test(n)));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("a candidate is reproduced because devia reproduced it, not because it says so", () => {
  const dir = scratch();
  try {
    devia([...OBSERVE, "--root", dir], dir);
    assert.equal(stateOf(record(dir)), "observed");

    // Verification is refused until there is somewhere to run it.
    const early = devia(["contribute", "verify", "C1", "--root", dir], dir);
    assert.equal(early.code, 1);
    assert.match(early.out, /no reproduction/);

    devia(["contribute", "repro", "C1", "--root", dir], dir);
    // The scaffold alone contains no secret, so the expected behaviour is what happens. That is
    // not a fix — devia has never seen this fixture do anything else — so it is rejected.
    const clean = devia(["contribute", "verify", "C1", "--root", dir], dir);
    assert.equal(clean.code, 1);
    assert.match(clean.out, /rejected/);
    assert.match(clean.out, /Make the\s+fixture fail first/);
    assert.equal(stateOf(record(dir)), "rejected");

    // Put the reported behaviour into the fixture, and it reproduces.
    fs.writeFileSync(
      path.join(dir, ".devia", "contributions", "C1", "repro", "fixture.js"),
      `const example = "AKIA${"IOSFODNN7EXAMPLE"}";\n`
    );
    const found = devia(["contribute", "verify", "C1", "--root", dir], dir);
    assert.equal(found.code, 0);
    assert.match(found.out, /reproduced/);
    assert.equal(stateOf(record(dir)), "reproduced");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * A devia checkout that differs from the installed one.
 *
 * `fixed` requires the two runs to disagree about the devia source, so proving it needs a real
 * second devia — not a fixture edited until it passes. This copies what `sourceHash` hashes plus
 * what the process needs to start, and patches one file so the behaviour genuinely changes.
 */
function deviaCopy(patch) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "devia-fork-"));
  const copy = (rel) => {
    const from = path.join(packageRoot, rel);
    if (!fs.existsSync(from)) return;
    fs.cpSync(from, path.join(dir, rel), { recursive: true });
  };
  for (const rel of ["bin", "src", "package.json", "VERSION"]) copy(rel);
  const target = path.join(dir, patch.file);
  fs.writeFileSync(target, patch.edit(fs.readFileSync(target, "utf8")));
  return dir;
}

// `fixed` is two observations that have to be the same experiment: devia saw the problem, then
// devia saw it gone, with the same fixture and a different devia.
test("fixed requires the same fixture and a genuinely different devia", () => {
  const dir = scratch();
  let fork = null;
  try {
    readyCandidate(dir);
    assert.equal(stateOf(record(dir)), "reproduced");

    // The "fix": a devia whose secret scanner no longer carries the pattern the fixture trips.
    fork = deviaCopy({
      file: path.join("src", "lib", "sanitize.mjs"),
      edit: (src) => src.replace('[/AKIA[0-9A-Z]{16}/, "AWS access key id"],', ""),
    });
    assert.notEqual(sourceHash(fork), sourceHash(packageRoot), "the fork must really differ");

    const after = devia(["contribute", "verify", "C1", "--root", dir, "--devia", fork], dir);
    assert.equal(after.code, 0);
    assert.equal(stateOf(record(dir)), "fixed");

    const chain = evidenceChain(record(dir));
    assert.deepEqual(chain.breaks, [], "same fixture, different devia: nothing to object to");
    assert.equal(chain.steps.length, 2);
    assert.equal(chain.steps[0].fixture, chain.steps[1].fixture, "the experiment did not change");
    assert.notEqual(chain.steps[0].devia, chain.steps[1].devia, "devia did");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    if (fork) fs.rmSync(fork, { recursive: true, force: true });
  }
});

// --- the evidence chain (D10) -----------------------------------------------------------------
//
// "It used to fail and now it passes" only means something if both runs used the same fixture
// and a different devia. Without those two digests, editing the fixture reads exactly like
// fixing the tool.

test("each run is bound to the fixture and the devia source that produced it", () => {
  const dir = scratch();
  try {
    readyCandidate(dir);
    const v = record(dir).verification;
    assert.match(v.fixture, /^[0-9a-f]{16}$/, "the fixture is hashed");
    assert.match(v.devia, /^[0-9a-f]{16}$/, "so is the devia that ran it");
    assert.equal(record(dir).reproduced.fixture, v.fixture);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("a hash changes when the thing it hashes changes, and not otherwise", () => {
  const dir = scratch();
  try {
    readyCandidate(dir);
    const repro = path.join(dir, ".devia", "contributions", "C1", "repro");
    const before = fixtureHash(repro);
    assert.equal(fixtureHash(repro), before, "the same tree always hashes the same");

    fs.writeFileSync(path.join(repro, "extra.js"), "// one more file\n");
    assert.notEqual(fixtureHash(repro), before, "an added file must change it");

    assert.equal(sourceHash(packageRoot), sourceHash(packageRoot));
    assert.equal(fixtureHash(path.join(dir, "nowhere")), null);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// The whole point. Editing the fixture until it passes is not a fix, and the record says so
// instead of recording a fix that never happened.
test("a fixture edited between the two runs is not a fix", () => {
  const dir = scratch();
  const fixture = path.join(dir, ".devia", "contributions", "C1", "repro", "fixture.js");
  try {
    readyCandidate(dir);
    assert.equal(stateOf(record(dir)), "reproduced");

    // The behaviour changes, but because the fixture changed — not because devia did.
    fs.writeFileSync(fixture, "const example = 1;\n");
    const after = devia(["contribute", "verify", "C1", "--root", dir], dir);

    assert.equal(stateOf(record(dir)), "reproduced", "it must not be promoted to fixed");
    assert.match(after.out, /evidence chain/);
    assert.match(after.out, /the reproduction changed between the two runs/);

    const chain = evidenceChain(record(dir));
    assert.ok(chain.breaks.length, "the break is stated, not inferred by the reader");

    // And it cannot be submitted as a pull request on that basis.
    const submit = devia(["contribute", "submit", "C1", "--root", dir], dir);
    assert.match(submit.out, /route\s+issue/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("the same fixture and the same devia twice is not a fix either", () => {
  const chain = (over) => {
    const base = {
      id: "C1",
      type: "bug",
      source: "real_usage",
      observation: { argv: ["check"], expected: { exit: 0 }, actual: { exit: 1 } },
    };
    const claim = claimHash(base);
    return evidenceChain({
      ...base,
      reproduced: { claim, fixture: "aaaa", devia: "1111", ran: "2026-09-12" },
      verification: { claim, outcome: "expected", ran: "2026-09-13", ...over },
    });
  };

  assert.ok(
    chain({ fixture: "aaaa", devia: "1111" }).breaks.some((b) => /same devia source/.test(b)),
    "nothing in devia changed between the two runs"
  );
  assert.ok(
    chain({ fixture: "bbbb", devia: "2222" }).breaks.some((b) => /reproduction changed/.test(b)),
    "the experiment was not the same experiment"
  );
  // The one shape that is a fix: same fixture, different devia.
  assert.deepEqual(chain({ fixture: "aaaa", devia: "2222" }).breaks, []);
});

test("a record written before hashing existed is re-verified, not trusted", () => {
  const base = {
    id: "C1",
    type: "bug",
    source: "real_usage",
    observation: { argv: ["check"], expected: { exit: 0 }, actual: { exit: 1 } },
    problem: { summary: "s", expected: "e", actual: "a" },
    devia: { version: "0.7.0" },
  };
  const claim = claimHash(base);
  const legacy = {
    ...base,
    reproduced: { claim, ran: "2026-09-12" },
    verification: { claim, outcome: "expected", ran: "2026-09-13" },
  };
  assert.equal(stateOf(legacy), "reproduced", "an unbound pair is not promoted to fixed");
  assert.ok(evidenceChain(legacy).breaks.some((b) => /predates fixture hashing/.test(b)));
});

test("the published report carries the chain a maintainer can check", () => {
  const dir = scratch();
  try {
    readyCandidate(dir);
    const show = JSON.parse(devia(["contribute", "show", "C1", "--root", dir, "--json"], dir).out);
    assert.match(show.body, /## Evidence chain/);
    assert.match(show.body, /\| reproduced \|/);
    assert.match(show.body, /Fixture \| devia source/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// A verdict belongs to the claim it was made about. Editing the claim afterwards and keeping the
// verdict is exactly how an unreproduced problem would reach a maintainer.
test("editing the claim after verification drops the state back to observed", () => {
  const dir = scratch();
  try {
    devia([...OBSERVE, "--root", dir], dir);
    devia(["contribute", "repro", "C1", "--root", dir], dir);
    fs.writeFileSync(
      path.join(dir, ".devia", "contributions", "C1", "repro", "fixture.js"),
      `const example = "AKIA${"IOSFODNN7EXAMPLE"}";\n`
    );
    devia(["contribute", "verify", "C1", "--root", dir], dir);
    assert.equal(stateOf(record(dir)), "reproduced");

    const file = path.join(dir, ".devia", "contributions", "C1", "record.json");
    const edited = JSON.parse(fs.readFileSync(file, "utf8"));
    edited.observation.actual.matches = "SOMETHING-ELSE";
    fs.writeFileSync(file, JSON.stringify(edited, null, 2));

    assert.equal(stateOf(edited), "observed", "a stale verdict must not survive its claim");
    assert.notEqual(claimHash(edited), edited.verification.claim);
    const submit = devia(["contribute", "submit", "C1", "--root", dir], dir);
    assert.equal(submit.code, 1);
    assert.match(submit.out, /not reproduced/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// --- the privacy boundary ---------------------------------------------------------------------

test("an environment file is refused outright, not sanitized", () => {
  const dir = scratch();
  try {
    devia([...OBSERVE, "--root", dir], dir);
    const res = devia(["contribute", "repro", "C1", "--root", dir, "--include", ".env"], dir);
    assert.equal(res.code, 1);
    assert.match(res.out, /an environment file is never copied/);
    assert.ok(
      !fs.existsSync(path.join(dir, ".devia", "contributions", "C1", "repro", ".env")),
      "nothing from an environment file may reach the fixture"
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("an included file is sanitized on the way in, and the redactions are recorded", () => {
  const dir = scratch();
  try {
    devia([...OBSERVE, "--root", dir], dir);
    devia(["contribute", "repro", "C1", "--root", dir, "--include", "src/config.js"], dir);

    const copied = fs.readFileSync(
      path.join(dir, ".devia", "contributions", "C1", "repro", "config.js"),
      "utf8"
    );
    assert.ok(!copied.includes("AKIA"), "a key must not reach the fixture");
    assert.ok(!copied.includes("acme-internal.example"), "an address must not reach the fixture");
    assert.ok(!copied.includes("live-token-value"), "a token must not reach the fixture");

    const kinds = record(dir).reproduction.included[0].redactions.map((r) => r.kind);
    assert.ok(kinds.includes("AWS access key id"));
    assert.ok(kinds.includes("email address"));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("nothing sensitive survives anywhere in a prepared payload", () => {
  const dir = scratch();
  try {
    devia([...OBSERVE, "--root", dir], dir);
    devia(["contribute", "repro", "C1", "--root", dir, "--include", "src/config.js"], dir);
    devia(["contribute", "submit", "C1", "--root", dir], dir);

    const payload = path.join(dir, ".devia", "contributions", "C1", "payload");
    const seen = [];
    const walk = (d) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p);
        else seen.push(fs.readFileSync(p, "utf8"));
      }
    };
    walk(payload);
    const all = seen.join("\n");
    for (const forbidden of [
      "AKIA",
      "acme-internal.example",
      "live-token-value",
      "hunter2",
      path.basename(dir),
      os.homedir(),
    ]) {
      assert.ok(!all.includes(forbidden), `"${forbidden}" leaked into the payload`);
    }
    assert.ok(all.includes("MANIFEST") || fs.existsSync(path.join(payload, "MANIFEST.md")));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("the manifest names every byte that would be sent", () => {
  const dir = scratch();
  try {
    devia([...OBSERVE, "--root", dir], dir);
    devia(["contribute", "repro", "C1", "--root", dir], dir);
    const show = JSON.parse(devia(["contribute", "show", "C1", "--root", dir, "--json"], dir).out);
    assert.ok(show.payload.length >= 2);
    for (const f of show.payload) {
      assert.ok(f.bytes > 0 && f.sha256.length === 16, `${f.name} is not accounted for`);
    }
    assert.deepEqual(show.residue, [], "a prepared payload must be clean");
    assert.match(show.body, /What is not in this report/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("the report states what was actually redacted, not that something was", () => {
  const dir = scratch();
  try {
    devia([...OBSERVE, "--root", dir], dir);
    devia(["contribute", "repro", "C1", "--root", dir, "--include", "src/config.js"], dir);
    const show = JSON.parse(devia(["contribute", "show", "C1", "--root", dir, "--json"], dir).out);
    assert.match(show.body, /- sanitized: yes — .*AWS access key id/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// --- the remote boundary ----------------------------------------------------------------------

test("nothing is sent without --yes, and the command is shown instead", () => {
  const dir = scratch();
  try {
    devia([...OBSERVE, "--root", dir], dir);
    devia(["contribute", "repro", "C1", "--root", dir], dir);
    fs.writeFileSync(
      path.join(dir, ".devia", "contributions", "C1", "repro", "fixture.js"),
      `const example = "AKIA${"IOSFODNN7EXAMPLE"}";\n`
    );
    devia(["contribute", "verify", "C1", "--root", dir], dir);

    const res = devia(["contribute", "submit", "C1", "--root", dir], dir);
    assert.equal(res.code, 0);
    assert.match(res.out, /gh issue create --repo/);
    assert.match(res.out, /--yes authorises the remote operation/);
    assert.match(res.out, /devia holds no GitHub token/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function readyCandidate(dir) {
  devia([...OBSERVE, "--root", dir], dir);
  devia(["contribute", "repro", "C1", "--root", dir], dir);
  fs.writeFileSync(
    path.join(dir, ".devia", "contributions", "C1", "repro", "fixture.js"),
    `const example = "AKIA${"IOSFODNN7EXAMPLE"}";\n`
  );
  devia(["contribute", "verify", "C1", "--root", dir], dir);
}

function configure(dir, contribution) {
  const file = path.join(dir, ".devia", "devia.json");
  const config = JSON.parse(fs.readFileSync(file, "utf8"));
  config.contribution = contribution;
  fs.writeFileSync(file, JSON.stringify(config, null, 2));
}

test("--yes without a declared identity sends nothing", () => {
  const dir = scratch();
  try {
    readyCandidate(dir);
    const res = devia(["contribute", "submit", "C1", "--root", dir, "--yes"], dir);
    assert.equal(res.code, 1);
    assert.match(res.out, /no contribution identity/);
    assert.match(res.out, /Nothing was sent/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// The maintainer account is the one identity a contribution may never wear.
test("the maintainer account is refused as a contribution identity", () => {
  const dir = scratch();
  try {
    readyCandidate(dir);
    configure(dir, { enabled: true, identity: upstream().owner });
    const res = devia(["contribute", "submit", "C1", "--root", dir, "--yes"], dir);
    assert.equal(res.code, 1);
    assert.match(res.out, /maintainer account/);
    assert.match(res.out, /Nothing was sent/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("gh being absent or authenticated as someone else stops the upload", () => {
  const dir = scratch();
  try {
    readyCandidate(dir);
    configure(dir, { enabled: true, identity: "some-contributor-account" });
    // PATH is emptied so `gh` cannot resolve: devia must report that, never work around it.
    const res = devia(["contribute", "submit", "C1", "--root", dir, "--yes"], dir, {
      env: { PATH: path.join(dir, "nothing-here"), Path: path.join(dir, "nothing-here") },
    });
    assert.equal(res.code, 1);
    assert.match(res.out, /gh is not installed|gh is not authenticated|authenticated as/);
    assert.match(res.out, /Nothing was sent/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// A record is a file a person can edit. "../../.." would turn a reproduction into a directory
// read somewhere else entirely, so the name is validated rather than trusted.
test("a hand-edited reproduction path cannot escape the candidate's directory", () => {
  const deviaDir = path.join(packageRoot, ".devia");
  const base = { id: "C1", reproduction: { path: "repro" } };
  assert.ok(reproPath(deviaDir, base).endsWith(path.join("C1", "repro")));

  for (const bad of ["../../..", "../../../etc", "a/b", ".", "", null, 42]) {
    assert.equal(
      reproPath(deviaDir, { id: "C1", reproduction: { path: bad } }),
      null,
      `${JSON.stringify(bad)} must not resolve to a directory`
    );
  }
});

test("a file too large for the whole fixture is refused, not truncated", () => {
  const dir = scratch();
  try {
    devia([...OBSERVE, "--root", dir], dir);
    fs.writeFileSync(path.join(dir, "huge.txt"), "x".repeat(REPRO_CAPS.bytes + 1));
    const res = devia(["contribute", "repro", "C1", "--root", dir, "--include", "huge.txt"], dir);
    assert.equal(res.code, 1);
    assert.match(res.out, /too large/);
    assert.ok(!fs.existsSync(path.join(dir, ".devia", "contributions", "C1", "repro", "huge.txt")));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// The identity decision is a pure function so every branch is reachable without a GitHub CLI
// standing in front of it — including the one that matters most, an account devia could not read.
test("publishing is refused by default and allowed only on an exact match", () => {
  const owner = "maintainer-account";
  const as = (account) => () => ({ ok: true, account });

  const cases = [
    [{ identity: null, lookup: as("anyone") }, /no contribution identity/],
    [{ identity: owner, lookup: as(owner) }, /maintainer account/],
    [{ identity: "me", lookup: () => ({ ok: false, missing: true }) }, /not installed/],
    [{ identity: "me", lookup: () => ({ ok: false }) }, /not authenticated/],
    // gh answered, but devia could not tell who it answered as. Proceeding here would publish
    // under whoever gh happens to be.
    [{ identity: "me", lookup: as(null) }, /could not read which account/],
    [{ identity: "me", lookup: as("someone-else") }, /authenticated as someone-else/],
  ];
  for (const [input, expected] of cases) {
    const res = identityCheck({ owner, ...input });
    assert.equal(res.ok, false, `${JSON.stringify(input.identity)} must be refused`);
    assert.match(res.why, expected);
  }

  const allowed = identityCheck({ identity: "Me", owner, lookup: as("me") });
  assert.equal(allowed.ok, true, "a case-insensitive exact match is the only way through");
});

test("a repository with no declared identity never asks GitHub who is logged in", () => {
  let asked = false;
  identityCheck({
    identity: null,
    owner: "maintainer-account",
    lookup: () => {
      asked = true;
      return { ok: true, account: "someone" };
    },
  });
  assert.equal(asked, false, "the local half is settled before anything runs `gh`");
});

test("a security defect is routed to the private path, never to an issue", () => {
  const dir = scratch();
  try {
    devia(
      ["contribute", "new", "--root", dir, "--type", "security",
       "--summary", "the scanner can be made to skip a file",
       "--expected", "every file is scanned", "--actual", "a crafted path is skipped",
       "--argv", "check --json", "--actual-exit", "0", "--expect-exit", "1"],
      dir
    );
    const res = devia(["contribute", "submit", "C1", "--root", dir, "--yes"], dir);
    assert.equal(res.code, 1);
    assert.match(res.out, /reported privately/);
    assert.match(res.out, /SECURITY\.md/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("the feature can be turned off entirely", () => {
  const dir = scratch();
  try {
    devia([...OBSERVE, "--root", dir], dir);
    configure(dir, { enabled: false });
    const res = devia(["contribute", "repro", "C1", "--root", dir], dir);
    assert.equal(res.code, 0);
    assert.match(res.out, /disabled for this repository/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// --- routing --------------------------------------------------------------------------------

test("a fix without a regression test is an issue, and with one is a pull request", () => {
  const deviaDir = path.join(packageRoot, ".devia");
  const base = {
    id: "C1",
    type: "bug",
    source: "real_usage",
    devia: { version: "0.6.0" },
    problem: { summary: "s", expected: "e", actual: "a" },
    observation: { argv: ["check"], expected: { exit: 0 }, actual: { exit: 1 } },
    reproduction: { path: "repro" },
  };
  // The pair that makes a record `fixed`: the same fixture, a different devia, and a behaviour
  // that changed between them.
  base.reproduced = { claim: claimHash(base), fixture: "aaaa", devia: "1111" };
  base.verification = { outcome: "expected", claim: claimHash(base), fixture: "aaaa", devia: "2222" };

  const noTests = eligibility({ ...base, fix: { repo: packageRoot, tests: [] } }, { deviaDir });
  assert.equal(noTests.route, "issue");
  assert.ok(noTests.notes.some((n) => /regression test/.test(n)));

  const withTests = eligibility(
    { ...base, fix: { repo: packageRoot, tests: ["tests/cli.test.mjs"], files: 2, lines: 30 } },
    { deviaDir }
  );
  assert.equal(withTests.route, "pull_request");

  const tooBig = eligibility(
    { ...base, fix: { repo: packageRoot, tests: ["tests/cli.test.mjs"], files: 40, lines: 4000 } },
    { deviaDir }
  );
  assert.equal(tooBig.route, "issue", "a large change is agreed before it is patched");

  const named = eligibility(
    { ...base, fix: { repo: packageRoot, tests: ["tests/does-not-exist.test.mjs"] } },
    { deviaDir }
  );
  assert.ok(named.blockers.some((b) => /not found/.test(b)), "a named test must exist");
});

test("an incomplete record names every field it is missing", () => {
  const gaps = missing({ type: "bug", source: "real_usage", devia: {}, problem: {} });
  for (const field of ["devia.version", "problem.summary", "observation.argv"]) {
    assert.ok(gaps.includes(field), `${field} should be reported as missing`);
  }
});

test("ids are monotone and are not reissued after a removal", () => {
  const dir = scratch();
  try {
    devia([...OBSERVE, "--root", dir], dir);
    devia([...OBSERVE, "--root", dir], dir);
    assert.ok(fs.existsSync(path.join(dir, ".devia", "contributions", "C2")));
    devia(["contribute", "rm", "C2", "--root", dir], dir);
    devia([...OBSERVE, "--root", dir], dir);
    assert.ok(
      fs.existsSync(path.join(dir, ".devia", "contributions", "C2")),
      "C2 is the next free number once C2 is gone — the registry is per repository"
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("--argv may not smuggle a --root past the fixture", () => {
  const dir = scratch();
  try {
    const res = devia(
      ["contribute", "new", "--root", dir, "--type", "bug", "--summary", "s",
       "--expected", "e", "--actual", "a", "--argv", "check --root /somewhere/else"],
      dir
    );
    assert.equal(res.code, 2);
    assert.match(res.out, /may not carry --root/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
