import process from "node:process";
import { exists } from "../lib/fs.mjs";
import { git } from "../lib/git.mjs";
import { reduction } from "../lib/tokens.mjs";
import {
  buildCorpus,
  classify,
  select,
  render,
  budgetFor,
  DEFAULT_BUDGET,
} from "../lib/context.mjs";
import { color, heading, status, line } from "../lib/ui.mjs";

/**
 * The smallest sufficient slice of devia for one task.
 *
 * The default output is the context itself, on stdout, so it can be piped straight into an
 * agent. `--stats` and `--explain` are the other two questions a reader has — how much did this
 * cost, and why is this item here — and each gets its own mode rather than being mixed into the
 * payload.
 */

function list(flag) {
  if (!flag || flag === true) return [];
  return String(flag)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Files this change touches, from `--files`, and from git when `--diff` is given. */
function changedFiles(root, flags) {
  const named = list(flags.files);
  if (!flags.diff) return named;

  const base = flags.diff === true ? "HEAD" : String(flags.diff);
  const tracked = git(root, ["diff", "--name-only", base]);
  const staged = git(root, ["diff", "--name-only", "--cached"]);
  const untracked = git(root, ["ls-files", "--others", "--exclude-standard"]);
  const all = [tracked, staged, untracked]
    .filter((s) => s !== null)
    .flatMap((s) => s.split("\n"))
    .filter(Boolean);
  return [...new Set([...named, ...all])];
}

/**
 * The accounting, with the three numbers kept apart.
 *
 * `target` is what was asked for, `mandatory_floor` is what the blocking items cost, and
 * `selected_tokens` is what was actually produced. Reporting only the first and the last made a
 * stated design ("a mandatory item is never evicted") read as a broken promise.
 */
function metrics(selection) {
  return {
    mode: selection.mode,
    target: selection.target,
    mandatory_floor: selection.floor,
    mandatory_floor_full: selection.fullFloor,
    mandatory_items: selection.mandatory,
    selected_tokens: selection.spent,
    status: selection.status,
    compliant: selection.compliant,
    degraded: selection.degraded,
    raw_tokens: selection.raw,
    reduction_pct: reduction(selection.raw, selection.spent),
    included_items: selection.included.length,
    excluded_items: selection.excluded.length,
    overrun: selection.overrun,
  };
}

export default async function context(ctx) {
  const { root, deviaDir, args, flags } = ctx;

  if (flags.help) {
    line(`
${color.bold("devia context")} — the smallest sufficient context for one task

  devia context "add POST /api/orders"
  devia context "refund flow" --files src/api/refund.ts,migrations/004.sql
  devia context "fix the empty state" --diff --explain
  devia context --stats --json

  --budget <n>     token budget for this run (default: devia.json context.maxTokens, else ${DEFAULT_BUDGET})
  --files <list>   comma-separated paths this change touches
  --diff [ref]     add the files git reports as changed (default ref: HEAD)
  --domain <list>  force these rule domains in
  --explain        why each item was included, and why the rest was not
  --stats          the token accounting only
  --full           the unoptimised corpus, for measuring against
  --json           machine-readable

The context itself goes to stdout, so it pipes straight into an agent. --explain and --stats
are separate modes rather than commentary mixed into that payload.

Blocking constraints are admitted before the budget is consulted and are never evicted:
a budget too small to hold them reports an overrun instead of dropping one.
`.trim());
    return 0;
  }

  if (!exists(deviaDir)) {
    if (ctx.json) {
      console.log(JSON.stringify({ ok: false, error: "no .devia directory", root }, null, 2));
    } else {
      heading("devia context");
      status("FAIL", "no .devia/ in this repository", "run `devia init` first (AGT-002)");
      line("");
    }
    return 1;
  }

  const task = args._.slice(1).join(" ").trim();
  const files = changedFiles(root, flags);
  const { target, mode } = budgetFor(deviaDir, flags);

  const corpus = buildCorpus({ root, deviaDir });
  const { domains, changeTypes } = classify(corpus, {
    task,
    files,
    domains: list(flags.domain),
    changeTypes: list(flags.type),
  });
  const selection = select(corpus, { target, mode });

  if (flags.full) {
    // The baseline: everything devia knows, rules at full text. What an agent consumes when
    // nothing routes for it.
    const text = corpus.map((i) => i.full || i.text).join("\n");
    if (ctx.json) {
      console.log(JSON.stringify({ items: corpus.length, tokens: selection.raw, text }, null, 2));
    } else {
      console.log(text);
    }
    return 0;
  }

  if (ctx.json) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          task,
          files,
          domains: [...domains].map(([domain, why]) => ({ domain, why: [...why] })),
          change_types: changeTypes,
          context: metrics(selection),
          included: selection.included.map((i) => ({
            kind: i.kind,
            id: i.id,
            tier: i.tier,
            tokens: i.tokens,
            relevance: i.relevance,
            why: i.why,
          })),
          excluded: selection.excluded.map((i) => ({
            kind: i.kind,
            id: i.id,
            tier: i.tier,
            tokens: i.tokens,
            reason: i.reason,
            why: i.why,
          })),
        },
        null,
        2
      )
    );
    return 0;
  }

  if (flags.explain) {
    const m = metrics(selection);
    heading(`devia context — ${task || "no task given"}`);
    line(`  ${color.dim("domains")}  ${[...domains.keys()].join(", ") || "none routed"}`);
    if (changeTypes.length) line(`  ${color.dim("change")}   ${changeTypes.join(", ")}`);
    line("");

    line(color.bold("  Included"));
    for (const i of selection.included) {
      line(`    ${color.green(i.tier)} ${String(i.tokens).padStart(4)}t  ${i.id}`);
      for (const w of i.why.slice(0, 3)) line(color.dim(`           ${w}`));
    }

    const withheld = selection.excluded.filter((i) => i.reason === "budget");
    if (withheld.length) {
      line("");
      line(color.bold("  Withheld by the budget"));
      for (const i of withheld.slice(0, 12)) {
        line(`    ${color.yellow(i.tier)} ${String(i.tokens).padStart(4)}t  ${i.id}`);
      }
      if (withheld.length > 12) line(color.dim(`    …and ${withheld.length - 12} more`));
    }

    const irrelevant = selection.excluded.filter((i) => i.reason === "not relevant");
    line("");
    line(color.bold("  Not relevant"));
    line(color.dim(`    ${irrelevant.length} items, e.g.`));
    for (const i of irrelevant.slice(0, 6)) {
      line(color.dim(`    ${i.id} — ${i.why[0] || "no signal"}`));
    }

    line("");
    report(m);
    return 0;
  }

  if (flags.stats) {
    heading(`devia context — ${task || "no task given"}`);
    report(metrics(selection));
    return selection.status === "impossible" ? 1 : 0;
  }

  // Strict means strict. A context that cannot hold its own mandatory items is not a smaller
  // context, it is a wrong one, so nothing is written to stdout and the reason goes to stderr.
  if (selection.status === "impossible") {
    console.error(
      `devia context: the ${selection.mandatory} mandatory items cost ${selection.floor} tokens ` +
        `at their smallest, above the strict target of ${selection.target}. Nothing was produced.`
    );
    return 1;
  }

  process.stdout.write(render(selection, { task }));
  return 0;
}

const STATUS_LABEL = {
  within: (c) => c.green("WITHIN TARGET"),
  degraded: (c) => c.yellow("WITHIN TARGET, DEGRADED"),
  over: (c) => c.yellow("OVER TARGET"),
  impossible: (c) => c.red("IMPOSSIBLE"),
};

function report(m) {
  const pad = (n) => String(n).padStart(7);
  line(`  Target           ${pad(m.target)} tokens  (${m.mode})`);
  line(`  Mandatory floor  ${pad(m.mandatory_floor)} tokens in ${m.mandatory_items} items`);
  line(`  Selected         ${pad(m.selected_tokens)} tokens in ${m.included_items} items`);
  line(`  Raw corpus       ${pad(m.raw_tokens)} tokens (estimated)`);
  line(`  Reduction        ${pad(m.reduction_pct)} %`);
  line("");
  line(`  Status           ${STATUS_LABEL[m.status](color)}`);

  if (m.status === "over") {
    line(
      color.dim(
        `  The ${m.mandatory_items} mandatory items cost ${m.mandatory_floor} tokens, above the ` +
          `${m.target} asked for.`
      )
    );
    line(color.dim("  They are included anyway: in advisory mode a target never evicts one."));
    line(color.dim("  Set a larger target, prune 10_NEVER_ALWAYS.md, or use --strict."));
  } else if (m.status === "degraded") {
    line(color.dim(`  The full floor was ${m.mandatory_floor_full} tokens. To fit the target:`));
    for (const d of m.degraded) line(color.dim(`    · ${d.note} (${d.items})`));
  } else if (m.status === "impossible") {
    line(
      color.dim(
        `  Even at their smallest the mandatory items cost ${m.mandatory_floor} tokens. ` +
          "Nothing was produced: strict means strict."
      )
    );
  } else {
    line(color.dim(`  ${m.mandatory_items} mandatory items, ${m.mandatory_floor} tokens of it.`));
  }
  line(color.dim("  Token counts are estimates, not a tokenizer's output."));
  line("");
}

export { metrics };
