import process from "node:process";
import path from "node:path";
import { packageRoot, findProjectRoot } from "./lib/fs.mjs";
import { cliVersion, standardVersion } from "./lib/version.mjs";
import { color, line } from "./lib/ui.mjs";

const COMMANDS = {
  init: () => import("./commands/init.mjs"),
  validate: () => import("./commands/validate.mjs"),
  check: () => import("./commands/check.mjs"),
  doctor: () => import("./commands/doctor.mjs"),
  rules: () => import("./commands/rules.mjs"),
  read: () => import("./commands/read.mjs"),
  context: () => import("./commands/context.mjs"),
  contribute: () => import("./commands/contribute.mjs"),
  sync: () => import("./commands/sync.mjs"),
  skills: () => import("./commands/skills.mjs"),
  decide: () => import("./commands/decide.mjs"),
  update: () => import("./commands/update.mjs"),
  gap: () => import("./commands/registry.mjs"),
  debt: () => import("./commands/registry.mjs"),
};

const HELP = `
${color.bold("devia")} — one standard, one memory

  ${color.bold("devia init")}        create .devia/ and the agent adapters in this repository
  ${color.bold("devia validate")}    check memory integrity (structure, registries, placeholders)
  ${color.bold("devia check")}       readiness gates — P0 failures exit non-zero
  ${color.bold("devia doctor")}      adoption, drift and staleness diagnosis
  ${color.bold("devia rules")}       list or show rules from the registry
  ${color.bold("devia read")}        render the memory as one self-contained page
  ${color.bold("devia context")}     the smallest sufficient context for one task
  ${color.bold("devia sync")}        pin the standard under .devia/standard/, or refresh it
  ${color.bold("devia skills")}      install the agent adapters (install --agent all)
  ${color.bold("devia decide")}      the decision register — what is decided, pending, delegated
  ${color.bold("devia gap")}         add or close a line in 11_GAPS.md
  ${color.bold("devia debt")}        add or close a line in 12_DEBT.md
  ${color.bold("devia contribute")}  turn a devia problem you hit here into an issue or a PR
  ${color.bold("devia update")}      is there a newer devia, and what does it bring? (you decide)

Common flags

  --root <dir>     operate on another directory (default: the repository root)
  --json           machine-readable output where supported
  --help           command help
  --version        print the devia and standard versions

Docs: AGENTS.md · MEMORY.md · rules/README.md
`;

export function parseArgs(argv) {
  const args = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const [key, inline] = a.slice(2).split("=");
      const next = argv[i + 1];
      if (inline !== undefined) args.flags[key] = inline;
      else if (next && !next.startsWith("--")) args.flags[key] = argv[++i];
      else args.flags[key] = true;
    } else if (a.startsWith("-") && a.length > 1) {
      args.flags[a.slice(1)] = true;
    } else {
      args._.push(a);
    }
  }
  return args;
}

export function context(args) {
  const cwd = path.resolve(process.cwd());
  const given = args.flags.root ? path.resolve(String(args.flags.root)) : null;
  const root = given || findProjectRoot(cwd);
  return {
    root,
    cwd,
    // The root was inferred by walking up, and it is not where the user is standing. A command
    // that writes asks before acting on it; commands that only read do not care.
    rootAwayFromCwd: !given && root !== cwd,
    deviaDir: path.join(root, ".devia"),
    packageRoot,
    args,
    flags: args.flags,
    json: Boolean(args.flags.json),
  };
}

export function versions() {
  return { cli: cliVersion(), standard: standardVersion() };
}

export async function run(argv) {
  const args = parseArgs(argv);
  const command = args._[0];

  if (args.flags.version || command === "version") {
    const { cli, standard } = versions();
    console.log(`devia ${cli} · standard ${standard}`);
    return 0;
  }
  if (!command || command === "help" || (args.flags.help && !command)) {
    console.log(HELP.trim());
    return 0;
  }

  const load = COMMANDS[command];
  if (!load) {
    console.error(`unknown command: ${command}`);
    console.log(HELP.trim());
    return 2;
  }

  const ctx = context(args);
  const mod = await load();
  const code = await mod.default(ctx, command);
  await announceUpdate(ctx, command);
  return typeof code === "number" ? code : 0;
}

/**
 * One line, after the command, when a newer devia is already known to exist.
 *
 * Read from the cache only — no command acquires a network call by carrying this notice, and
 * whether devia may look at all is decided in `src/lib/update.mjs`. Suppressed for machine
 * output, because `--json` is a contract and prose on stdout breaks whatever is parsing it; and
 * for `update` itself, which has just said the same thing at length.
 */
async function announceUpdate(ctx, command) {
  if (ctx.json || command === "update" || !ctx.flags || ctx.flags.help) return;
  try {
    const { status: updateStatus } = await import("./lib/update.mjs");
    const { noticeLines } = await import("./commands/update.mjs");
    const { readJSON } = await import("./lib/fs.mjs");
    const config = readJSON(path.join(ctx.deviaDir, "devia.json"));
    const report = updateStatus(ctx.deviaDir, { config });
    if (!report.allowed) return;
    const lines = noticeLines(report, undefined);
    if (!lines.length) return;
    line("");
    for (const l of lines) line(`  ${l}`);
    line("");
  } catch {
    // A notice is never worth failing a command over.
  }
}
