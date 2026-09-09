import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { packageRoot } from "../src/lib/fs.mjs";

const bin = path.join(packageRoot, "bin", "devia.mjs");

function scratch() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "devia-test-"));
  fs.writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify({ name: "scratch-app", version: "1.0.0" }, null, 2)
  );
  return dir;
}

// Node warns on stderr when NO_COLOR and FORCE_COLOR are both set, so the child inherits neither
// of the parent's colour settings.
const { FORCE_COLOR, ...cleanEnv } = process.env;

// stdout is a contract: `--json` is parsed from it. Merging stderr into it on failure turned a
// harmless runtime warning into unparseable JSON, and only for whoever had FORCE_COLOR set.
function devia(args, cwd, { allowFailure = false, env = {} } = {}) {
  const options = { cwd, encoding: "utf8", env: { ...cleanEnv, NO_COLOR: "1", ...env } };
  try {
    return { code: 0, out: execFileSync(process.execPath, [bin, ...args], options), err: "" };
  } catch (e) {
    if (!allowFailure) throw e;
    return { code: e.status ?? 1, out: e.stdout || "", err: e.stderr || "" };
  }
}

test("init creates the memory, the config and the adapters", () => {
  const dir = scratch();
  try {
    devia(["init", "--root", dir, "--no-vendor"], dir);
    for (const f of ["00_OVERVIEW.md", "11_GAPS.md", "12_DEBT.md", "devia.json", "impact-map.yaml"]) {
      assert.ok(fs.existsSync(path.join(dir, ".devia", f)), `missing .devia/${f}`);
    }
    assert.ok(fs.existsSync(path.join(dir, "AGENTS.md")));
    assert.ok(fs.existsSync(path.join(dir, ".cursor", "rules", "devia.mdc")));
    const config = JSON.parse(fs.readFileSync(path.join(dir, ".devia", "devia.json"), "utf8"));
    assert.equal(config.project.name, "scratch-app");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("init does not overwrite a filled memory without --force", () => {
  const dir = scratch();
  try {
    devia(["init", "--root", dir, "--no-vendor"], dir);
    const file = path.join(dir, ".devia", "00_OVERVIEW.md");
    fs.writeFileSync(file, "# 00 — Overview\n\nA real overview.\n");
    devia(["init", "--root", dir, "--no-vendor"], dir);
    assert.match(fs.readFileSync(file, "utf8"), /A real overview/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("validate fails when there is no memory at all", () => {
  const dir = scratch();
  try {
    const res = devia(["validate", "--root", dir], dir, { allowFailure: true });
    assert.equal(res.code, 1);
    assert.match(res.out, /no \.devia/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("validate reports placeholders but does not block a bronze project", () => {
  const dir = scratch();
  try {
    devia(["init", "--root", dir, "--no-vendor"], dir);
    const res = devia(["validate", "--root", dir, "--json"], dir);
    const report = JSON.parse(res.out);
    assert.equal(report.ok, true);
    assert.ok(report.counts.WARN > 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("validate detects a reused registry id", () => {
  const dir = scratch();
  try {
    devia(["init", "--root", dir, "--no-vendor"], dir);
    const file = path.join(dir, ".devia", "12_DEBT.md");
    fs.appendFileSync(file, "\n| D1 | | | duplicate | P2 | |\n| D1 | | | again | P2 | |\n");
    const res = devia(["validate", "--root", dir, "--json"], dir, { allowFailure: true });
    assert.equal(res.code, 1);
    assert.match(res.out, /duplicate id D1/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("check blocks on P0 and explains why", () => {
  const dir = scratch();
  try {
    devia(["init", "--root", dir, "--no-vendor"], dir);
    const res = devia(["check", "--root", dir, "--json"], dir, { allowFailure: true });
    const report = JSON.parse(res.out);
    assert.equal(res.code, 1);
    assert.equal(report.ok, false);
    assert.ok(report.blocking.includes("CI-PRESENT"));
    assert.ok(report.blocking.includes("TST-PRESENT"));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("a P0 blocker comes from the priority cell, never from prose", () => {
  const dir = scratch();
  try {
    devia(["init", "--root", dir], dir);
    const file = path.join(dir, ".devia", "12_DEBT.md");
    const of = () => {
      const out = devia(["check", "--root", dir, "--json"], dir, { allowFailure: true }).out;
      return JSON.parse(out).results.find((r) => r.id === "MEM-DEBT-P0");
    };

    // A P1 line that merely mentions P0 in its text is not a P0 blocker.
    fs.appendFileSync(file, "\n| D1 | TST-001 | app | Becomes P0 once payments ship | P1 | |\n");
    assert.equal(of().kind, "PASS");

    // A line whose priority cell is P0 blocks.
    fs.appendFileSync(file, "| D2 | SEC-001 | app | No authorization on write | P0 | |\n");
    const blocked = of();
    assert.equal(blocked.kind, "FAIL");
    assert.match(blocked.detail, /1 P0 debt line/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("check finds a committed secret", () => {
  const dir = scratch();
  try {
    devia(["init", "--root", dir, "--no-vendor"], dir);
    // Built from parts so this repository does not itself contain a secret-shaped string:
    // the file written to disk is what the scanner has to catch.
    const key = "AKIA" + "IOSFODNN7EXAMPLE";
    fs.writeFileSync(path.join(dir, "config.js"), `export const key = "${key}";\n`);
    const res = devia(["check", "--root", dir, "--json"], dir, { allowFailure: true });
    const report = JSON.parse(res.out);
    const secret = report.results.find((r) => r.id === "SEC-SECRETS");
    assert.equal(secret.kind, "FAIL");
    assert.match(secret.detail, /config\.js/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("--json keeps stdout parseable when the environment forces colour", () => {
  const dir = scratch();
  try {
    devia(["init", "--root", dir, "--no-vendor"], dir);
    let stdout;
    try {
      // Both variables set on purpose: this is the shape that made Node warn on stderr.
      stdout = execFileSync(process.execPath, [bin, "check", "--root", dir, "--json"], {
        cwd: dir,
        encoding: "utf8",
        env: { ...cleanEnv, NO_COLOR: "1", FORCE_COLOR: "1" },
      });
    } catch (e) {
      stdout = e.stdout || "";
    }
    const report = JSON.parse(stdout);
    assert.equal(report.ok, false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("gap and debt lines get monotone ids and are not deleted on close", () => {
  const dir = scratch();
  try {
    devia(["init", "--root", dir, "--no-vendor"], dir);
    devia(["gap", "add", "First question", "--root", dir], dir);
    devia(["gap", "add", "Second question", "--root", dir], dir);
    devia(["debt", "add", "Missing idempotency", "--rule", "API-004", "--root", dir], dir);
    const gaps = fs.readFileSync(path.join(dir, ".devia", "11_GAPS.md"), "utf8");
    assert.match(gaps, /\| G1 \| First question/);
    assert.match(gaps, /\| G2 \| Second question/);

    devia(["debt", "close", "D1", "shipped in abc123", "--root", dir], dir);
    const debt = fs.readFileSync(path.join(dir, ".devia", "12_DEBT.md"), "utf8");
    assert.match(debt, /## Discharged/);
    assert.match(debt, /\| D1 \| Missing idempotency \| shipped in abc123 \|/);

    // The id is retired, never reissued (MEM-004).
    devia(["debt", "add", "Another thing", "--root", dir], dir);
    const after = fs.readFileSync(path.join(dir, ".devia", "12_DEBT.md"), "utf8");
    assert.match(after, /\| D2 \|\s*\|\s*\| Another thing/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("closing a line keeps the open table contiguous", () => {
  const dir = scratch();
  try {
    devia(["init", "--root", dir, "--no-vendor"], dir);
    for (const what of ["First", "Second", "Third"]) {
      devia(["debt", "add", what, "--root", dir], dir);
    }
    devia(["debt", "close", "D2", "shipped in abc123", "--root", dir], dir);

    const lines = fs.readFileSync(path.join(dir, ".devia", "12_DEBT.md"), "utf8").split("\n");
    const open = lines.slice(0, lines.findIndex((l) => /^##\s+Discharged/.test(l)));
    const first = open.findIndex((l) => l.startsWith("| D1"));
    const last = open.findIndex((l) => l.startsWith("| D3"));
    assert.ok(first > 0 && last > first, "both surviving lines must still be listed");
    // A blank line between them would end the table and orphan every row below the closed one.
    assert.deepEqual(
      open.slice(first, last + 1).filter((l) => !l.startsWith("|")),
      []
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// A manifest one directory down is as real as one at the root. Reading only the root reported
// "no package.json" to a project that had one, which is a wrong answer wearing a SKIP.
test("check reads a manifest that is not at the repository root", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "devia-mono-"));
  try {
    const web = path.join(dir, "apps", "web");
    fs.mkdirSync(web, { recursive: true });
    fs.writeFileSync(
      path.join(web, "package.json"),
      JSON.stringify({ name: "web", scripts: { build: "next build" }, dependencies: { next: "15" } })
    );
    fs.writeFileSync(path.join(web, "package-lock.json"), "{}\n");

    devia(["init", "--root", dir, "--no-vendor"], dir);
    const report = JSON.parse(
      devia(["check", "--root", dir, "--json"], dir, { allowFailure: true }).out
    );
    const of = (id) => report.results.find((r) => r.id === id);

    // The lockfile sits next to the manifest it locks, not at the root.
    assert.equal(of("OPS-LOCKFILE").kind, "PASS");
    assert.match(of("OPS-LOCKFILE").detail, /apps\/web\/package-lock\.json/);
    // A missing test script is a finding, not an absence of evidence, and it names where it looked.
    assert.equal(of("TST-SCRIPT").kind, "WARN");
    assert.match(of("TST-SCRIPT").detail, /apps\/web\/package\.json/);
    // Dependencies are read wherever they are declared, so the profile follows the evidence.
    assert.equal(of("OBS-ERRORS").kind, "WARN");
    const config = JSON.parse(fs.readFileSync(path.join(dir, ".devia", "devia.json"), "utf8"));
    assert.equal(config.project.profile, "web-app");
    assert.ok(config.code.paths.includes("apps"), "the tree holding the manifest is code");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("skills install writes outside the project only behind --global", () => {
  const dir = scratch();
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "devia-home-"));
  // os.homedir() reads USERPROFILE on Windows and HOME elsewhere: no real home is touched.
  const at = { USERPROFILE: home, HOME: home };
  const claude = path.join(home, ".claude", "skills", "devia", "SKILL.md");
  const codex = path.join(home, ".codex", "skills", "devia", "SKILL.md");
  const cursor = path.join(home, ".cursor", "rules", "devia.mdc");
  const gemini = path.join(home, ".gemini", "GEMINI.md");
  try {
    // Without the flag, nothing outside --root may be touched (04_PERMISSIONS.md).
    devia(["skills", "install", "--root", dir], dir, { env: at });
    assert.ok(!fs.existsSync(path.join(home, ".claude")), "a plain install stays in the repository");

    const res = devia(["skills", "install", "--global", "--root", dir], dir, { env: at });

    // Each agent gets the file it actually reads: a skill pack where skills are loaded, the
    // agent's own rules format otherwise.
    for (const f of [claude, codex]) {
      assert.match(fs.readFileSync(f, "utf8"), /^---\nname: devia/, `${f} must be the skill pack`);
    }
    assert.match(fs.readFileSync(cursor, "utf8"), /^---\ndescription: devia/);
    assert.match(fs.readFileSync(gemini, "utf8"), /devia/);
    // Every path is printed, and an agent devia cannot place is SKIP with the reason.
    assert.match(res.out, /SKIP\s+copilot/);
    assert.match(res.out, /SKIP\s+windsurf/);

    // A file the user has edited is never replaced without --force.
    fs.writeFileSync(claude, "edited by hand\n");
    fs.writeFileSync(gemini, "my own global instructions\n");
    const again = devia(["skills", "install", "--global", "--root", dir], dir, { env: at });
    assert.match(fs.readFileSync(claude, "utf8"), /edited by hand/);
    assert.match(fs.readFileSync(gemini, "utf8"), /my own global instructions/);
    assert.match(again.out, /already has content/, "the user-owned file says why it was skipped");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(home, { recursive: true, force: true });
  }
});

// A reader that needs a running server is a reader nobody opens, so the page carries its own
// content: no fetch, no CDN, no stylesheet to resolve.
test("read renders the memory into one self-contained page", () => {
  const dir = scratch();
  try {
    devia(["init", "--root", dir], dir);
    const out = devia(["read", "--root", dir], dir).out;
    const page = fs.readFileSync(path.join(dir, ".devia", "reader.html"), "utf8");

    assert.match(out, /memory files rendered/);
    for (const external of ["fetch(", "http://", "https://", "<script src", "<link rel"]) {
      assert.ok(!page.includes(external), `the page must not depend on ${external}`);
    }
    // Every memory file is present, and the contract opens the list.
    const articles = page.match(/<article id="doc-/g) || [];
    assert.equal(articles.length, fs.readdirSync(path.join(dir, ".devia")).filter((f) => f.endsWith(".md")).length);
    assert.ok(page.indexOf('id="doc-AGENTS"') < page.indexOf('id="doc-00_OVERVIEW"'));
    // The subset actually rendered: the templates are full of tables and fenced commands.
    assert.ok((page.match(/<table>/g) || []).length > 3, "tables must render");
    assert.ok((page.match(/<pre/g) || []).length > 0, "fenced code must render");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("read refuses a repository with no memory", () => {
  const dir = scratch();
  try {
    const res = devia(["read", "--root", dir], dir, { allowFailure: true });
    assert.equal(res.code, 1);
    assert.match(res.out, /no \.devia/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("rules can be queried by id and by filter", () => {
  const dir = scratch();
  try {
    const one = devia(["rules", "--id", "SEC-001", "--root", dir], dir);
    assert.match(one.out, /Server-side authorization/);
    const filtered = JSON.parse(devia(["rules", "--domain", "memory", "--json", "--root", dir], dir).out);
    assert.ok(filtered.count >= 10);
    assert.ok(filtered.rules.every((r) => r.domain === "memory"));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("sync pins the standard on demand, and refreshes a pinned copy", () => {
  const dir = scratch();
  try {
    devia(["init", "--root", dir], dir);
    const pinned = path.join(dir, ".devia", "standard", "rules", "memory", "MEM-001.md");
    assert.ok(!fs.existsSync(pinned), "init pins nothing");

    // sync is the opt-in gesture: it writes the copy that init deliberately did not.
    devia(["sync", "--root", dir], dir);
    assert.ok(fs.existsSync(pinned), "sync pins the standard");

    fs.writeFileSync(pinned, "tampered\n");
    devia(["sync", "--root", dir], dir);
    assert.match(fs.readFileSync(pinned, "utf8"), /Undecided is never coded/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// The whole tree, vendored standard included: a link that resolves here and not in the copy is a
// broken link shipped to every adopter, and the flat listing this test used to do never saw it.
test("the links inside a materialised .devia resolve", () => {
  const dir = scratch();
  try {
    // --vendor, so the walk covers the pinned tree too: a link that resolves in this repository
    // and not in the copy is a broken link shipped to every adopter who pins one.
    devia(["init", "--root", dir, "--vendor"], dir);
    const deviaDir = path.join(dir, ".devia");

    const files = [];
    const collect = (d) => {
      for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, entry.name);
        if (entry.isDirectory()) collect(p);
        else if (p.endsWith(".md")) files.push(p);
      }
    };
    collect(deviaDir);

    const linkRe = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
    const broken = [];
    for (const file of files) {
      const text = fs.readFileSync(file, "utf8");
      let m;
      while ((m = linkRe.exec(text))) {
        const target = m[1].split("#")[0].split("?")[0];
        if (!target || /^(https?:|mailto:|tel:)/.test(target)) continue;
        if (!fs.existsSync(path.resolve(path.dirname(file), target))) {
          broken.push(`${path.relative(deviaDir, file)} -> ${target}`);
        }
      }
    }
    assert.deepEqual(broken, []);
    // Guard against the walk silently collapsing back to the memory files alone.
    assert.ok(files.length > 300, `expected the pinned standard to be walked, saw ${files.length}`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// Pinning ~390 files a project did not author buries the memory it serves, so it is opt-in. The
// memory must therefore stand on its own: no link into a copy that was never written.
test("init does not pin the standard, and the memory still resolves without it", () => {
  const dir = scratch();
  try {
    const out = devia(["init", "--root", dir], dir).out;
    const deviaDir = path.join(dir, ".devia");
    assert.ok(!fs.existsSync(path.join(deviaDir, "standard")), "nothing pinned by default");
    assert.match(out, /standard not pinned/);

    const files = fs.readdirSync(deviaDir).filter((f) => f.endsWith(".md"));
    const linkRe = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
    const broken = [];
    for (const f of files) {
      const text = fs.readFileSync(path.join(deviaDir, f), "utf8");
      let m;
      while ((m = linkRe.exec(text))) {
        const target = m[1].split("#")[0].split("?")[0];
        if (!target || /^(https?:|mailto:|tel:)/.test(target)) continue;
        if (!fs.existsSync(path.resolve(deviaDir, target))) broken.push(`${f} -> ${target}`);
      }
    }
    assert.deepEqual(broken, [], "the memory may not link into a standard nobody pinned");

    // doctor reports the absence as a fact, not as something to fix.
    const doctor = devia(["doctor", "--root", dir], dir).out;
    assert.match(doctor, /standard not pinned/);
    assert.doesNotMatch(doctor, /WARN\s+standard/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("devia.json records the CLI version, not the standard version", () => {
  const dir = scratch();
  try {
    devia(["init", "--root", dir, "--no-vendor"], dir);
    const pkg = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"));
    const config = JSON.parse(fs.readFileSync(path.join(dir, ".devia", "devia.json"), "utf8"));
    assert.equal(config.deviaVersion, pkg.version);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("init refuses a detected root that is not the current directory", () => {
  const dir = scratch();
  try {
    const sub = path.join(dir, "packages", "widget");
    fs.mkdirSync(sub, { recursive: true });

    const refused = devia(["init"], sub, { allowFailure: true });
    assert.equal(refused.code, 2);
    assert.match(refused.out, /not the current directory/);
    assert.ok(!fs.existsSync(path.join(dir, ".devia")), "nothing may be written to the parent");

    const accepted = devia(["init", "--yes", "--no-vendor"], sub);
    assert.match(accepted.out, /memory files/);
    assert.ok(fs.existsSync(path.join(dir, ".devia", "00_OVERVIEW.md")));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
