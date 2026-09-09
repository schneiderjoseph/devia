/**
 * A Markdown subset, rendered to HTML.
 *
 * The same reasoning as `yaml.mjs`: devia writes the files it reads. The memory templates use
 * headings, tables, fenced code, lists, blockquotes, rules and a few inline marks — so that is
 * what this renders. Anything outside the subset survives as escaped text rather than being
 * silently swallowed, because a reader that drops a line is worse than one that shows it plainly.
 *
 * A dependency would be the easy answer here, and `ARC-004` says it is not available.
 */

const ESCAPES = [
  ["&", "&amp;"],
  ["<", "&lt;"],
  [">", "&gt;"],
  ['"', "&quot;"],
];

export function escapeHtml(text) {
  let out = String(text);
  for (const [from, to] of ESCAPES) out = out.split(from).join(to);
  return out;
}

/**
 * Inline marks, applied to already-escaped text. Code spans are lifted out first so their
 * contents are never re-parsed. The placeholder is NUL-delimited on purpose: prose contains
 * " 12 ", and a placeholder prose can produce turns a number into a code span.
 */
const MARK = "\u0000";

function inline(text) {
  const spans = [];
  let out = text.replace(/`([^`]+)`/g, (_, code) => {
    spans.push(code);
    return `${MARK}${spans.length - 1}${MARK}`;
  });

  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
    const safe = /^(https?:|mailto:|#|[\w./-])/.test(href) ? href : "#";
    return `<a href="${safe}">${label}</a>`;
  });
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,;:!?]|$)/g, "$1<em>$2</em>");

  // Regex littérale avec des échappements \u0000 : aucun octet de contrôle dans la source.
  return out.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${spans[Number(i)]}</code>`);
}

function isTableSeparator(line) {
  return /^\|[\s:|-]+\|$/.test(line.trim()) && line.includes("-");
}

function cells(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => inline(c.trim()));
}

/** Render a Markdown subset to an HTML fragment. */
export function renderMarkdown(source) {
  const lines = escapeHtml(source).split(/\r?\n/);
  const html = [];
  let i = 0;

  const flushList = (tag, items) => {
    html.push(`<${tag}>`);
    for (const item of items) html.push(`<li>${inline(item)}</li>`);
    html.push(`</${tag}>`);
  };

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    // Fenced code: kept verbatim, never re-parsed.
    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      const body = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) body.push(lines[i++]);
      i++;
      const lang = fence[1] ? ` data-lang="${fence[1]}"` : "";
      html.push(`<pre${lang}><code>${body.join("\n")}</code></pre>`);
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      html.push(`<h${level}>${inline(heading[2].trim())}</h${level}>`);
      i++;
      continue;
    }

    if (/^(-{3,}|\*{3,})\s*$/.test(line.trim())) {
      html.push("<hr>");
      i++;
      continue;
    }

    // Table: a header row followed by a separator row.
    if (line.trim().startsWith("|") && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const head = cells(line);
      i += 2;
      const body = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) body.push(cells(lines[i++]));
      html.push("<table><thead><tr>");
      for (const c of head) html.push(`<th>${c}</th>`);
      html.push("</tr></thead><tbody>");
      for (const row of body) {
        html.push("<tr>");
        for (const c of row) html.push(`<td>${c}</td>`);
        html.push("</tr>");
      }
      html.push("</tbody></table>");
      continue;
    }

    // Les lignes sont déjà échappées : le chevron d'une citation y est "&gt;", pas ">".
    if (/^&gt;\s?/.test(line)) {
      const quote = [];
      while (i < lines.length && /^&gt;\s?/.test(lines[i])) {
        quote.push(lines[i++].replace(/^&gt;\s?/, ""));
      }
      html.push(`<blockquote>${inline(quote.join(" "))}</blockquote>`);
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        let item = lines[i++].replace(/^\s*[-*]\s+/, "");
        // A wrapped bullet continues on the next indented, non-marker line.
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*[-*]\s+/.test(lines[i])) {
          item += " " + lines[i++].trim();
        }
        items.push(item);
      }
      flushList("ul", items);
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        let item = lines[i++].replace(/^\s*\d+\.\s+/, "");
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*\d+\.\s+/.test(lines[i])) {
          item += " " + lines[i++].trim();
        }
        items.push(item);
      }
      flushList("ol", items);
      continue;
    }

    // Paragraph: consecutive plain lines, joined.
    const para = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,4}\s|```|&gt;|\s*[-*]\s|\s*\d+\.\s|\|)/.test(lines[i])
    ) {
      para.push(lines[i++].trim());
    }
    if (para.length) html.push(`<p>${inline(para.join(" "))}</p>`);
    // A line the subset does not recognise is shown as written, never dropped.
    else html.push(`<p>${inline(lines[i++].trim())}</p>`);
  }

  return html.join("\n");
}
