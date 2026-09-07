import path from "node:path";
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

  --skill    also install skills/devia/SKILL.md for Cursor and Claude Code
`.trim());
    return flags.help ? 0 : 2;
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
