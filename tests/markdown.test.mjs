import { test } from "node:test";
import assert from "node:assert/strict";
import { renderMarkdown, escapeHtml } from "../src/lib/markdown.mjs";

test("escapes before anything else, so memory content cannot inject markup", () => {
  const html = renderMarkdown('A line with <script>alert("x")</script> in it.');
  assert.ok(!html.includes("<script>"));
  assert.match(html, /&lt;script&gt;/);
  assert.equal(escapeHtml('a & b < c > d "e"'), "a &amp; b &lt; c &gt; d &quot;e&quot;");
});

test("renders the blocks the memory templates actually use", () => {
  const html = renderMarkdown(
    [
      "# Title",
      "",
      "> A quote that spans",
      "> two lines.",
      "",
      "| Rule | Where |",
      "|---|---|",
      "| MEM-001 | `rules/` |",
      "",
      "- first",
      "- second",
      "",
      "1. step one",
      "2. step two",
      "",
      "```bash",
      "devia check --root .",
      "```",
    ].join("\n")
  );
  assert.match(html, /<h1>Title<\/h1>/);
  assert.match(html, /<blockquote>A quote that spans two lines\.<\/blockquote>/);
  assert.match(html, /<th>Rule<\/th>/);
  assert.match(html, /<td><code>rules\/<\/code><\/td>/);
  assert.match(html, /<ul>\n<li>first<\/li>/);
  assert.match(html, /<ol>\n<li>step one<\/li>/);
  assert.match(html, /<pre data-lang="bash"><code>devia check --root \.<\/code><\/pre>/);
});

// The code-span placeholder used to be a bare number between spaces, which prose produces.
test("a number in prose is not mistaken for a code span", () => {
  const html = renderMarkdown("There are 12 tables and `one` code span.");
  assert.match(html, /There are 12 tables/);
  assert.match(html, /<code>one<\/code>/);
  assert.equal((html.match(/<code>/g) || []).length, 1);
});

test("fenced code is never re-parsed as markdown", () => {
  const html = renderMarkdown(["```", "| not | a | table |", "- not a list", "**not bold**", "```"].join("\n"));
  assert.ok(!html.includes("<table>"));
  assert.ok(!html.includes("<li>"));
  assert.ok(!html.includes("<strong>"));
});

test("inline marks, and a link that keeps its target", () => {
  const html = renderMarkdown("See [the index](14_INDEX.md) for **what** matters.");
  assert.match(html, /<a href="14_INDEX\.md">the index<\/a>/);
  assert.match(html, /<strong>what<\/strong>/);
});

test("a line outside the subset is shown, never dropped", () => {
  const html = renderMarkdown("##### deeper than the subset goes");
  assert.match(html, /deeper than the subset goes/);
});
