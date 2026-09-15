import fs from "node:fs";
import path from "node:path";
import { packageRoot, exists, read, readJSON, writeFile, writeJSON, walk } from "../lib/fs.mjs";
import { trackedFiles } from "../lib/git.mjs";
import { cliVersion, standardVersion } from "../lib/version.mjs";
import { vendorStandard } from "../lib/vendor.mjs";
import { DEFAULT_BUDGET } from "../lib/context.mjs";
import { REGISTER_FILE, slotsForProfile, renderSlot } from "../lib/decisions.mjs";
import { optionalMemoryFor } from "./validate.mjs";
import { color, heading, status, line } from "../lib/ui.mjs";
import { installAdapters, ADAPTERS } from "./skills.mjs";

const PROFILES = {
  "web-app": "Web or SaaS application: UI, API, database",
  service: "Backend service or API without its own UI",
  library: "Library or package consumed by other code",
  cli: "Command line tool",
  "design-system": "Component library or design system",
  docs: "Documentation or content repository",
};

const REGISTER_HEADER = `# The decision register — what this project owes an explicit answer to.
#
#   decided       a human ruled; the value is binding
#   pending       nobody has ruled — do not encode an answer (DEC-001)
#   delegated     the agent may choose, within bounded_by (DEC-002)
#   not_required  deliberately not needed here
#
# A missing answer is a recorded state, never an empty space for the next agent to fill in.
# Read it with \`devia decide\`; write it with \`devia decide set | delegate | drop | open\`.
#
# Optional fields that give a slot teeth:
#   path:     the file this decision delivers — checked to exist once decided (DEC-005)
#   package:  the dependency it pins — compared with the manifest (DEC-003)
#   blocks:   paths that must not exist while this is pending — a P0 gate (DEC-001)

version: 1

decisions:
`;

/** The register for a profile, every slot pending and owned by a human until somebody rules. */
function registerFor(profile) {
  const body = slotsForProfile(profile)
    .sort((a, b) => a.key.localeCompare(b.key))
    .map(({ key, question }) => renderSlot(key, { question, status: "pending", owner: "human" }))
    .join("\n");
  return REGISTER_HEADER + body + "\n";
}

/**
 * Every package.json in the repository, nearest to the root first. A monorepo keeps its real
 * manifest in `apps/web/` or `packages/*`, and a profile detected from the root alone falls back
 * to a default while the evidence sits one directory down.
 */
function findManifests(root) {
  const tracked = trackedFiles(root);
  if (!tracked) return exists(path.join(root, "package.json")) ? ["package.json"] : [];
  return tracked
    .filter((f) => /(^|\/)package\.json$/.test(f) && !f.includes("node_modules/"))
    .sort((a, b) => a.split("/").length - b.split("/").length || a.localeCompare(b));
}

function detectProfile(root) {
  for (const manifest of findManifests(root)) {
    const json = JSON.parse(read(path.join(root, manifest)) || "{}");
    const deps = { ...json.dependencies, ...json.devDependencies };
    if (json.bin) return "cli";
    if (deps.next || deps.react || deps.vue || deps.svelte || deps["@angular/core"])
      return "web-app";
    if (deps.express || deps.fastify || deps["@nestjs/core"]) return "service";
    if (json.main || json.exports) return "library";
  }
  if (exists(path.join(root, "pyproject.toml")) || exists(path.join(root, "requirements.txt")))
    return "service";
  if (exists(path.join(root, "go.mod")) || exists(path.join(root, "Cargo.toml"))) return "service";
  return "web-app";
}

function detectName(root) {
  const pkg = path.join(root, "package.json");
  if (exists(pkg)) {
    try {
      const name = JSON.parse(read(pkg)).name;
      if (name) return String(name).replace(/^@[^/]+\//, "");
    } catch {
      /* fall through to the directory name */
    }
  }
  return path.basename(root);
}

function detectCodePaths(root) {
  const candidates = ["src", "app", "apps", "lib", "packages", "server", "api", "web", "components"];
  const found = candidates.filter((c) => exists(path.join(root, c)));
  // The directory holding a manifest is code by definition, wherever it sits.
  for (const manifest of findManifests(root)) {
    const dir = path.posix.dirname(manifest);
    if (dir !== "." && !found.some((f) => dir === f || dir.startsWith(`${f}/`))) found.push(dir);
  }
  return found;
}

function fill(text, vars) {
  return text.replace(/\{\{(\w+)\}\}/g, (m, key) => (key in vars ? vars[key] : m));
}

export default async function init(ctx) {
  const { root, deviaDir, flags, rootAwayFromCwd } = ctx;

  if (flags.help) {
    line(`
${color.bold("devia init")} — create .devia/ in this repository

  --root <dir>        target repository (default: detected root)
  --profile <name>    ${Object.keys(PROFILES).join(" | ")}
  --force             overwrite existing memory files (dangerous: they hold your decisions)
  --no-agents         do not write the agent adapters
  --vendor            pin a copy of the standard into .devia/standard/ (~390 files)
  --yes               accept a detected root that is not the current directory
`.trim());
    return 0;
  }

  // `init` writes. When the root was detected rather than given, and it is not where the user is
  // standing, stop and say so: a memory created in a parent repository is not something the
  // output can undo afterwards.
  if (rootAwayFromCwd && !flags.yes) {
    status("FAIL", `init would write into ${root}`, "not the current directory");
    line("");
    line(`  ${color.bold("--root .")} to create the memory here, or ${color.bold("--yes")} to accept that root.`);
    line("");
    return 2;
  }

  const force = Boolean(flags.force);
  const profile = String(flags.profile || detectProfile(root));
  if (!PROFILES[profile]) {
    console.error(`unknown profile: ${profile}`);
    console.error(`known profiles: ${Object.keys(PROFILES).join(", ")}`);
    return 2;
  }

  const name = detectName(root);
  const version = standardVersion();
  const cli = cliVersion();
  const vars = {
    PROJECT_NAME: name,
    DEVIA_VERSION: cli,
    DATE: new Date().toISOString().slice(0, 10),
  };

  heading(`devia init — ${name}`);
  line(`  ${color.dim("root")}     ${root}`);
  line(`  ${color.dim("profile")}  ${profile} — ${PROFILES[profile]}`);
  line("");

  const existed = exists(deviaDir);
  fs.mkdirSync(deviaDir, { recursive: true });

  // 1. Memory files
  const templateDir = path.join(packageRoot, "templates", "project");
  let written = 0;
  let kept = 0;
  for (const rel of walk(templateDir)) {
    const target = path.join(deviaDir, rel);
    if (exists(target) && !force) {
      kept++;
      continue;
    }
    writeFile(target, fill(read(path.join(templateDir, rel)) || "", vars));
    written++;
  }
  const optionalDir = path.join(packageRoot, "templates", "optional");
  for (const rel of optionalMemoryFor(profile)) {
    const target = path.join(deviaDir, rel);
    if (exists(target) && !force) {
      kept++;
      continue;
    }
    writeFile(target, fill(read(path.join(optionalDir, rel)) || "", vars));
    written++;
  }
  status(written ? "PASS" : "SKIP", `memory files: ${written} written`, kept ? `${kept} kept` : "");

  // 1b. The decision register, seeded from the profile.
  //
  // Generated rather than copied: which decisions a project owes depends on what it is, and a
  // register that asks a CLI tool for its brand typography is a register nobody reads twice.
  // Never regenerated without --force — every slot in it is somebody's ruling.
  const registerPath = path.join(deviaDir, REGISTER_FILE);
  if (!exists(registerPath) || force) {
    writeFile(registerPath, registerFor(profile));
    const n = slotsForProfile(profile).length;
    status("PASS", `${REGISTER_FILE}: ${n} slots`, "all pending — `devia decide` rules on them");
  } else {
    status("SKIP", `${REGISTER_FILE} kept`, "it holds decisions, not defaults");
  }

  // 2. What inside the memory is generated rather than authored.
  //
  // A nested .gitignore, not an edit to the project's own: devia owns `.devia/`, and appending
  // to a file the user wrote is not a thing `init` should do silently. The name is written
  // rather than shipped as a template file because npm does not carry a `.gitignore` inside a
  // published package.
  const ignorePath = path.join(deviaDir, ".gitignore");
  if (!exists(ignorePath) || force) {
    writeFile(
      ignorePath,
      "# Generated by devia, rebuilt on demand — the memory itself is committed.\n" +
        "reader.html\n" +
        ".update-check.json\n" +
        "contributions/*/payload/\n"
    );
  }

  // 3. Configuration
  const configPath = path.join(deviaDir, "devia.json");
  if (!exists(configPath) || force) {
    writeJSON(configPath, {
      deviaVersion: cli,
      standardVersion: version,
      project: { name, profile },
      maturity: { target: "gold", current: "bronze" },
      code: { paths: detectCodePaths(root) },
      modules: {
        engineering: true,
        design: profile !== "service" && profile !== "cli" && profile !== "library",
        memory: true,
      },
      // Written so the knob is visible rather than folklore. `contribution` carries no identity:
      // the local half needs none, and the half that can publish must stay impossible until
      // somebody deliberately names an account.
      context: { budget: DEFAULT_BUDGET, mode: "advisory" },
      contribution: { enabled: true },
      // Written on, so turning it off is an edit somebody can see in a diff rather than an
      // environment variable somebody has to know exists. It is off in CI regardless.
      update: { check: true },
      waivers: [],
      initializedAt: vars.DATE,
    });
    status("PASS", "devia.json written");
  } else {
    status("SKIP", "devia.json kept", "use --force to regenerate");
  }

  // 4. Pinned standard — opt-in. Vendoring writes ~390 files a project did not author, which
  // buries the memory it is supposed to serve: on a real repository the ratio was 17 files of
  // memory to 391 of copy, and every `sync` produced a 391-file diff. The rules stay reachable
  // through `devia rules`, and `devia sync` pins the copy for whoever needs it offline.
  if (flags.vendor && flags.vendor !== "false") {
    const files = vendorStandard(path.join(deviaDir, "standard"), {
      by: "devia init",
      cli,
      standard: version,
      date: vars.DATE,
    });
    status("PASS", `standard pinned: ${files} files`, `v${version}`);
  } else {
    status("SKIP", "standard not pinned", "`devia sync` writes .devia/standard/ when you need it");
  }

  // 5. Agent adapters
  if (flags.agents === false || flags["no-agents"]) {
    status("SKIP", "agent adapters not written", "--no-agents");
  } else {
    const res = installAdapters(root, { force });
    status(
      "PASS",
      `agent adapters: ${res.written.length} written`,
      res.kept.length ? `kept ${res.kept.join(", ")}` : ""
    );
  }

  heading("Next");
  line(`  1. Rule on the register: ${color.bold("npx devia decide")} — every slot is pending until you do`);
  line(`  2. Fill ${color.bold(".devia/00_OVERVIEW.md")} from what this repository actually is`);
  line("  3. Move known issues into 11_GAPS.md (undecided) and 12_DEBT.md (decided, not built)");
  line("  4. Write the real commands into 13_RECIPES.md and .devia/AGENTS.md");
  line("  5. Run " + color.bold("npx devia validate") + " and " + color.bold("npx devia check"));
  line("");
  line(color.dim("  Commit .devia/ — it is part of the repository, not a scratch pad."));
  if (existed && !force) {
    line(color.dim("  Existing memory files were kept. --force overwrites them."));
  }
  line("");
  return 0;
}

export { PROFILES, ADAPTERS };
