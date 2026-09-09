import process from "node:process";
import path from "node:path";
import { packageRoot, findProjectRoot } from "./lib/fs.mjs";
import { cliVersion, standardVersion } from "./lib/version.mjs";
import { color } from "./lib/ui.mjs";

const COMMANDS = {
  init: () => import("./commands/init.mjs"),
  validate: () => import("./commands/validate.mjs"),
  check: () => import("./commands/check.mjs"),
  doctor: () => import("./commands/doctor.mjs"),
  rules: () => import("./commands/rules.mjs"),
  sync: () => import("./commands/sync.mjs"),
  skills: () => import("./commands/skills.mjs"),
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
  ${color.bold("devia sync")}        refresh the vendored standard after upgrading devia
  ${color.bold("devia skills")}      install the agent adapters (install --agent all)
  ${color.bold("devia gap")}         add or close a line in 11_GAPS.md
  ${color.bold("devia debt")}        add or close a line in 12_DEBT.md

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

  const mod = await load();
  const code = await mod.default(context(args), command);
  return typeof code === "number" ? code : 0;
}
