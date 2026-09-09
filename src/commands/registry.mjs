import path from "node:path";
import { exists, read, writeFile } from "../lib/fs.mjs";
import { color, heading, status, line } from "../lib/ui.mjs";
import { registryIds } from "./validate.mjs";

const REGISTRIES = {
  gap: {
    file: "11_GAPS.md",
    prefix: "G",
    label: "gap",
    subjectCol: 1, // ID | Question | Impact if wrong | Interim behaviour | Status
    row: (id, text) => `| ${id} | ${text} | | | open |`,
    rule: "MEM-001",
  },
  debt: {
    file: "12_DEBT.md",
    prefix: "D",
    label: "debt",
    subjectCol: 3, // ID | Rule | Where | What is missing | Priority | Opened
    row: (id, text, flags) =>
      `| ${id} | ${flags.rule || ""} | ${flags.where || ""} | ${text} | ${
        String(flags.priority || "P2").toUpperCase()
      } | ${new Date().toISOString().slice(0, 10)} |`,
    rule: "MEM-002",
  },
};

const TEMPLATE_ROW = /^\|\s*[GD]\d+\s*\|\s*TODO\(devia\)/;

function nextId(text, prefix) {
  const ids = registryIds(text, prefix);
  const max = ids.reduce((a, r) => Math.max(a, r.n), 0);
  return `${prefix}${max + 1}`;
}

/** Insert a row after the last row of the first table in the file. */
function insertRow(text, row) {
  const lines = text.split("\n");
  let lastRow = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\|/.test(lines[i])) lastRow = i;
    if (/^##\s+(Closed|Discharged)/i.test(lines[i])) break;
  }
  if (lastRow < 0) return text.trimEnd() + "\n\n" + row + "\n";
  lines.splice(lastRow + 1, 0, row);
  return lines.join("\n");
}

export default async function registry(ctx, command) {
  const { deviaDir, args, flags } = ctx;
  const spec = REGISTRIES[command];
  const action = args._[1];
  const text = args._.slice(2).join(" ").trim();

  if (flags.help || !action || (action === "add" && !text)) {
    line(`
${color.bold(`devia ${command}`)} — the ${spec.label} registry (${spec.rule})

  devia ${command} add "<what>"        add a line with the next id
  devia ${command} list                show the open lines
  devia ${command} close <ID> "<by>"   move a line to the closed section

${command === "debt" ? "  --rule <ID>  --where <path>  --priority P0|P1|P2|P3\n" : ""}
A line is never deleted by a change that did not discharge it (MEM-003, MEM-011).
`.trim());
    return flags.help ? 0 : 2;
  }

  const file = path.join(deviaDir, spec.file);
  if (!exists(file)) {
    status("FAIL", `${spec.file} not found`, "run `devia init`");
    return 1;
  }
  let content = read(file) || "";

  if (action === "list") {
    heading(`open ${spec.label} lines`);
    const rows = [];
    for (const l of content.split("\n")) {
      if (/^##\s+(Closed|Discharged)/i.test(l)) break;
      if (new RegExp(`^\\|\\s*${spec.prefix}\\d+\\s*\\|`).test(l)) rows.push(l);
    }
    if (!rows.length) status("INFO", "no open lines");
    for (const r of rows) line("  " + r);
    line("");
    return 0;
  }

  if (action === "add") {
    // A template row is a placeholder, not a record: the first real line replaces it.
    const lines = content.split("\n");
    const templateAt = lines.findIndex((l) => TEMPLATE_ROW.test(l));
    if (templateAt >= 0) lines.splice(templateAt, 1);
    content = lines.join("\n");

    const id = nextId(content, spec.prefix);
    content = insertRow(content, spec.row(id, text, flags));
    writeFile(file, content);
    heading(`${spec.label} added`);
    status("PASS", id, text);
    line(color.dim(`  ${spec.file} — verify the claim before you trust it (MEM-005)`));
    line("");
    return 0;
  }

  if (action === "close") {
    const id = String(args._[1 + 1] || "").toUpperCase();
    const by = args._.slice(3).join(" ").trim();
    if (!id || !by) {
      status("FAIL", "usage", `devia ${command} close <ID> "closed by <what>"`);
      return 2;
    }
    // Splice the row out rather than blanking it: a blank line ends a markdown table, so every
    // row below the closed one would render as loose text instead.
    const rowRe = new RegExp(`^\\|\\s*${id}\\s*\\|`);
    const rows = content.split("\n");
    const at = rows.findIndex((l) => rowRe.test(l));
    if (at < 0) {
      status("FAIL", `${id} not found in ${spec.file}`);
      return 1;
    }
    const [closed] = rows.splice(at, 1);
    // An empty template row is a placeholder, not a record — dropped, not emptied.
    content = rows.filter((l) => !/^\|(\s*\|)+\s*$/.test(l)).join("\n");

    const cells = closed.split("|").slice(1, -1).map((c) => c.trim());
    const subject = cells[spec.subjectCol] || cells[1] || "";
    const closedRow = `| ${id} | ${subject} | ${by} |`;
    const idx = content.search(/^##\s+(Closed|Discharged)/im);
    if (idx < 0) {
      content = content.trimEnd() + `\n\n## Closed\n\n| ID | Subject | Closed by |\n|---|---|---|\n${closedRow}\n`;
    } else {
      const lines = content.split("\n");
      let insertAt = lines.length;
      let inSection = false;
      for (let i = 0; i < lines.length; i++) {
        if (/^##\s+(Closed|Discharged)/i.test(lines[i])) inSection = true;
        else if (inSection && /^\|/.test(lines[i])) insertAt = i + 1;
      }
      lines.splice(insertAt, 0, closedRow);
      content = lines.join("\n");
    }
    content = content.replace(/\n{3,}/g, "\n\n");
    writeFile(file, content);
    heading(`${spec.label} closed`);
    status("PASS", id, by);
    line(color.dim("  Closure names the change that closed it (MEM-003)."));
    line("");
    return 0;
  }

  status("FAIL", `unknown action: ${action}`);
  return 2;
}
