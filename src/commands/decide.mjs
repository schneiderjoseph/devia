import path from "node:path";
import { exists, read, readJSON, writeFile } from "../lib/fs.mjs";
import { trackedFiles } from "../lib/git.mjs";
import {
  REGISTER_FILE,
  MEANING,
  loadRegister,
  registerIssues,
  countByStatus,
  blockingPending,
  missingAssets,
  stackDrift,
  upsertSlot,
  groupOf,
} from "../lib/decisions.mjs";
import { color, heading, status, line } from "../lib/ui.mjs";

/**
 * `devia decide` — read and write the decision register.
 *
 * Writing is the point. A register nobody can update from the terminal is a register that gets
 * updated by hand, inconsistently, and then not at all; `devia gap add` exists for the same
 * reason. Each verb stamps what the status requires — a date on a ruling, bounds on a
 * delegation — so that an incomplete decision cannot be recorded as a complete one.
 *
 * There is no verb that deletes a slot. A question this kind of project has does not stop
 * existing because the answer is inconvenient; `drop` records that it is deliberately not needed
 * here, which is a decision with a reason attached and a diff somebody can read (`DEC-001`,
 * `MEM-011`).
 */

/** Padded first, coloured second: an escape sequence has width in `padEnd` and none on screen. */
const MARK = {
  decided: (w) => color.green("decided".padEnd(w)),
  pending: (w) => color.yellow("pending".padEnd(w)),
  delegated: (w) => color.blue("delegated".padEnd(w)),
  not_required: (w) => color.gray("not required".padEnd(w)),
};
const MARK_WIDTH = 12;

const HELP = `
${color.bold("devia decide")} — the decision register (DEC-001)

  devia decide                      every slot, grouped, with its status
  devia decide pending              only what nobody has ruled on
  devia decide show <key>           one slot in full

  devia decide open <key>           declare a slot, or reopen one, as pending
  devia decide set <key> "<value>"  record a human ruling
  devia decide delegate <key>       hand the choice to the agent, within bounds
  devia decide drop <key>           record that it is deliberately not needed here

Flags

  --because "<why>"       required by set and drop; what makes a ruling reviewable
  --bounded-by "<what>"   required by delegate; delegation without bounds is absence
  --owner <who>           who owes the answer (open; default: human)
  --question "<text>"     the question the slot asks, when it is new
  --path <file>           the file this decision delivers (an asset)
  --package <name>        the dependency this decision pins (a stack slot)
  --blocks <a,b>          paths that must not exist while this is pending
  --json                  machine-readable listing

Four statuses, because absence of information and absence of need are different facts:

  decided       ${MEANING.decided}
  pending       ${MEANING.pending}
  delegated     ${MEANING.delegated}
  not_required  ${MEANING.not_required}
`;

function today() {
  return new Date().toISOString().slice(0, 10);
}

/** Every dependency declared anywhere in the repository, for the stack drift check. */
function allDeps(root) {
  const tracked = trackedFiles(root);
  const manifests = tracked
    ? tracked.filter((f) => /(^|\/)package\.json$/.test(f) && !f.includes("node_modules/"))
    : exists(path.join(root, "package.json"))
      ? ["package.json"]
      : [];
  const deps = {};
  for (const m of manifests) {
    const json = readJSON(path.join(root, m.split("/").join(path.sep))) || {};
    Object.assign(deps, json.dependencies, json.devDependencies);
  }
  return deps;
}

function describe(slot) {
  if (slot.status === "decided") return slot.value || slot.path;
  if (slot.status === "delegated") return `${slot.to || "agent"}, bounded by: ${slot.bounded_by}`;
  if (slot.status === "not_required") return slot.because;
  if (slot.status === "pending") return slot.owner ? `owed by ${slot.owner}` : "nobody owns it";
  return "";
}

function printRegister(root, register, { only = null } = {}) {
  const slots = only ? register.slots.filter((s) => s.status === only) : register.slots;
  if (!slots.length) {
    status("INFO", only ? `no ${only} decisions` : "the register is empty");
    return;
  }
  let group = null;
  for (const slot of [...slots].sort((a, b) => a.key.localeCompare(b.key))) {
    if (slot.group !== group) {
      group = slot.group;
      line("");
      line(`  ${color.bold(group)}`);
    }
    const mark = MARK[slot.status]
      ? MARK[slot.status](MARK_WIDTH)
      : color.red(String(slot.status || "no status").padEnd(MARK_WIDTH));
    const detail = describe(slot);
    line(`    ${mark}  ${slot.key}${detail ? color.dim(" — " + detail) : ""}`);
  }
  line("");

  // Three ways a register stops matching the repository it describes. Reported here rather than
  // only in `devia check`, because the person reading the register is the person who can fix it.
  //
  // Against the whole register, never the filtered view: `decide pending` shows one slice, and a
  // consistency report that only covered the slice would go quiet exactly when it was narrowed.
  for (const { slot, built } of blockingPending(root, register.slots)) {
    status("FAIL", `${slot.key} is pending and ${built.join(", ")} exists`, "DEC-001");
  }
  for (const slot of missingAssets(root, register.slots)) {
    status("FAIL", `${slot.key} promises ${slot.path}`, "the file is not in the repository (DEC-005)");
  }
  for (const d of stackDrift(register.slots, allDeps(root))) {
    if (d.kind === "absent") {
      status("WARN", `${d.slot.key} pins ${d.slot.package}`, "no manifest declares it (DEC-003)");
    } else {
      status("FAIL", `${d.slot.key} decided ${d.slot.value}`, `the manifest says ${d.installed} (DEC-003)`);
    }
  }
}

function showSlot(slot) {
  heading(slot.key);
  const row = (k, v) => v && line(`  ${color.dim(k.padEnd(12))} ${v}`);
  row("status", `${slot.status} — ${MEANING[slot.status] || "unknown status"}`);
  row("question", slot.question);
  row("value", slot.value);
  row("path", slot.path);
  row("package", slot.package);
  row("because", slot.because);
  row("owner", slot.owner);
  row("delegated", slot.to);
  row("bounded by", slot.bounded_by);
  row("blocks", slot.blocks.join(", "));
  row("decided", slot.decided_at);
  row("note", slot.note);
  line("");
}

/** Fields a verb writes, or a sentence saying why it cannot. */
function fieldsFor(verb, slot, flags, rest) {
  const value = rest.trim();
  const because = flags.because ? String(flags.because) : "";
  const bounded = flags["bounded-by"] ? String(flags["bounded-by"]) : "";
  const base = {
    question: flags.question ? String(flags.question) : slot.question,
    path: flags.path ? String(flags.path) : slot.path,
    package: flags.package ? String(flags.package) : slot.package,
    blocks: flags.blocks ? String(flags.blocks).split(",").map((s) => s.trim()).filter(Boolean) : slot.blocks,
    note: slot.note,
  };

  if (verb === "open") {
    return {
      fields: { ...base, status: "pending", owner: String(flags.owner || slot.owner || "human") },
    };
  }
  if (verb === "set") {
    if (!value && !base.path) return { error: 'set needs a value: devia decide set <key> "<value>"' };
    if (!because) return { error: "set needs --because: a ruling nobody can review is folklore (DEC-001)" };
    return { fields: { ...base, status: "decided", value, because, decided_at: today() } };
  }
  if (verb === "delegate") {
    if (!bounded) {
      return {
        error: "delegate needs --bounded-by: delegation without bounds is absence (DEC-002)",
      };
    }
    return {
      fields: {
        ...base,
        status: "delegated",
        to: String(flags.to || "agent"),
        bounded_by: bounded,
        decided_at: today(),
      },
    };
  }
  if (verb === "drop") {
    if (!because) {
      return { error: "drop needs --because: not_required without a reason reads as forgotten" };
    }
    return { fields: { ...base, status: "not_required", because, decided_at: today() } };
  }
  return { error: `unknown action: ${verb}` };
}

export default async function decide(ctx) {
  const { root, deviaDir, args, flags } = ctx;
  const action = args._[1];

  if (flags.help) {
    line(HELP.trim());
    return 0;
  }

  const register = loadRegister(deviaDir);
  if (!register.exists) {
    if (ctx.json) {
      console.log(JSON.stringify({ ok: false, error: "no decision register", file: REGISTER_FILE }, null, 2));
      return 1;
    }
    status("FAIL", `no .devia/${REGISTER_FILE}`, "run `devia init` — it adds one without touching your other files");
    line("");
    return 1;
  }

  const issues = registerIssues(register);

  /* ------------------------------------------------------------- reading */

  if (!action || action === "list" || action === "pending") {
    const only = action === "pending" ? "pending" : null;
    const counts = countByStatus(register.slots);
    const blocked = blockingPending(root, register.slots);

    if (ctx.json) {
      console.log(
        JSON.stringify(
          {
            ok: issues.length === 0 && blocked.length === 0,
            counts,
            blocking: blocked.map((b) => ({ key: b.slot.key, built: b.built })),
            issues,
            decisions: only ? register.slots.filter((s) => s.status === only) : register.slots,
          },
          null,
          2
        )
      );
      return blocked.length ? 1 : 0;
    }

    heading(`devia decide — ${path.basename(root)}`);
    printRegister(root, register, { only });
    for (const issue of issues) status("FAIL", issue);
    line(
      `  ${counts.decided} decided · ${counts.pending} pending · ${counts.delegated} delegated · ` +
        `${counts.not_required} not required` +
        (counts.invalid ? ` · ${color.red(`${counts.invalid} invalid`)}` : "")
    );
    if (counts.pending) {
      line(color.dim("  A pending decision is not permission to choose one (DEC-001)."));
    }
    line("");
    return blocked.length ? 1 : 0;
  }

  const key = String(args._[2] || "").trim();
  if (!key) {
    status("FAIL", "usage", `devia decide ${action} <key>`);
    return 2;
  }

  if (action === "show") {
    const slot = register.slots.find((s) => s.key === key);
    if (!slot) {
      status("FAIL", `${key} is not in the register`, "`devia decide open` declares it");
      return 1;
    }
    if (ctx.json) {
      console.log(JSON.stringify(slot, null, 2));
      return 0;
    }
    showSlot(slot);
    return 0;
  }

  /* ------------------------------------------------------------- writing */

  if (!["open", "set", "delegate", "drop"].includes(action)) {
    status("FAIL", `unknown action: ${action}`);
    line(HELP.trim());
    return 2;
  }

  const existing = register.slots.find((s) => s.key === key) || {
    key,
    group: groupOf(key),
    question: "",
    value: "",
    because: "",
    owner: "",
    to: "",
    bounded_by: "",
    path: "",
    package: "",
    blocks: [],
    decided_at: "",
    note: "",
  };

  const rest = args._.slice(3).join(" ");
  const { fields, error } = fieldsFor(action, existing, flags, rest);
  if (error) {
    status("FAIL", error);
    line("");
    return 2;
  }

  const file = path.join(deviaDir, REGISTER_FILE);
  const next = upsertSlot(read(file) || "", key, fields);
  writeFile(file, next.endsWith("\n") ? next : next + "\n");

  heading(register.slots.some((s) => s.key === key) ? "decision updated" : "decision recorded");
  status("PASS", `${key} → ${fields.status}`, describe({ ...existing, ...fields, group: groupOf(key) }));
  if (fields.status === "decided" && existing.status === "pending") {
    line(color.dim("  If the code does not honour it yet, that is a debt line — `devia debt add`."));
  }
  if (fields.status === "delegated") {
    line(color.dim("  The agent decides inside those bounds and nowhere else (DEC-002)."));
  }
  line("");
  return 0;
}
