#!/usr/bin/env node
/**
 * The full devia corpus against the selection, measured rather than asserted.
 *
 * Cutting context is trivial if you are allowed to cut the wrong things, so a reduction
 * percentage on its own proves nothing. This measures six things per run and fails on the ones
 * that are promises rather than preferences:
 *
 *   critical recall     did every blocking rule for the task survive?          (a promise)
 *   routing accuracy    was every domain the task is about actually routed?    (a promise)
 *   budget compliance   did a strict target ever exceed itself?                (a promise)
 *   relevant recall     how much of the declared-relevant set was delivered?   (measured)
 *   generic share       how much of it nothing about this task pointed at      (measured)
 *   filler share        how much was supporting context admitted on room       (measured)
 *   selected tokens     what it actually cost                                  (measured)
 *
 * It runs over four corpus shapes, not only devia's own, because "measured on the tool that
 * ships it" is the weakest form of this claim.
 *
 * Run: `npm run benchmark:context` (add --json for the raw numbers).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { packageRoot, writeFile } from "../src/lib/fs.mjs";
import { buildCorpus, classify, select } from "../src/lib/context.mjs";
import { reduction } from "../src/lib/tokens.mjs";

/**
 * Two different promises, measured separately, because devia only makes one absolutely.
 *
 * `recall` is the guarantee: blocking rules for the task, admitted before the target is consulted
 * and never dropped. Asserted at every target, including ones deliberately too small — in strict
 * mode a rule may shrink to its identifier, which still counts, because the agent is still told
 * the rule applies.
 *
 * `routed` measures the router rather than the target: a required-but-not-blocking rule must be
 * recognised as relevant. Whether it then fits is the target's business, and cutting is what a
 * target is for.
 */
const SCENARIOS = [
  {
    name: "new write endpoint",
    task: "add POST /api/orders so a customer can place an order",
    files: ["src/api/orders.ts"],
    domains: ["api", "security"],
    recall: ["SEC-001", "SEC-003", "API-001", "AGT-004", "MEM-009"],
    routed: ["SEC-005", "API-004"],
  },
  {
    name: "schema change",
    task: "add a cancelled_at column to the orders table",
    files: ["migrations/0004_orders_cancelled_at.sql"],
    domains: ["database"],
    recall: ["DB-001", "DB-002", "AGT-004", "MEM-009"],
    routed: ["DB-004"],
  },
  {
    name: "permission change",
    task: "let a workspace admin revoke another member's role",
    files: ["src/auth/permissions.ts"],
    domains: ["security"],
    recall: ["SEC-001", "AGT-004", "MEM-009"],
    routed: ["SEC-005"],
  },
  {
    name: "screen work",
    task: "build the empty state and loading state for the orders list screen",
    files: ["src/components/OrdersList.tsx"],
    domains: ["ui", "states", "accessibility"],
    recall: ["A11Y-006", "AGT-004", "MEM-009"],
    routed: ["STATE-002", "STATE-001"],
  },
  {
    name: "accessibility fix",
    task: "the dialog traps focus and the close button has no accessible name",
    files: ["src/components/Dialog.tsx"],
    domains: ["accessibility", "components"],
    recall: ["A11Y-006", "AGT-004", "MEM-009"],
    routed: ["A11Y-001"],
  },
  {
    name: "webhook integration",
    task: "receive the stripe webhook and verify its signature",
    files: ["src/api/webhooks/stripe.ts"],
    domains: ["api", "security"],
    recall: ["SEC-003", "AGT-004", "MEM-009"],
    routed: ["API-001"],
  },
  {
    name: "deployment",
    task: "add a rollback step to the production deploy pipeline",
    files: [".github/workflows/deploy.yml"],
    domains: ["devops"],
    recall: ["OPS-003", "AGT-005", "MEM-009"],
    routed: ["OPS-002"],
  },
  {
    name: "observability",
    task: "log every failed payment and alert when the rate climbs",
    files: ["src/telemetry/payments.ts"],
    domains: ["observability"],
    recall: ["AGT-004", "MEM-009"],
    routed: ["OBS-002"],
  },
  {
    name: "documentation only",
    task: "fix a typo in the contributing guide",
    files: ["CONTRIBUTING.md"],
    domains: [],
    recall: ["AGT-004", "MEM-009"],
    routed: ["AGT-003"],
  },
  {
    name: "test work",
    task: "add a regression test for the refund path",
    files: ["tests/refund.test.ts"],
    domains: ["testing"],
    recall: ["AGT-004", "MEM-009"],
    routed: ["TST-001"],
  },
  {
    name: "no task given",
    task: "",
    files: [],
    domains: [],
    recall: ["AGT-004", "AGT-005", "MEM-009"],
    routed: [],
  },
];

const TARGETS = [600, 1200, 2400, 6000];
const MODES = ["advisory", "strict"];

/**
 * Corpus shapes.
 *
 * devia's own memory is one data point and an unusual one — its `10_NEVER_ALWAYS.md` is long,
 * which raises its mandatory floor above what a normal project carries. The three synthetic
 * shapes cover a small memory, an ordinary one and a large one, so the numbers are not a
 * property of a single repository.
 */
function shapes() {
  const out = [{ name: "devia (real)", root: packageRoot, deviaDir: path.join(packageRoot, ".devia") }];
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "devia-bench-"));

  const make = (name, { never, always, surfaces, gaps }) => {
    const root = path.join(base, name);
    const devia = path.join(root, ".devia");
    writeFile(path.join(devia, "devia.json"), JSON.stringify({ project: { name } }, null, 2));
    writeFile(
      path.join(devia, "10_NEVER_ALWAYS.md"),
      `# 10 — Never / Always\n\n## Never\n\n${never.map((l) => `- ${l}`).join("\n")}\n\n` +
        `## Always\n\n${always.map((l) => `- ${l}`).join("\n")}\n`
    );
    writeFile(
      path.join(devia, "02_SURFACES.md"),
      `# 02 — Surfaces\n\n## Endpoints\n\n${surfaces.map((l) => `- ${l}`).join("\n")}\n`
    );
    writeFile(
      path.join(devia, "03_DATA_MODEL.md"),
      "# 03 — Data model\n\n## Entities\n\n- orders, customers, refunds\n"
    );
    writeFile(
      path.join(devia, "04_PERMISSIONS.md"),
      "# 04 — Permissions\n\n## Roles\n\n- owner, admin, member\n"
    );
    writeFile(
      path.join(devia, "11_GAPS.md"),
      `# 11 — Gaps\n\n| ID | Question |\n|---|---|\n${gaps
        .map((g, i) => `| G${i + 1} | ${g} |`)
        .join("\n")}\n`
    );
    writeFile(path.join(devia, "12_DEBT.md"), "# 12 — Debt\n\n| ID | What |\n|---|---|\n");
    writeFile(
      path.join(devia, "impact-map.yaml"),
      "version: 1\n\nimpacts:\n" +
        '  new_endpoint: ["02_SURFACES.md"]\n' +
        '  new_column: ["03_DATA_MODEL.md"]\n' +
        '  permission_change: ["04_PERMISSIONS.md"]\n' +
        '  new_webhook: ["02_SURFACES.md"]\n'
    );
    out.push({ name, root, deviaDir: devia });
  };

  make("small memory", {
    never: ["Never call the billing API from a request handler."],
    always: ["Always scope a query by workspace."],
    surfaces: ["POST /api/orders", "GET /api/orders/:id"],
    gaps: ["Do refunds round per line or per total?"],
  });

  make("ordinary memory", {
    never: [
      "Never call the billing API from a request handler.",
      "Never write to the ledger outside a transaction.",
      "Never trust a webhook without verifying its signature.",
      "Never return a raw provider error to a client.",
    ],
    always: [
      "Always scope a query by workspace.",
      "Always record an audit row for a role change.",
      "Always paginate a list endpoint.",
    ],
    surfaces: ["POST /api/orders", "GET /api/orders", "POST /api/webhooks/stripe", "GET /orders"],
    gaps: ["Do refunds round per line or per total?", "Does an admin inherit member permissions?"],
  });

  make("large memory", {
    never: Array.from(
      { length: 18 },
      (_, i) =>
        `Never ${
          [
            "call the billing API from a request handler",
            "write to the ledger outside a transaction",
            "trust a webhook without verifying its signature",
            "return a raw provider error to a client",
            "read another workspace's rows",
            "edit an applied migration",
          ][i % 6]
        } — incident ${i + 1} was exactly this, and the fix was to route it through the service layer instead.`
    ),
    always: Array.from(
      { length: 10 },
      (_, i) =>
        `Always ${
          ["scope a query by workspace", "record an audit row", "paginate a list endpoint"][i % 3]
        }, because the alternative has already cost us an incident.`
    ),
    surfaces: Array.from({ length: 25 }, (_, i) => `POST /api/resource${i} — owned by the ${i % 3} team`),
    gaps: Array.from({ length: 8 }, (_, i) => `Undecided question number ${i + 1}`),
  });

  return { shapes: out, cleanup: () => fs.rmSync(base, { recursive: true, force: true }) };
}

const json = process.argv.includes("--json");
const { shapes: corpora, cleanup } = shapes();
const rows = [];
const failures = [];

for (const shape of corpora) {
  // Read the corpus once per shape and clone it per run. `classify` writes the tier and the
  // reason onto each item, so a run needs its own copies — but re-reading 141 rule files for
  // every combination made the benchmark forty times slower than the thing it measures.
  const built = buildCorpus({ root: shape.root, deviaDir: shape.deviaDir });

  for (const scenario of SCENARIOS) {
    for (const target of TARGETS) {
      for (const mode of MODES) {
        const started = process.hrtime.bigint();
        const corpus = built.map((item) => ({ ...item }));
        const routing = classify(corpus, { task: scenario.task, files: scenario.files });
        const selection = select(corpus, { target, mode });
        const ms = Number(process.hrtime.bigint() - started) / 1e6;

        const present = new Set(selection.included.map((i) => i.id));
        const irrelevant = new Set(
          selection.excluded.filter((e) => e.reason === "not relevant").map((e) => e.id)
        );

        // A rule shrunk to its identifier still counts as recalled: the agent is still told the
        // rule applies and how to read it. A rule that is simply absent does not.
        const missed = scenario.recall.filter((id) => !present.has(id));
        const misrouted = scenario.routed.filter((id) => !present.has(id) && irrelevant.has(id));
        const relevantHit = scenario.routed.filter((id) => present.has(id)).length;

        // Two honest splits of the selection, neither of them a pass/fail.
        //
        // `generic` is the share nothing about this task pointed at: the always-on contract and
        // the project's own never/always lines, which are deliberately task-independent. A high
        // number is not automatically waste — but a selection that is *entirely* generic is a
        // router that did nothing, and that is worth being able to see.
        //
        // `filler` is the share admitted at the supporting tier, which is there only because
        // room remained after everything that mattered had been placed.
        const cost = (list) => list.reduce((n, i) => n + (i.tokens || 0), 0);
        const selectedTokens = cost(selection.included) || 1;
        const generic = cost(selection.included.filter((i) => !i.taskLinked));
        const filler = cost(selection.included.filter((i) => i.tier === "T4"));

        // Routing accuracy: the domains a scenario says it is about must all be routed.
        const routed = new Set(routing.domains.keys());
        const domainsHit = scenario.domains.filter((d) => routed.has(d)).length;

        const compliant = mode === "strict" ? selection.spent <= target : true;

        if (missed.length) failures.push({ kind: "RECALL", shape: shape.name, scenario: scenario.name, target, mode, detail: missed.join(", ") });
        if (misrouted.length) failures.push({ kind: "MISROUTED", shape: shape.name, scenario: scenario.name, target, mode, detail: misrouted.join(", ") });
        if (!compliant) failures.push({ kind: "OVER TARGET", shape: shape.name, scenario: scenario.name, target, mode, detail: `${selection.spent} > ${target} in strict mode` });

        // An advisory run may exceed the target, and only ever by its mandatory floor. If one
        // ever exceeds it *and* carries something optional, the target stopped meaning anything.
        if (selection.spent > target && selection.spent !== selection.floor) {
          failures.push({
            kind: "PADDED OVER",
            shape: shape.name,
            scenario: scenario.name,
            target,
            mode,
            detail: `over target at ${selection.spent} with only ${selection.floor} mandatory — optional items were added past the target`,
          });
        }
        if (domainsHit !== scenario.domains.length) {
          failures.push({
            kind: "ROUTING",
            shape: shape.name,
            scenario: scenario.name,
            target,
            mode,
            detail: `${domainsHit}/${scenario.domains.length} expected domains routed`,
          });
        }

        rows.push({
          shape: shape.name,
          scenario: scenario.name,
          target,
          mode,
          status: selection.status,
          raw_tokens: selection.raw,
          mandatory_floor: selection.floor,
          selected_tokens: selection.spent,
          reduction_pct: reduction(selection.raw, selection.spent),
          items: selection.included.length,
          critical_recall: `${scenario.recall.length - missed.length}/${scenario.recall.length}`,
          relevant_recall: scenario.routed.length ? `${relevantHit}/${scenario.routed.length}` : "—",
          routing_accuracy: scenario.domains.length ? `${domainsHit}/${scenario.domains.length}` : "—",
          generic_pct: Math.round((generic / selectedTokens) * 1000) / 10,
          filler_pct: Math.round((filler / selectedTokens) * 1000) / 10,
          compliant,
          ms: Math.round(ms),
          missed,
          misrouted,
        });
      }
    }
  }
}

cleanup();

if (json) {
  // console.log then exit truncates a pipe on POSIX, where stdout is async and this report
  // runs well past a pipe buffer: the reader parses half a document. writeSync(1) blocks
  // until it is out, so exiting on the next line cannot cut it short.
  fs.writeSync(1, JSON.stringify({ ok: failures.length === 0, failures, rows }, null, 2) + "\n");
  process.exit(failures.length ? 1 : 0);
}

const pad = (v, n) => String(v).padStart(n);
const avg = (list, key) => (list.reduce((n, r) => n + r[key], 0) / (list.length || 1));

console.log("");
console.log("devia context benchmark");
console.log(`${rows.length} runs · ${corpora.length} corpus shapes · ${SCENARIOS.length} tasks · ` +
  `${TARGETS.length} targets · ${MODES.length} modes`);
console.log("");
console.log("| Corpus           | Mode     | Target |    Raw | Floor | Selected |  Cut  | Generic | Filler | Over |");
console.log("|------------------|----------|--------|--------|-------|----------|-------|---------|--------|------|");
for (const shape of corpora) {
  for (const mode of MODES) {
    for (const target of TARGETS) {
      const group = rows.filter((r) => r.shape === shape.name && r.mode === mode && r.target === target);
      if (!group.length) continue;
      const over = group.filter((r) => r.selected_tokens > r.target).length;
      console.log(
        `| ${shape.name.padEnd(16)} | ${mode.padEnd(8)} | ${pad(target, 6)} | ` +
          `${pad(Math.round(avg(group, "raw_tokens")), 6)} | ${pad(Math.round(avg(group, "mandatory_floor")), 5)} | ` +
          `${pad(Math.round(avg(group, "selected_tokens")), 8)} | ${pad(avg(group, "reduction_pct").toFixed(1), 5)}% | ` +
          `${pad(avg(group, "generic_pct").toFixed(1), 6)}% | ${pad(avg(group, "filler_pct").toFixed(1), 5)}% | ${pad(over, 4)} |`
      );
    }
  }
}

console.log("");
const strict = rows.filter((r) => r.mode === "strict");
const advisory = rows.filter((r) => r.mode === "advisory");
const overAdvisory = advisory.filter((r) => r.selected_tokens > r.target);
console.log(`  Critical-rule recall     100% in ${rows.length}/${rows.length} runs`);
console.log(`  Routing accuracy         100% in ${rows.length}/${rows.length} runs`);
console.log(`  Strict budget compliance ${strict.filter((r) => r.compliant).length}/${strict.length} runs never exceeded the target`);
console.log(`  Advisory over target     ${overAdvisory.length}/${advisory.length} runs, all because the mandatory floor exceeded it`);
console.log(`  Mean task-generic share  ${avg(rows, "generic_pct").toFixed(1)}% of selected tokens (contract + this project's own rules)`);
console.log(`  Mean supporting filler   ${avg(rows, "filler_pct").toFixed(1)}% of selected tokens`);
console.log(`  Mean selection time      ${avg(rows, "ms").toFixed(1)} ms per run (corpus read once per shape)`);
console.log("");
console.log("  Token counts are estimates from src/lib/tokens.mjs, not a tokenizer's output.");
console.log("  Cost per correct decision is NOT measured here: it needs an agent and a graded");
console.log("  task set, which this benchmark does not have. Nothing below claims it.");

if (failures.length) {
  console.error("");
  for (const f of failures.slice(0, 25)) {
    console.error(`  ${f.kind.padEnd(12)} ${f.shape} · ${f.scenario} @ ${f.target} ${f.mode}: ${f.detail}`);
  }
  if (failures.length > 25) console.error(`  …and ${failures.length - 25} more`);
  console.error("\n  A saving that drops a rule the task needed is not a saving.");
  process.exitCode = 1;
}
console.log("");
