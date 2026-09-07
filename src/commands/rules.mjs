import path from "node:path";
import { loadRules, ruleStats } from "../lib/rules.mjs";
import { exists, read, packageRoot } from "../lib/fs.mjs";
import { color, heading, line, status } from "../lib/ui.mjs";
import { parseFrontmatter } from "../lib/yaml.mjs";

/** Prefer the copy pinned in the project; fall back to the installed package. */
function rulesDir(ctx) {
  const vendored = path.join(ctx.deviaDir, "standard", "rules");
  return exists(vendored) ? vendored : path.join(packageRoot, "rules");
}

export default async function rules(ctx) {
  const { flags } = ctx;

  if (flags.help) {
    line(`
${color.bold("devia rules")} — the rule registry

  devia rules                       list every active rule
  devia rules --id SEC-001          show one rule in full
  devia rules --domain security     filter by domain
  devia rules --priority P0         filter by priority
  devia rules --severity "MUST NOT" filter by severity
  devia rules --search webhook      filter by text
  devia rules --stats               counts only
  devia rules --json                machine-readable
`.trim());
    return 0;
  }

  const dir = rulesDir(ctx);
  const { rules: all, errors } = loadRules(dir);

  if (errors.length && !ctx.json) {
    for (const e of errors) status("WARN", "registry", e);
  }

  if (flags.id) {
    const id = String(flags.id).toUpperCase();
    const rule = all.find((r) => r.id === id);
    if (!rule) {
      console.error(`no such rule: ${id}`);
      return 1;
    }
    const file = path.join(dir, rule.file);
    if (ctx.json) {
      const { body } = parseFrontmatter(read(file) || "");
      console.log(JSON.stringify({ ...rule, body }, null, 2));
      return 0;
    }
    line("");
    line(read(file) || "");
    return 0;
  }

  let list = all;
  if (flags.domain) list = list.filter((r) => r.domain === String(flags.domain));
  if (flags.priority) list = list.filter((r) => r.priority === String(flags.priority).toUpperCase());
  if (flags.severity)
    list = list.filter((r) => r.severity === String(flags.severity).toUpperCase());
  if (flags.status) list = list.filter((r) => r.status === String(flags.status));
  else list = list.filter((r) => r.status === "active");
  if (flags.search) {
    const q = String(flags.search).toLowerCase();
    list = list.filter((r) =>
      `${r.id} ${r.title} ${r.requirement}`.toLowerCase().includes(q)
    );
  }

  if (ctx.json) {
    console.log(JSON.stringify({ count: list.length, rules: list }, null, 2));
    return 0;
  }

  if (flags.stats) {
    const s = ruleStats(list);
    heading(`Rules — ${s.total}`);
    for (const [k, v] of Object.entries(s.priority).sort()) line(`  ${k}  ${v}`);
    line("");
    for (const [k, v] of Object.entries(s.domain).sort()) line(`  ${k.padEnd(16)} ${v}`);
    line("");
    return 0;
  }

  heading(`Rules (${list.length})`);
  let domain = null;
  for (const r of list) {
    if (r.domain !== domain) {
      domain = r.domain;
      line(`\n  ${color.bold(domain)}`);
    }
    const tag =
      r.priority === "P0" ? color.red(r.priority) : r.priority === "P1" ? color.yellow(r.priority) : color.gray(r.priority);
    line(`    ${tag} ${color.bold(r.id.padEnd(9))} ${r.severity.padEnd(8)} ${r.title}`);
  }
  line("");
  line(color.dim(`  devia rules --id <ID> for the full text · source: ${path.relative(ctx.root, dir).split(path.sep).join("/") || dir}`));
  line("");
  return 0;
}
