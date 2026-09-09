import path from "node:path";
import { exists, read, writeFile, walk } from "../lib/fs.mjs";
import { renderMarkdown, escapeHtml } from "../lib/markdown.mjs";
import { cliVersion } from "../lib/version.mjs";
import { color, heading, status, line } from "../lib/ui.mjs";

/**
 * The memory, as one page a human can read.
 *
 * Self-contained on purpose: the content is embedded, so the file opens by double-click with no
 * server, no network and no CDN. A reader that needs a running server is a reader nobody opens.
 */

/** Reading order: the contract first, then the numbered files, then whatever else is there. */
function order(files) {
  const rank = (f) => {
    if (f === "AGENTS.md") return -2;
    if (f === "README.md") return -1;
    const n = f.match(/^(\d+)_/);
    return n ? Number(n[1]) : 999;
  };
  return files.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

function title(file) {
  if (file === "AGENTS.md") return "AGENTS";
  const body = file.replace(/\.md$/, "");
  const m = body.match(/^(\d+)_(.*)$/);
  return m ? `${m[1]} · ${m[2].replace(/_/g, " ")}` : body.replace(/_/g, " ");
}

const STYLE = `
:root{--ink:#121826;--ink-line:#222F45;--paper:#fff;--canvas:#EFEEEA;--line:#E7E7EA;
--muted:#6B7280;--muted-d:rgba(229,231,235,.62);--text-d:#E5E7EB;--accent:#FF5A5F;
--mono:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,monospace}
*{box-sizing:border-box}
body{margin:0;background:var(--canvas);color:var(--ink);
font:15px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;display:flex;min-height:100vh}
nav{width:290px;flex:0 0 290px;background:var(--ink);color:var(--text-d);position:sticky;top:0;
height:100vh;overflow:auto;padding:22px 16px}
nav h1{font-size:13px;letter-spacing:.28em;text-transform:uppercase;font-family:var(--mono);
color:var(--muted-d);margin:0 0 4px}
nav .sub{font-size:12px;color:var(--muted-d);margin-bottom:18px;line-height:1.4}
nav a{display:block;padding:7px 10px;border-radius:8px;color:var(--text-d);text-decoration:none;
font-size:13px;margin-bottom:2px}
nav a:hover{background:rgba(255,255,255,.06)}
nav a.active{background:rgba(255,90,95,.16);outline:1px solid rgba(255,90,95,.25)}
main{flex:1;min-width:0;padding:44px 56px;background:var(--paper)}
article{max-width:820px;display:none}
article.active{display:block}
h1,h2,h3,h4{line-height:1.25;margin:1.8em 0 .6em}
h1{font-size:30px;margin-top:0}h2{font-size:22px}h3{font-size:17px}h4{font-size:15px}
h2{border-top:1px solid var(--line);padding-top:1.2em}
p{margin:.7em 0}
a{color:var(--accent)}
code{font-family:var(--mono);font-size:.88em;background:var(--canvas);padding:2px 5px;border-radius:4px}
pre{background:var(--ink);color:var(--text-d);padding:16px 18px;border-radius:10px;overflow:auto}
pre code{background:none;color:inherit;padding:0;font-size:12.5px;line-height:1.55}
table{border-collapse:collapse;width:100%;margin:1.1em 0;font-size:14px;display:block;overflow-x:auto}
th,td{border:1px solid var(--line);padding:8px 11px;text-align:left;vertical-align:top}
th{background:var(--canvas);font-weight:600}
blockquote{margin:1.1em 0;padding:2px 0 2px 16px;border-left:3px solid var(--accent);color:var(--muted)}
hr{border:0;border-top:1px solid var(--line);margin:2em 0}
ul,ol{padding-left:1.3em}li{margin:.3em 0}
footer{margin-top:48px;padding-top:16px;border-top:1px solid var(--line);
font-family:var(--mono);font-size:11px;color:var(--muted)}
@media(max-width:820px){body{display:block}nav{width:auto;height:auto;position:static}main{padding:28px 20px}}
`;

const SCRIPT = `
var links = [].slice.call(document.querySelectorAll('nav a'));
var docs = [].slice.call(document.querySelectorAll('article'));
function show(id) {
  docs.forEach(function (d) { d.classList.toggle('active', d.id === id); });
  links.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + id); });
  if (location.hash !== '#' + id) history.replaceState(null, '', '#' + id);
  window.scrollTo(0, 0);
}
links.forEach(function (a) {
  a.addEventListener('click', function (e) { e.preventDefault(); show(a.getAttribute('href').slice(1)); });
});
// A link between memory files jumps inside the page instead of asking the filesystem for it.
[].slice.call(document.querySelectorAll('article a')).forEach(function (a) {
  var href = a.getAttribute('href') || '';
  if (!/^[^/:#]+\\.md(#.*)?$/.test(href)) return;
  var id = 'doc-' + href.split('#')[0].replace(/\\.md$/, '');
  if (!document.getElementById(id)) return;
  a.addEventListener('click', function (e) { e.preventDefault(); show(id); });
});
show((location.hash || '').slice(1) || docs[0].id);
`;

export default async function readCommand(ctx) {
  const { root, deviaDir, flags } = ctx;

  if (flags.help) {
    line(`
${color.bold("devia read")} — the memory as one self-contained page

  --root <dir>   repository to read
  --out <file>   where to write (default: .devia/reader.html)

The page embeds the memory: it opens by double-click, with no server and no network.
Regenerate it after changing the memory — it is a snapshot, never the source.
`.trim());
    return 0;
  }

  if (!exists(deviaDir)) {
    status("FAIL", "no .devia/", "run `devia init` first");
    return 1;
  }

  const files = order(walk(deviaDir, { filter: (f) => f.endsWith(".md") && !f.includes(path.sep) }));
  if (!files.length) {
    status("FAIL", "no memory files to read", ".devia/ holds no markdown");
    return 1;
  }

  const project = path.basename(root);
  const nav = [];
  const articles = [];
  for (const file of files) {
    const id = `doc-${file.replace(/\.md$/, "")}`;
    nav.push(`<a href="#${id}">${escapeHtml(title(file))}</a>`);
    articles.push(
      `<article id="${id}">\n${renderMarkdown(read(path.join(deviaDir, file)) || "")}\n` +
        `<footer>${escapeHtml(file)} · .devia/</footer></article>`
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(project)} — memory</title>
<style>${STYLE}</style></head>
<body>
<nav><h1>${escapeHtml(project)}</h1>
<div class="sub">Project memory · read before the code, updated with it</div>
${nav.join("\n")}
</nav>
<main>
${articles.join("\n")}
</main>
<script>${SCRIPT}</script>
</body></html>
`;

  const out = flags.out ? path.resolve(String(flags.out)) : path.join(deviaDir, "reader.html");
  writeFile(out, html);

  heading(`devia read — ${project}`);
  status("PASS", `${files.length} memory files rendered`, `${Math.round(html.length / 1024)} kB`);
  status("PASS", "written", out);
  line("");
  line(color.dim("  Open it directly — no server needed. Regenerate after changing the memory."));
  line(color.dim(`  Generated ${today} by devia ${cliVersion()}.`));
  line("");
  return 0;
}
