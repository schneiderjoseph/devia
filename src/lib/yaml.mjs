/**
 * Minimal YAML subset parser — enough for rule frontmatter, VERSION and impact maps.
 *
 * Supports: nested mappings, lists of scalars, inline empty list `[]`, block scalars
 * (`>` folded, `|` literal), quoted scalars, `#` comments, booleans and numbers.
 *
 * Deliberately not a full YAML implementation: devia ships no runtime dependencies, and the
 * files it parses are files it also writes. Anything this parser cannot read is a file the
 * standard does not ask anyone to write.
 */

function scalar(raw) {
  const v = raw.trim();
  if (v === "" || v === "~" || v === "null") return null;
  if (v === "true") return true;
  if (v === "false") return false;
  if (/^-?\d+$/.test(v)) return Number(v);
  if (/^-?\d*\.\d+$/.test(v)) return Number(v);
  if (/^"(.*)"$/.test(v)) return v.slice(1, -1).replace(/\\"/g, '"');
  if (/^'(.*)'$/.test(v)) return v.slice(1, -1);
  if (v === "[]") return [];
  if (v === "{}") return {};
  if (/^\[.*\]$/.test(v)) {
    return v
      .slice(1, -1)
      .split(",")
      .map((s) => scalar(s))
      .filter((s) => s !== null);
  }
  return v;
}

function stripComment(line) {
  // Only strip a comment that starts the line or follows whitespace outside quotes.
  let out = "";
  let quote = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) {
      out += c;
      if (c === quote && line[i - 1] !== "\\") quote = null;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      out += c;
      continue;
    }
    if (c === "#" && (i === 0 || /\s/.test(line[i - 1]))) break;
    out += c;
  }
  return out.replace(/\s+$/, "");
}

function indentOf(line) {
  return line.length - line.replace(/^\s+/, "").length;
}

/** Parse a YAML subset document into a plain object. */
export function parseYaml(text) {
  const lines = String(text)
    .split(/\r?\n/)
    .map(stripComment)
    .map((l, i) => ({ i, raw: l }))
    .filter((l) => l.raw.trim() !== "");

  let pos = 0;

  function parseBlock(minIndent) {
    let result = null;
    while (pos < lines.length) {
      const { raw } = lines[pos];
      const ind = indentOf(raw);
      if (ind < minIndent) break;
      const trimmed = raw.trim();

      // An empty collection written on its own line: `success_criteria:\n  []`
      if (trimmed === "[]" || trimmed === "{}") {
        pos++;
        return trimmed === "[]" ? [] : {};
      }

      if (trimmed.startsWith("- ") || trimmed === "-") {
        if (result === null) result = [];
        if (!Array.isArray(result)) break;
        pos++;
        const item = trimmed === "-" ? "" : trimmed.slice(2);
        if (item.includes(": ") || /:$/.test(item)) {
          // list of mappings: re-parse the item as a mapping line at a deeper indent
          const sub = { i: -1, raw: " ".repeat(ind + 2) + item };
          lines.splice(pos, 0, sub);
          result.push(parseBlock(ind + 2));
        } else {
          result.push(scalar(item));
        }
        continue;
      }

      const m = trimmed.match(/^([^:]+):\s*(.*)$/);
      if (!m) {
        pos++;
        continue;
      }
      if (result === null) result = {};
      if (Array.isArray(result)) break;
      const key = m[1].trim().replace(/^["']|["']$/g, "");
      const rest = m[2];
      pos++;

      if (rest === ">" || rest === "|" || rest === ">-" || rest === "|-") {
        const folded = rest.startsWith(">");
        const buf = [];
        while (pos < lines.length && indentOf(lines[pos].raw) > ind) {
          buf.push(lines[pos].raw.trim());
          pos++;
        }
        result[key] = folded ? buf.join(" ").trim() : buf.join("\n");
        continue;
      }

      if (rest === "") {
        const next = lines[pos];
        if (next && indentOf(next.raw) > ind) {
          result[key] = parseBlock(indentOf(next.raw));
        } else {
          result[key] = null;
        }
        continue;
      }

      result[key] = scalar(rest);
    }
    return result === null ? {} : result;
  }

  return parseBlock(0);
}

/** Split `---` frontmatter from a markdown body. */
export function parseFrontmatter(text) {
  const src = String(text).replace(/^﻿/, "");
  if (!/^---\r?\n/.test(src)) return { data: null, body: src };
  const end = src.indexOf("\n---", 3);
  if (end < 0) return { data: null, body: src, error: "unclosed frontmatter" };
  const raw = src.slice(src.indexOf("\n") + 1, end);
  const body = src.slice(src.indexOf("\n", end + 1) + 1);
  try {
    return { data: parseYaml(raw), body, raw };
  } catch (e) {
    return { data: null, body, error: e.message };
  }
}
