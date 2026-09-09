import fs from "node:fs";
import path from "node:path";
import { packageRoot, exists, read, writeFile, writeJSON, walk } from "../lib/fs.mjs";
import { trackedFiles } from "../lib/git.mjs";
import { cliVersion, standardVersion } from "../lib/version.mjs";
import { vendorStandard } from "../lib/vendor.mjs";
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
  status(written ? "PASS" : "SKIP", `memory files: ${written} written`, kept ? `${kept} kept` : "");

  // 2. Configuration
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
      waivers: [],
      initializedAt: vars.DATE,
    });
    status("PASS", "devia.json written");
  } else {
    status("SKIP", "devia.json kept", "use --force to regenerate");
  }

  // 3. Pinned standard — opt-in. Vendoring writes ~390 files a project did not author, which
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

  // 4. Agent adapters
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
  line(`  1. Fill ${color.bold(".devia/00_OVERVIEW.md")} from what this repository actually is`);
  line("  2. Move known issues into 11_GAPS.md (undecided) and 12_DEBT.md (decided, not built)");
  line("  3. Write the real commands into 13_RECIPES.md and .devia/AGENTS.md");
  line("  4. Run " + color.bold("npx devia validate") + " and " + color.bold("npx devia check"));
  line("");
  line(color.dim("  Commit .devia/ — it is part of the repository, not a scratch pad."));
  if (existed && !force) {
    line(color.dim("  Existing memory files were kept. --force overwrites them."));
  }
  line("");
  return 0;
}

export { PROFILES, ADAPTERS };
