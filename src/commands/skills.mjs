import os from "node:os";
import path from "node:path";
import process from "node:process";
import { packageRoot, exists, read, writeFile } from "../lib/fs.mjs";
import { color, heading, status, line } from "../lib/ui.mjs";

/** agent key -> [template file, target path relative to the repository root] */
export const ADAPTERS = {
  universal: ["AGENTS.md", "AGENTS.md"],
  claude: ["CLAUDE.md", "CLAUDE.md"],
  cursor: ["cursor.mdc", path.join(".cursor", "rules", "devia.mdc")],
  copilot: ["copilot-instructions.md", path.join(".github", "copilot-instructions.md")],
  windsurf: ["windsurfrules.md", ".windsurfrules"],
};

const SKILL_TARGETS = {
  cursor: path.join(".cursor", "skills", "devia", "SKILL.md"),
  claude: path.join(".claude", "skills", "devia", "SKILL.md"),
};

export function installAdapters(root, { force = false, agents = Object.keys(ADAPTERS) } = {}) {
  const written = [];
  const kept = [];
  for (const key of agents) {
    const entry = ADAPTERS[key];
    if (!entry) continue;
    const [template, target] = entry;
    const dest = path.join(root, target);
    if (exists(dest) && !force) {
      kept.push(key);
      continue;
    }
    const content = read(path.join(packageRoot, "templates", "agents", template));
    if (content === null) continue;
    writeFile(dest, content);
    written.push(key);
  }
  return { written, kept };
}

const SKILL_PACK = path.join("skills", "devia", "SKILL.md");
const adapter = (file) => path.join("templates", "agents", file);

/**
 * Where each agent keeps a contract that applies to every project, not one.
 *
 * devia is for every agent, so an agent is listed here as soon as its user-level location is
 * known — and reported as SKIP with the reason when it is not. Each entry carries the file the
 * agent actually reads: a skill pack where the agent loads skills, its own rules format
 * otherwise. Guessing a path inside someone's home directory is the confident wrong answer this
 * tool exists to prevent, so absence of evidence is reported, never rounded up.
 */
function globalTargets() {
  const home = os.homedir();
  const configDir = (envVar, fallback) =>
    process.env[envVar] ? path.resolve(process.env[envVar]) : path.join(home, fallback);

  return {
    claude: {
      target: path.join(configDir("CLAUDE_CONFIG_DIR", ".claude"), "skills", "devia", "SKILL.md"),
      source: SKILL_PACK,
    },
    codex: {
      target: path.join(configDir("CODEX_HOME", ".codex"), "skills", "devia", "SKILL.md"),
      source: SKILL_PACK,
    },
    cursor: {
      target: path.join(home, ".cursor", "rules", "devia.mdc"),
      source: adapter("cursor.mdc"),
    },
    gemini: {
      // One file the user owns, not a directory devia can add to: written only when it is
      // absent or empty, so a global instruction file is never silently replaced.
      target: path.join(home, ".gemini", "GEMINI.md"),
      source: adapter("AGENTS.md"),
      onlyWhenEmpty: true,
    },
    copilot: {
      reason: "user-level instructions live in the editor's settings, not a file devia can place",
    },
    windsurf: {
      reason: "no user-level rules file — .windsurfrules is per repository",
    },
  };
}

/**
 * Install the contract once for every project. This is the only path that writes outside
 * `--root`: it happens behind `--global`, and it prints every path it touches
 * (`04_PERMISSIONS.md`).
 */
export function installGlobalSkill({ force = false } = {}) {
  const written = [];
  const kept = [];
  const skipped = [];

  for (const [key, entry] of Object.entries(globalTargets())) {
    if (!entry.target) {
      skipped.push([key, entry.reason]);
      continue;
    }
    const content = read(path.join(packageRoot, entry.source));
    if (content === null) {
      skipped.push([key, `${entry.source} missing from the installed package`]);
      continue;
    }
    if (exists(entry.target) && !force) {
      const current = read(entry.target) || "";
      if (entry.onlyWhenEmpty && current.trim()) {
        skipped.push([key, `${path.basename(entry.target)} already has content — add the contract yourself`]);
        continue;
      }
      if (current.trim()) {
        kept.push([key, entry.target]);
        continue;
      }
    }
    writeFile(entry.target, content);
    written.push([key, entry.target]);
  }
  return { written, kept, skipped };
}

export function installSkill(root, { force = false, agents = Object.keys(SKILL_TARGETS) } = {}) {
  const skill = read(path.join(packageRoot, "skills", "devia", "SKILL.md"));
  const written = [];
  const kept = [];
  for (const key of agents) {
    const target = SKILL_TARGETS[key];
    if (!target || skill === null) continue;
    const dest = path.join(root, target);
    if (exists(dest) && !force) {
      kept.push(key);
      continue;
    }
    writeFile(dest, skill);
    written.push(key);
  }
  return { written, kept };
}

export default async function skills(ctx) {
  const { root, flags, args } = ctx;
  const action = args._[1] || "install";

  if (flags.help || !["install", "list"].includes(action)) {
    line(`
${color.bold("devia skills")} — the same contract for every coding agent

  devia skills list
  devia skills install [--agent all|${Object.keys(ADAPTERS).join("|")}] [--force] [--skill]
  devia skills install --global [--force]

  --skill    also install skills/devia/SKILL.md for Cursor and Claude Code
  --global   install the skill for every project, in the agent's own configuration
             directory. The only command that writes outside --root; it prints
             every path it touches
`.trim());
    return flags.help ? 0 : 2;
  }

  if (flags.global) {
    const res = installGlobalSkill({ force: Boolean(flags.force) });
    heading("devia skills install --global");
    for (const [key, target] of res.written) status("PASS", key, target);
    for (const [key, target] of res.kept) status("SKIP", `${key} — already there`, target);
    for (const [key, reason] of res.skipped) status("SKIP", key, reason);
    line("");
    line(color.dim("  The skill is now available in every project. It still expects each"));
    line(color.dim("  repository to carry its own .devia/ — the skill says how to create one."));
    line("");
    return 0;
  }

  if (action === "list") {
    heading("Adapters");
    for (const [key, [, target]] of Object.entries(ADAPTERS)) {
      const there = exists(path.join(root, target));
      status(there ? "PASS" : "SKIP", key.padEnd(10), target.split(path.sep).join("/"));
    }
    line("");
    return 0;
  }

  const wanted = flags.agent && flags.agent !== "all" ? String(flags.agent).split(",") : undefined;
  const res = installAdapters(root, { force: Boolean(flags.force), agents: wanted });

  heading("devia skills install");
  for (const key of res.written) status("PASS", key, "written");
  for (const key of res.kept) status("SKIP", key, "already present — use --force");

  if (flags.skill) {
    const s = installSkill(root, { force: Boolean(flags.force) });
    for (const key of s.written) status("PASS", `${key} skill`, "written");
    for (const key of s.kept) status("SKIP", `${key} skill`, "already present");
  }
  line("");
  return 0;
}
