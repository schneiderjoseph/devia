import fs from "node:fs";
import path from "node:path";
import { packageRoot, exists, read, writeFile, writeJSON, copyDir, walk } from "../lib/fs.mjs";
import { parseYaml } from "../lib/yaml.mjs";
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

/** Vendored into `.devia/standard/` so any agent can read the standard offline. */
const VENDOR = [
  "AGENTS.md",
  "PRINCIPLES.md",
  "MEMORY.md",
  "LEVELS.md",
  "MATURITY.md",
  "GOVERNANCE.md",
  "REFERENCES.md",
  "VERSION",
];
const VENDOR_DIRS = ["rules", "checklists", "standard", "compliance", "schema"];

function standardVersion() {
  const v = parseYaml(read(path.join(packageRoot, "VERSION")) || "");
  return v.standard_version || "0.0.0";
}

function detectProfile(root) {
  const pkg = path.join(root, "package.json");
  if (exists(pkg)) {
    const json = JSON.parse(read(pkg) || "{}");
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
  const candidates = ["src", "app", "lib", "packages", "server", "api", "web", "components"];
  return candidates.filter((c) => exists(path.join(root, c)));
}

function fill(text, vars) {
  return text.replace(/\{\{(\w+)\}\}/g, (m, key) => (key in vars ? vars[key] : m));
}

export default async function init(ctx) {
  const { root, deviaDir, flags } = ctx;

  if (flags.help) {
    line(`
${color.bold("devia init")} — create .devia/ in this repository

  --root <dir>        target repository (default: detected root)
  --profile <name>    ${Object.keys(PROFILES).join(" | ")}
  --force             overwrite existing memory files (dangerous: they hold your decisions)
  --no-agents         do not write the agent adapters
  --no-vendor         do not vendor the standard into .devia/standard/
`.trim());
    return 0;
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
  const vars = {
    PROJECT_NAME: name,
    DEVIA_VERSION: version,
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
      deviaVersion: version,
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

  // 3. Vendored standard
  if (flags.vendor === false || flags["no-vendor"]) {
    status("SKIP", "standard not vendored", "--no-vendor");
  } else {
    const dest = path.join(deviaDir, "standard");
    fs.rmSync(dest, { recursive: true, force: true });
    let files = 0;
    for (const f of VENDOR) {
      const src = path.join(packageRoot, f);
      if (exists(src)) {
        writeFile(path.join(dest, f), read(src));
        files++;
      }
    }
    for (const d of VENDOR_DIRS) files += copyDir(path.join(packageRoot, d), path.join(dest, d));
    writeFile(
      path.join(dest, "PINNED.md"),
      `# Pinned standard\n\nVendored by \`devia init\` on ${vars.DATE}.\n\n` +
        `- devia version: ${version}\n- standard version: ${version}\n\n` +
        "Do not edit these files. Change the standard upstream, then run `npx devia sync`.\n"
    );
    status("PASS", `standard vendored: ${files + 1} files`, `v${version}`);
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
