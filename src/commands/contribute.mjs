import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { exists, read, writeFile, packageRoot } from "../lib/fs.mjs";
import { sanitize } from "../lib/sanitize.mjs";
import {
  TYPES,
  REPRO_CAPS,
  recordPath,
  reproPath,
  settings,
  listRecords,
  nextId,
  claimHash,
  stateOf,
  missing,
  eligibility,
  runObservation,
  verdict,
  reproStats,
  environment,
  fixtureHash,
  sourceHash,
  evidenceChain,
  renderBody,
  renderTitle,
  identityCheck,
  manifest,
  payloadResidue,
  redactions,
  save,
  load,
  upstream,
} from "../lib/contribution.mjs";
import { color, heading, status, line } from "../lib/ui.mjs";

/**
 * A devia problem hit in a real repository, turned into something devia can act on.
 *
 * Everything here is local except one path: `submit --yes`, which asks GitHub to open an issue
 * or a pull request through the `gh` CLI under an identity the project declared. devia holds no
 * token, performs no background upload, and prints every byte it would send before sending it
 * (`PRIV-005`).
 */

const HELP = `
${color.bold("devia contribute")} — a devia problem you hit here, as an issue or a pull request

  devia contribute                       candidates, their state, and what each needs next
  devia contribute new --type <t> ...    record what you observed
  devia contribute repro <ID>            scaffold the minimal reproduction
  devia contribute verify <ID>           re-run the observation inside it — this is the gate
  devia contribute show <ID>             the full report, and exactly what would be sent
  devia contribute submit <ID>           prepare the issue or pull request
  devia contribute rm <ID>               drop a candidate

${color.bold("new")}
  --type ${TYPES.join("|")}
  --summary "..."   --expected "..."   --actual "..."
  --argv "check --json"          the invocation, as you ran it
  --actual-exit <n>   --actual-matches <re>   --actual-absent <re>
  --expect-exit <n>   --expect-matches <re>   --expect-absent <re>
  --expect-metric <a.b> --expect-op <op> --expect-value <n>     for a numeric claim
  --actual-metric <a.b> --actual-op <op> --actual-value <n>
  --gate <ID>  --rule <ID>  --component <command>
  --manual          a deliberate human proposal, not an observation. Issue only, never a PR

${color.bold("repro")}
  --include <paths>   comma-separated files to copy in, sanitized and listed in the record
  --with-memory       also run \`devia init\` inside the fixture
  --force             rebuild an existing fixture

${color.bold("verify")}
  --devia <path>      a devia checkout to test against (default: the installed one)

${color.bold("submit")}
  --yes               authorise the remote operation. Without it, nothing leaves this machine
  --fix-repo <path>   the devia checkout holding the fix
  --fix-tests <list>  regression tests, comma-separated, relative to the checkout
  --architectural     record that this needs agreement before a patch

The two assertions must tell the two behaviours apart, or neither proves anything. A gate id
appears in --json whether the gate passed or failed, so --actual-matches SEC-SECRETS holds on a
clean repository too. Assert on something that actually differs — the blocking list, an exit
code, or a metric:

  --actual-matches '"blocking": \\[[^\\]]*"SEC-SECRETS"'
  --actual-metric context.selected_tokens --actual-op ">" --actual-value 3000

A contribution is eligible only when devia itself reproduced the problem. Turn the whole
feature off with "contribution": { "enabled": false } in .devia/devia.json.
`;

const NEXT = {
  incomplete: "devia contribute rm and record it again — see the missing fields above",
  observed: "devia contribute repro <ID>, then verify <ID>",
  reproduced: "fix it, then verify --devia <checkout>, or submit <ID> as an issue",
  fixed: "devia contribute submit <ID>",
  rejected: "the behaviour did not reappear — correct the claim or drop the candidate",
};

function csv(flag) {
  if (!flag || flag === true) return [];
  return String(flag).split(",").map((s) => s.trim()).filter(Boolean);
}

function profile(flags, prefix) {
  const p = {};
  const num = (v) => (v === undefined ? undefined : Number(v));
  if (flags[`${prefix}-exit`] !== undefined) p.exit = num(flags[`${prefix}-exit`]);
  if (flags[`${prefix}-matches`]) p.matches = String(flags[`${prefix}-matches`]);
  if (flags[`${prefix}-absent`]) p.absent = String(flags[`${prefix}-absent`]);
  if (flags[`${prefix}-metric`]) {
    p.metric = String(flags[`${prefix}-metric`]);
    p.op = String(flags[`${prefix}-op`] || "==");
    p.value = Number(flags[`${prefix}-value`]);
  }
  return p;
}

function dirOf(deviaDir, id) {
  return path.dirname(recordPath(deviaDir, id));
}

const reproDir = (deviaDir, record) => reproPath(deviaDir, record);

/** `gh`, and the account it is authenticated as. Absence is reported, never worked around. */
function ghAccount() {
  try {
    const out = execFileSync("gh", ["auth", "status"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const m = out.match(/account\s+([A-Za-z0-9-]+)/i) || out.match(/as\s+([A-Za-z0-9-]+)\s/i);
    return { ok: true, account: m ? m[1] : null, raw: out };
  } catch (e) {
    const raw = String(e.stderr || e.stdout || e.message || "");
    return { ok: false, account: null, raw, missing: /ENOENT|not recognized|not found/i.test(raw) };
  }
}

// ---------------------------------------------------------------------------------------------

function cmdList(ctx) {
  const { deviaDir } = ctx;
  const records = listRecords(deviaDir);

  if (ctx.json) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          candidates: records.map((r) => ({
            id: r.id,
            type: r.type,
            source: r.source,
            state: stateOf(r),
            summary: r.problem?.summary || "",
          })),
        },
        null,
        2
      )
    );
    return 0;
  }

  heading("devia contribute");
  if (!records.length) {
    status("INFO", "no candidates", "record one with `devia contribute new --type <t>`");
    line("");
    line(color.dim("  A candidate starts from something devia actually did here — not from an"));
    line(color.dim("  improvement you can imagine for it (AGT-012)."));
    line("");
    return 0;
  }
  for (const r of records) {
    const state = stateOf(r);
    const kind = state === "fixed" ? "PASS" : state === "rejected" || state === "incomplete" ? "FAIL" : "INFO";
    status(kind, `${r.id}  ${state.padEnd(10)} ${r.type}`, r.problem?.summary || "");
    line(color.dim(`         next: ${NEXT[state]}`));
  }
  line("");
  return 0;
}

function cmdNew(ctx) {
  const { deviaDir, flags } = ctx;
  const type = String(flags.type || "");
  if (!TYPES.includes(type)) {
    status("FAIL", "--type is required", TYPES.join(" | "));
    return 2;
  }

  const argv = flags.argv && flags.argv !== true ? String(flags.argv).trim().split(/\s+/) : [];
  if (argv.includes("--root")) {
    status("FAIL", "--argv may not carry --root", "the reproduction is the working directory");
    return 2;
  }

  const manual = Boolean(flags.manual);
  const env = environment();
  const record = {
    id: nextId(deviaDir),
    created: new Date().toISOString().slice(0, 10),
    type,
    source: manual ? "manual" : "real_usage",
    devia: {
      ...env,
      component: flags.component ? String(flags.component) : argv[0] || null,
      gate: flags.gate ? String(flags.gate) : null,
      rule: flags.rule ? String(flags.rule) : null,
    },
    problem: {
      summary: String(flags.summary || ctx.args._.slice(2).join(" ") || "").trim(),
      expected: String(flags.expected || "").trim(),
      actual: String(flags.actual || "").trim(),
    },
    observation: manual ? null : { argv, expected: profile(flags, "expect"), actual: profile(flags, "actual") },
    reproduction: null,
    verification: null,
    fix: null,
  };

  const gaps = missing(record);
  save(deviaDir, record);

  heading(`devia contribute — ${record.id} recorded`);
  status("PASS", record.id, `${record.type} · ${record.source}`);
  if (gaps.length) {
    status("WARN", "incomplete", `still missing: ${gaps.join(", ")}`);
    line(color.dim(`  Edit ${path.join(".devia", "contributions", record.id, "record.json")}.`));
  } else if (manual) {
    line(color.dim("  A manual proposal is routed to an issue. It never becomes a pull request"));
    line(color.dim("  on its own evidence (AGT-012)."));
  } else {
    line(color.dim(`  Next: devia contribute repro ${record.id}`));
  }
  line("");
  return 0;
}

const SCAFFOLD_README = `# Minimal reproduction

Whatever is in this directory is what a devia maintainer receives. It stands alone: it is not a
copy of the repository the problem was found in, and it must not become one.

1. Add the smallest tree that makes the recorded invocation misbehave.
2. Run \`devia contribute verify <ID>\` — it runs that invocation here and compares.
3. Keep it under ${REPRO_CAPS.files} files.
`;

function cmdRepro(ctx, id) {
  const { root, deviaDir, flags } = ctx;
  const record = load(deviaDir, id);
  if (!record) {
    status("FAIL", `no such candidate: ${id}`);
    return 1;
  }

  const dir = path.join(dirOf(deviaDir, record.id), "repro");
  if (exists(dir) && !flags.force) {
    const stats = reproStats(dir);
    heading(`devia contribute repro — ${record.id}`);
    status("SKIP", "fixture already there", `${stats.files} files — --force rebuilds it`);
    line("");
    return 0;
  }
  if (flags.force) fs.rmSync(dir, { recursive: true, force: true });

  writeFile(
    path.join(dir, "package.json"),
    JSON.stringify({ name: "devia-repro", version: "0.0.0", private: true }, null, 2) + "\n"
  );
  writeFile(path.join(dir, "README.md"), SCAFFOLD_README);

  heading(`devia contribute repro — ${record.id}`);
  status("PASS", "fixture scaffolded", path.relative(root, dir).split(path.sep).join("/"));

  const included = [];
  for (const rel of csv(flags.include)) {
    const from = path.resolve(root, rel);
    if (!exists(from)) {
      status("FAIL", `not found: ${rel}`);
      return 1;
    }
    if (/(^|[\\/])\.env(\.|$)/.test(rel)) {
      status("FAIL", `refused: ${rel}`, "an environment file is never copied into a fixture");
      return 1;
    }
    const raw = read(from);
    if (raw === null) {
      status("FAIL", `unreadable: ${rel}`);
      return 1;
    }
    // A minimal case is minimal. A file bigger than the whole fixture's budget is not evidence,
    // it is the repository arriving one path at a time.
    if (raw.length > REPRO_CAPS.bytes) {
      status(
        "FAIL",
        `too large: ${rel}`,
        `${raw.length} bytes against a ${REPRO_CAPS.bytes}-byte cap — cut it down first`
      );
      return 1;
    }
    const clean = sanitize(raw, { root });
    const target = path.join(dir, path.basename(rel));
    writeFile(target, clean.text);
    included.push({ as: path.basename(rel), redactions: clean.removed });
    status(
      "PASS",
      `included ${path.basename(rel)}`,
      clean.removed.length
        ? `redacted ${clean.removed.map((r) => `${r.count} ${r.kind}`).join(", ")}`
        : "nothing to redact"
    );
  }

  if (flags["with-memory"]) {
    // A separate process on purpose: a command never imports another command for its effects
    // (01_ARCHITECTURE.md). The fixture gets a real memory, built by the real `init`.
    try {
      execFileSync(
        process.execPath,
        [path.join(packageRoot, "bin", "devia.mjs"), "init", "--root", dir, "--no-agents", "--yes"],
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
      );
      status("PASS", "memory initialised in the fixture");
    } catch (e) {
      status("WARN", "could not initialise a memory in the fixture", String(e.message).slice(0, 120));
    }
  }

  const stats = reproStats(dir);
  record.reproduction = {
    path: "repro",
    built: new Date().toISOString().slice(0, 10),
    included,
    files: stats.files,
    bytes: stats.bytes,
  };
  save(deviaDir, record);

  if (stats.overCap) {
    status("WARN", "over the minimal-case cap", `${stats.files} files, ${stats.bytes} bytes`);
  }
  line("");
  line(color.dim(`  Make it fail, then: devia contribute verify ${record.id}`));
  line("");
  return 0;
}

function cmdVerify(ctx, id) {
  const { deviaDir, flags } = ctx;
  const record = load(deviaDir, id);
  if (!record) {
    status("FAIL", `no such candidate: ${id}`);
    return 1;
  }
  const gaps = missing(record);
  if (gaps.length) {
    status("FAIL", `${record.id} is incomplete`, `missing ${gaps.join(", ")}`);
    return 1;
  }
  if (record.source === "manual") {
    status("SKIP", `${record.id} is a manual proposal`, "there is no observation to re-run");
    return 0;
  }

  const dir = reproDir(deviaDir, record);
  if (!dir || !exists(dir)) {
    status("FAIL", "no reproduction", `run \`devia contribute repro ${record.id}\` first`);
    return 1;
  }

  const checkout = flags.devia ? path.resolve(String(flags.devia)) : packageRoot;
  const bin = path.join(checkout, "bin", "devia.mjs");
  if (!exists(bin)) {
    status("FAIL", "not a devia checkout", bin);
    return 1;
  }

  const run = runObservation(record, { cwd: dir, deviaBin: bin });
  const result = verdict(record, run);

  const claim = claimHash(record);
  // The two digests are what bind the verdict to the experiment: which fixture ran, and which
  // devia ran it. A `fixed` record has to agree about the first and disagree about the second.
  const evidence = {
    ran: new Date().toISOString().slice(0, 10),
    claim,
    fixture: fixtureHash(dir),
    devia: sourceHash(checkout),
    against: checkout === packageRoot ? "installed" : checkout,
    deviaVersion: environment().version,
  };
  record.verification = { ...evidence, exit: run.code, outcome: result.outcome, note: result.note };
  // Kept alongside the latest run, because `fixed` means devia saw the problem and then saw it
  // gone. One run can only ever be half of that.
  if (result.outcome === "reproduced") record.reproduced = evidence;
  save(deviaDir, record);

  if (ctx.json) {
    const state = stateOf(record);
    console.log(
      JSON.stringify({ ok: state !== "rejected", id: record.id, state, verification: record.verification }, null, 2)
    );
    return state === "rejected" ? 1 : 0;
  }

  const state = stateOf(record);
  const chain = evidenceChain(record);
  heading(`devia contribute verify — ${record.id}`);
  line(`  ${color.dim("ran")}      devia ${run.argv.join(" ")}`);
  line(`  ${color.dim("in")}       ${dir}`);
  line(`  ${color.dim("against")}  ${record.verification.against}`);
  line(`  ${color.dim("fixture")}  ${record.verification.fixture || "unhashed"}`);
  line(`  ${color.dim("devia")}    ${record.verification.devia || "unhashed"}`);
  line("");
  status(state === "rejected" ? "FAIL" : "PASS", state, result.note);

  // A broken chain is the interesting case: the behaviour changed, but not for a reason that
  // proves anything. Saying so is the whole point of hashing the two runs.
  if (chain.breaks.length) {
    for (const b of chain.breaks) status("WARN", "evidence chain", b);
    line("");
    line(color.dim("  Recorded as reproduced, not fixed. Restore the fixture that failed, then"));
    line(color.dim("  verify again with --devia pointing at the checkout that carries the fix."));
  }

  if (result.outcome === "inconclusive") {
    line("");
    line(color.dim("  Neither profile matched, so nothing is claimed. A candidate is eligible"));
    line(color.dim("  because devia reproduced it, never because the record says so (AGT-012)."));
    if (run.err) line(color.dim(`  stderr: ${run.err.split("\n")[0].slice(0, 140)}`));
  } else if (state === "rejected") {
    line("");
    line(color.dim("  The expected behaviour is what this fixture does, and devia has never seen"));
    line(color.dim("  it do anything else — so there is nothing here to report yet. Make the"));
    line(color.dim("  fixture fail first; a fix is only a fix once the problem was shown."));
  } else {
    line(color.dim(`  Next: ${NEXT[state]}`));
  }
  line("");
  return state === "rejected" ? 1 : 0;
}

/**
 * The payload, for a reader.
 *
 * The fixture is kept whole in the manifest on disk — a reproduction that reproduces is worth
 * more than a short file list — but a terminal that prints forty template files buries the two
 * that matter. So the documents are listed and the fixture is summed.
 */
function payloadLines(files) {
  const out = [];
  let reproFiles = 0;
  let reproBytes = 0;
  for (const f of manifest(files)) {
    if (f.name.startsWith("repro/")) {
      reproFiles++;
      reproBytes += f.bytes;
      continue;
    }
    out.push(`    ${String(f.bytes).padStart(6)} B  ${f.name}`);
  }
  if (reproFiles) {
    out.push(`    ${String(reproBytes).padStart(6)} B  repro/ — ${reproFiles} files`);
  }
  return out;
}

/** The payload, built and checked. Shared by `show` and `submit` so they cannot disagree. */
function buildPayload(ctx, record) {
  const { root, deviaDir } = ctx;
  const verdictOf = eligibility(record, { deviaDir });
  const dir = reproDir(deviaDir, record);
  const repro = dir && exists(dir) ? reproStats(dir) : null;

  // The fixture is read before the body is written, so the body can state what was redacted
  // instead of asserting that something was.
  const fixture = [];
  if (repro) {
    for (const rel of repro.list) {
      const raw = read(path.join(dir, rel));
      if (raw === null) continue;
      fixture.push({ name: `repro/${rel}`, raw });
    }
  }
  const redacted = redactions(record, { root, reproFiles: fixture.map((f) => f.raw) });

  const body = renderBody(record, { route: verdictOf.route, repro, root, redacted });
  const title = sanitize(renderTitle(record), { root }).text;

  const files = [
    { name: "TITLE.txt", content: title + "\n" },
    { name: verdictOf.route === "pull_request" ? "PR.md" : "ISSUE.md", content: body },
    ...fixture.map((f) => ({ name: f.name, content: sanitize(f.raw, { root }).text })),
  ];

  return {
    verdict: verdictOf,
    title,
    body,
    files,
    repro,
    redacted,
    residue: payloadResidue(files),
  };
}

function cmdShow(ctx, id) {
  const { deviaDir } = ctx;
  const record = load(deviaDir, id);
  if (!record) {
    status("FAIL", `no such candidate: ${id}`);
    return 1;
  }
  const payload = buildPayload(ctx, record);

  if (ctx.json) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          record,
          state: stateOf(record),
          eligibility: {
            ok: payload.verdict.ok,
            route: payload.verdict.route,
            blockers: payload.verdict.blockers,
            notes: payload.verdict.notes,
          },
          payload: manifest(payload.files),
          residue: payload.residue,
          title: payload.title,
          body: payload.body,
        },
        null,
        2
      )
    );
    return 0;
  }

  heading(`devia contribute show — ${record.id}`);
  line(`  ${color.dim("state")}   ${stateOf(record)}`);
  line(`  ${color.dim("route")}   ${payload.verdict.route || "nothing yet"}`);
  line("");
  line(payload.title);
  line("");
  line(payload.body);
  line(color.bold("What would be sent"));
  for (const l of payloadLines(payload.files)) line(l);
  line("");
  for (const b of payload.verdict.blockers) status("FAIL", "blocked", b);
  for (const n of payload.verdict.notes) status("INFO", "note", n);
  for (const r of payload.residue) status("FAIL", "not sanitized", r);
  line("");
  return 0;
}

function cmdSubmit(ctx, id) {
  const { root, deviaDir, flags } = ctx;
  const record = load(deviaDir, id);
  if (!record) {
    status("FAIL", `no such candidate: ${id}`);
    return 1;
  }

  // A fix is recorded here rather than inferred: devia never reads a diff it was not pointed at.
  if (flags["fix-repo"] || flags["fix-tests"] || flags.architectural) {
    const repo = flags["fix-repo"] ? path.resolve(String(flags["fix-repo"])) : record.fix?.repo;
    const fix = { ...(record.fix || {}), repo, architectural: Boolean(flags.architectural) };
    if (flags["fix-tests"]) fix.tests = csv(flags["fix-tests"]);
    if (repo) Object.assign(fix, diffSize(repo));
    record.fix = fix;
    save(deviaDir, record);
  }

  const config = settings(deviaDir);
  const payload = buildPayload(ctx, record);
  const v = payload.verdict;

  heading(`devia contribute submit — ${record.id}`);
  line(`  ${color.dim("type")}      ${record.type}`);
  line(`  ${color.dim("state")}     ${v.state}`);
  line(`  ${color.dim("route")}     ${v.route || "nothing to send"}`);
  line(`  ${color.dim("remote")}    ${config.remote || "unknown"}`);
  line(`  ${color.dim("identity")}  ${config.identity || color.yellow("not configured")}`);
  line("");

  // The payload is written whatever happens: a contribution nobody can read before it is sent
  // is a contribution nobody reviewed.
  const outDir = path.join(dirOf(deviaDir, record.id), "payload");
  fs.rmSync(outDir, { recursive: true, force: true });
  for (const f of payload.files) writeFile(path.join(outDir, f.name), f.content);
  writeFile(
    path.join(outDir, "MANIFEST.md"),
    "# What would be sent\n\n| Bytes | File | sha256 |\n|---|---|---|\n" +
      manifest(payload.files)
        .map((f) => `| ${f.bytes} | ${f.name} | ${f.sha256} |`)
        .join("\n") +
      "\n\nNothing else leaves this machine. Built by `devia contribute submit`.\n"
  );
  status("PASS", "payload written", path.relative(root, outDir).split(path.sep).join("/"));
  for (const l of payloadLines(payload.files)) line(l);
  line("");

  const refuse = (why, detail) => {
    status("FAIL", why, detail);
    line("");
    line(color.dim("  Nothing was sent. The payload above is on disk for you to read."));
    line("");
    return 1;
  };

  if (config.explicitlyDisabled) {
    return refuse("contribution is disabled here", 'devia.json: contribution.enabled is false');
  }
  if (payload.residue.length) {
    return refuse("the payload is not clean", payload.residue.join("; "));
  }
  for (const b of v.blockers) status("FAIL", "blocked", b);
  for (const n of v.notes) status("INFO", "note", n);
  if (!v.ok) {
    line("");
    line(color.dim("  Not eligible. A contribution leaves this machine only once devia itself"));
    line(color.dim("  reproduced the problem (AGT-012)."));
    line("");
    return 1;
  }
  if (v.route === "advisory") {
    return refuse("security defects are reported privately", "see SECURITY.md");
  }

  const remote = config.remote;
  const command =
    v.route === "pull_request"
      ? ["gh", "pr", "create", "--repo", remote, "--title", payload.title, "--body-file",
         path.join(outDir, "PR.md")]
      : ["gh", "issue", "create", "--repo", remote, "--title", payload.title, "--body-file",
         path.join(outDir, "ISSUE.md")];

  line("");
  line(color.bold("  Remote operation"));
  line(`    ${command.map((a) => (/\s/.test(a) ? `"${a}"` : a)).join(" ")}`);
  line("");

  if (!flags.yes) {
    status("SKIP", "not sent", "--yes authorises the remote operation");
    line("");
    line(color.dim("  devia holds no GitHub token and sends nothing on its own. Run the command"));
    line(color.dim("  above yourself, or re-run this with --yes to have gh run it."));
    line("");
    return 0;
  }

  const decision = identityCheck({
    identity: config.identity,
    owner: upstream()?.owner,
    lookup: ghAccount,
  });
  if (!decision.ok) return refuse(decision.why, decision.detail);

  if (v.route === "pull_request") {
    const pushed = v.fix?.repo ? tracking(v.fix.repo) : null;
    if (!pushed) {
      return refuse(
        "the fix branch is not pushed",
        "devia does not commit or push in your checkout — push the branch, then re-run"
      );
    }
    line(color.dim(`  head: ${pushed}`));
  }

  try {
    const out = execFileSync(command[0], command.slice(1), {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    status("PASS", `${v.route} created`, out.trim().split("\n").pop());
  } catch (e) {
    status("FAIL", "gh refused", String(e.stderr || e.message).split("\n")[0].slice(0, 160));
    return 1;
  }
  line("");
  return 0;
}

/** Size of the fix in a devia checkout, so the PR-versus-issue routing has a number to use. */
function diffSize(repo) {
  try {
    const out = execFileSync("git", ["diff", "--numstat", "HEAD"], {
      cwd: repo,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    const rows = out ? out.split("\n") : [];
    let lines = 0;
    for (const r of rows) {
      const [a, d] = r.split(/\s+/);
      lines += (Number(a) || 0) + (Number(d) || 0);
    }
    return { files: rows.length, lines };
  } catch {
    return {};
  }
}

/** The upstream branch a checkout is on, or null when nothing has been pushed. */
function tracking(repo) {
  try {
    return execFileSync("git", ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], {
      cwd: repo,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function cmdRemove(ctx, id) {
  const { deviaDir } = ctx;
  const record = load(deviaDir, id);
  if (!record) {
    status("FAIL", `no such candidate: ${id}`);
    return 1;
  }
  fs.rmSync(dirOf(deviaDir, record.id), { recursive: true, force: true });
  heading("devia contribute rm");
  status("PASS", record.id, "removed");
  line(color.dim("  The id is not reissued: the next candidate takes the following number."));
  line("");
  return 0;
}

export default async function contribute(ctx) {
  const { deviaDir, args, flags } = ctx;
  const action = args._[1] || "list";
  const id = args._[2] ? String(args._[2]).toUpperCase() : null;

  if (flags.help) {
    line(HELP.trim());
    return 0;
  }

  if (!exists(deviaDir)) {
    status("FAIL", "no .devia/", "run `devia init` first");
    return 1;
  }

  const config = settings(deviaDir);
  if (config.explicitlyDisabled && action !== "list") {
    heading("devia contribute");
    status("SKIP", "disabled for this repository", "devia.json: contribution.enabled is false");
    line("");
    return 0;
  }

  if (action === "list") return cmdList(ctx);
  if (action === "new") return cmdNew(ctx);

  if (["repro", "verify", "show", "submit", "rm"].includes(action)) {
    if (!id) {
      status("FAIL", `devia contribute ${action} needs an id`, "e.g. C1");
      return 2;
    }
    if (action === "repro") return cmdRepro(ctx, id);
    if (action === "verify") return cmdVerify(ctx, id);
    if (action === "show") return cmdShow(ctx, id);
    if (action === "submit") return cmdSubmit(ctx, id);
    if (action === "rm") return cmdRemove(ctx, id);
  }

  status("FAIL", `unknown action: ${action}`);
  line(HELP.trim());
  return 2;
}

export { buildPayload, ghAccount };
