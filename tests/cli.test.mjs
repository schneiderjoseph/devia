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

function devia(args, cwd, { allowFailure = false } = {}) {
  try {
    return {
      code: 0,
      out: execFileSync(process.execPath, [bin, ...args], {
        cwd,
        encoding: "utf8",
        env: { ...process.env, NO_COLOR: "1" },
      }),
    };
  } catch (e) {
    if (!allowFailure) throw e;
    return { code: e.status ?? 1, out: `${e.stdout || ""}${e.stderr || ""}` };
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

test("sync refreshes the vendored standard", () => {
  const dir = scratch();
  try {
    devia(["init", "--root", dir], dir);
    const pinned = path.join(dir, ".devia", "standard", "rules", "memory", "MEM-001.md");
    assert.ok(fs.existsSync(pinned));
    fs.writeFileSync(pinned, "tampered\n");
    devia(["sync", "--root", dir], dir);
    assert.match(fs.readFileSync(pinned, "utf8"), /Undecided is never coded/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("the links inside a materialised .devia resolve", () => {
  const dir = scratch();
  try {
    devia(["init", "--root", dir], dir);
    const deviaDir = path.join(dir, ".devia");
    const files = fs.readdirSync(deviaDir).filter((f) => f.endsWith(".md"));
    const linkRe = /\[[^\]]*\]\(([^)\s]+)\)/g;
    const broken = [];
    for (const f of files) {
      const text = fs.readFileSync(path.join(deviaDir, f), "utf8");
      let m;
      while ((m = linkRe.exec(text))) {
        const target = m[1].split("#")[0];
        if (!target || /^(https?:|mailto:)/.test(target)) continue;
        if (!fs.existsSync(path.resolve(deviaDir, target))) broken.push(`${f} -> ${target}`);
      }
    }
    assert.deepEqual(broken, []);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
