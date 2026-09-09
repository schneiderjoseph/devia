import path from "node:path";
import { exists, read, readJSON, walk } from "../lib/fs.mjs";
import { trackedFiles } from "../lib/git.mjs";
import { color, heading, status, line } from "../lib/ui.mjs";

/**
 * Readiness gates (LEVELS.md level 2).
 *
 * Every check answers from evidence in the repository. A check that cannot answer returns SKIP
 * with the reason — it never rounds up to PASS, because "I did not check" is reported, not
 * assumed (AGT-006).
 */

const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "out",
  "coverage",
  "vendor",
  ".next",
  ".venv",
  "__pycache__",
  ".devia",
]);

const SECRET_PATTERNS = [
  [/AKIA[0-9A-Z]{16}/, "AWS access key id"],
  [/-----BEGIN (RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/, "private key"],
  [/sk_live_[0-9a-zA-Z]{16,}/, "live secret key"],
  [/gh[pousr]_[0-9A-Za-z]{30,}/, "GitHub token"],
  [/xox[baprs]-[0-9A-Za-z-]{10,}/, "Slack token"],
  [/AIza[0-9A-Za-z_-]{35}/, "Google API key"],
  [/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/, "JWT"],
];

/**
 * A line carrying this marker is exempt from the secret and bypass scanners. It exists so an
 * exemption is visible in the diff and reviewable — never as a silent allowlist elsewhere.
 */
const ALLOW = "devia:allow";

/** Where a bypass can actually be wired in: scripts, hooks and pipeline configuration. */
const EXECUTABLE_SURFACE =
  /(^|\/)(package\.json|Makefile|Justfile|\.husky\/|\.github\/workflows\/|\.gitlab-ci\.yml|azure-pipelines\.yml|Jenkinsfile)|\.(sh|bash|ps1|cmd|bat|mk)$/;

const TEXT_EXT = new Set([
  ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".py", ".rb", ".go", ".rs", ".java", ".php",
  ".json", ".yml", ".yaml", ".toml", ".env", ".sh", ".ps1", ".sql", ".md", ".txt", ".html",
  ".css", ".ini", ".cfg", ".conf",
]);

/**
 * The files this repository actually carries: what git tracks, plus what is untracked and not
 * ignored — the content a push would publish. An ignored path is a local artefact, and failing a
 * P0 gate on someone's build cache or downloaded fixture is a false positive, not vigilance.
 * Without git the tree is walked instead, which is wider: SKIP is not an option here, because a
 * secret scan that silently scanned nothing is worse than one that over-reports.
 */
function sourceFiles(root) {
  // Both separators: git reports "/", walk() reports path.sep, and a nested node_modules must be
  // skipped in either shape.
  const skipped = (rel) => rel.split(/[\\/]/).some((seg) => SKIP_DIRS.has(seg));
  const wanted = (rel) => TEXT_EXT.has(path.extname(rel).toLowerCase());

  const tracked = trackedFiles(root);
  if (tracked) {
    return tracked
      .filter((rel) => !skipped(rel) && wanted(rel))
      .map((rel) => rel.split("/").join(path.sep))
      .sort();
  }

  return walk(root, {
    skip: (rel) => skipped(rel),
    filter: (rel) => wanted(rel),
  });
}

function anyExists(root, candidates) {
  return candidates.find((c) => exists(path.join(root, c))) || null;
}

function makeChecks(root, ctx) {
  const config = readJSON(path.join(root, ".devia", "devia.json"));
  const files = sourceFiles(root);
  const rel = (p) => p.split(path.sep).join("/");

  /**
   * A manifest is not always at the repository root: `apps/web/package.json` is as real as
   * `./package.json`. Reading only the root turned "I did not look there" into "you have no
   * package.json", which is a wrong answer dressed as a SKIP — worse than no answer, because
   * the reader believes the tool looked.
   */
  const manifests = files
    .filter((f) => /(^|[\\/])package\.json$/.test(f))
    .sort((a, b) => a.split(path.sep).length - b.split(path.sep).length || a.localeCompare(b));
  const primary = manifests[0] || null;
  const pkg = primary ? readJSON(path.join(root, primary)) : null;
  const pkgWhere = primary ? rel(primary) : null;
  const scripts = pkg?.scripts || {};
  // Dependencies are asked as "does this project use X anywhere", so every manifest counts.
  const deps = {};
  for (const m of manifests) {
    const json = readJSON(path.join(root, m)) || {};
    Object.assign(deps, json.dependencies, json.devDependencies);
  }
  const noManifest = `no package.json anywhere in the repository`;

  const hasDep = (...names) => names.some((n) => n in deps);
  const grepFiles = (re, limit = 40) => {
    const hits = [];
    for (const f of files) {
      const text = read(path.join(root, f));
      if (text && re.test(text)) {
        hits.push(rel(f));
        if (hits.length >= limit) break;
      }
    }
    return hits;
  };

  return [
    {
      id: "MEM-PRESENT",
      priority: "P0",
      rule: "AGT-002",
      title: "Project memory exists",
      run: () =>
        exists(path.join(root, ".devia"))
          ? { kind: "PASS" }
          : { kind: "FAIL", detail: "run `devia init` before working here" },
    },
    {
      id: "MEM-FILLED",
      priority: "P1",
      rule: "MEM-009",
      title: "Overview is filled in",
      run: () => {
        const text = read(path.join(root, ".devia", "00_OVERVIEW.md"));
        if (text === null) return { kind: "SKIP", detail: "no .devia/00_OVERVIEW.md" };
        const n = (text.match(/TODO\(devia\)/g) || []).length;
        return n
          ? { kind: "WARN", detail: `${n} placeholders left` }
          : { kind: "PASS" };
      },
    },
    {
      id: "MEM-DEBT-P0",
      priority: "P0",
      rule: "MEM-002",
      title: "No P0 debt recorded as unbuilt",
      run: () => {
        const text = read(path.join(root, ".devia", "12_DEBT.md"));
        if (text === null) return { kind: "SKIP", detail: "no debt registry" };
        // The priority is a cell, not a word somewhere in the row. Matching the whole line made
        // a P1 line reading "becomes P0 once the payment module ships" fail the gate — a P0
        // blocker invented out of prose, on a project that had none.
        const rows = (text.match(/^\|\s*D\d+\s*\|.*$/gm) || []).filter((row) => {
          if (/TODO\(devia\)/.test(row)) return false;
          return row
            .split("|")
            .slice(1, -1)
            .some((cell) => cell.trim().toUpperCase() === "P0");
        });
        return rows.length
          ? { kind: "FAIL", detail: `${rows.length} P0 debt line(s) open` }
          : { kind: "PASS" };
      },
    },
    {
      id: "MEM-WAIVERS",
      priority: "P1",
      rule: "GOVERNANCE",
      title: "No expired waiver",
      run: () => {
        const waivers = config?.waivers || [];
        if (!waivers.length) return { kind: "PASS", detail: "none" };
        const today = new Date().toISOString().slice(0, 10);
        const expired = waivers.filter((w) => !w.expires || w.expires < today);
        return expired.length
          ? { kind: "FAIL", detail: `${expired.length} expired or undated` }
          : { kind: "PASS", detail: `${waivers.length} active` };
      },
    },
    {
      id: "CI-PRESENT",
      priority: "P0",
      rule: "OPS-001",
      title: "CI runs on pull requests",
      run: () => {
        const wf = path.join(root, ".github", "workflows");
        const found =
          (exists(wf) && walk(wf, { filter: (f) => /\.ya?ml$/.test(f) }).length) ||
          anyExists(root, [".gitlab-ci.yml", "azure-pipelines.yml", "Jenkinsfile", ".circleci"]);
        return found
          ? { kind: "PASS" }
          : { kind: "FAIL", detail: "no CI configuration found" };
      },
    },
    {
      id: "CI-GATES",
      priority: "P1",
      rule: "OPS-001",
      title: "CI runs tests and static checks",
      run: () => {
        const wf = path.join(root, ".github", "workflows");
        if (!exists(wf)) return { kind: "SKIP", detail: "no GitHub workflows to read" };
        const text = walk(wf, { filter: (f) => /\.ya?ml$/.test(f) })
          .map((f) => read(path.join(wf, f)) || "")
          .join("\n");
        const has = (re) => re.test(text);
        const missing = [];
        if (!has(/\btest\b/i)) missing.push("test");
        if (!has(/\blint\b|eslint|ruff|flake8/i)) missing.push("lint");
        if (!has(/audit|snyk|dependabot|osv/i)) missing.push("dependency audit");
        return missing.length
          ? { kind: "WARN", detail: `not referenced: ${missing.join(", ")}` }
          : { kind: "PASS" };
      },
    },
    {
      id: "SEC-ENV",
      priority: "P0",
      rule: "SEC-002",
      title: "No environment file committed",
      run: () => {
        const ignore = read(path.join(root, ".gitignore")) || "";
        const envs = [".env", ".env.local", ".env.production"].filter((f) =>
          exists(path.join(root, f))
        );
        if (!envs.length) return { kind: "PASS" };
        const ignored = /^\s*\.env/m.test(ignore);
        return ignored
          ? { kind: "WARN", detail: `${envs.join(", ")} present locally but gitignored` }
          : { kind: "FAIL", detail: `${envs.join(", ")} is not gitignored` };
      },
    },
    {
      id: "SEC-SECRETS",
      priority: "P0",
      rule: "SEC-002",
      title: "No secret-shaped strings in the tree",
      run: () => {
        const hits = [];
        let exempted = 0;
        for (const f of files) {
          if (/(^|\/)(\.env\.example|.*\.lock|package-lock\.json)$/.test(rel(f))) continue;
          const text = read(path.join(root, f));
          if (!text) continue;
          const lines = text.split(/\r?\n/);
          for (let i = 0; i < lines.length; i++) {
            const hit = SECRET_PATTERNS.find(([re]) => re.test(lines[i]));
            if (!hit) continue;
            if (lines[i].includes(ALLOW)) {
              exempted++;
              continue;
            }
            hits.push(`${rel(f)}:${i + 1} (${hit[1]})`);
            break;
          }
          if (hits.length >= 5) break;
        }
        return hits.length
          ? { kind: "FAIL", detail: hits.join("; ") }
          : {
              kind: "PASS",
              detail: `${files.length} files scanned${exempted ? `, ${exempted} exempted` : ""}`,
            };
      },
    },
    {
      id: "OPS-BYPASS",
      priority: "P0",
      rule: "OPS-003",
      title: "No check bypass wired into the repository",
      run: () => {
        // Only scripts, hooks and pipeline configuration can wire a bypass in. Prose that
        // forbids `--no-verify` is not a bypass, so documentation is out of scope here.
        const hits = [];
        for (const f of files) {
          if (!EXECUTABLE_SURFACE.test(rel(f))) continue;
          const text = read(path.join(root, f));
          if (!text) continue;
          const lines = text.split(/\r?\n/);
          for (let i = 0; i < lines.length; i++) {
            if (!/--no-verify|SKIP_HOOKS=1|HUSKY=0|\[skip ci\]/.test(lines[i])) continue;
            if (lines[i].includes(ALLOW)) continue;
            hits.push(`${rel(f)}:${i + 1}`);
            break;
          }
          if (hits.length >= 5) break;
        }
        return hits.length ? { kind: "FAIL", detail: hits.join(", ") } : { kind: "PASS" };
      },
    },
    {
      id: "TST-PRESENT",
      priority: "P0",
      rule: "TST-001",
      title: "Automated tests exist",
      run: () => {
        const testFiles = files.filter((f) =>
          /(^|\/)(tests?|spec|__tests__)\//.test(rel(f)) ||
          /\.(test|spec)\.[a-z]+$/.test(rel(f)) ||
          /(^|\/)test_[^/]+\.py$/.test(rel(f))
        );
        return testFiles.length
          ? { kind: "PASS", detail: `${testFiles.length} test files` }
          : { kind: "FAIL", detail: "no test files found" };
      },
    },
    {
      id: "TST-SKIPPED",
      priority: "P1",
      rule: "TST-003",
      title: "No disabled tests",
      run: () => {
        const hits = grepFiles(
          /\b(it|test|describe)\.skip\(|\bxit\(|\bxdescribe\(|@pytest\.mark\.skip|t\.Skip\(/,
          20
        );
        return hits.length
          ? { kind: "WARN", detail: `${hits.length} file(s): ${hits.slice(0, 3).join(", ")}` }
          : { kind: "PASS" };
      },
    },
    {
      id: "TST-SCRIPT",
      priority: "P1",
      rule: "TST-001",
      title: "A test command exists",
      run: () => {
        if (!pkg) return { kind: "SKIP", detail: noManifest };
        const t = scripts.test;
        const where = pkgWhere === "package.json" ? "" : ` in ${pkgWhere}`;
        if (!t) return { kind: "WARN", detail: `no npm test script${where}` };
        return /no test specified/.test(t)
          ? { kind: "FAIL", detail: `test script is the npm placeholder${where}` }
          : { kind: "PASS", detail: where.trim() };
      },
    },
    {
      id: "OPS-LOCKFILE",
      priority: "P1",
      rule: "OPS-004",
      title: "Dependency lockfile committed",
      run: () => {
        const LOCKS = [
          "package-lock.json",
          "pnpm-lock.yaml",
          "yarn.lock",
          "poetry.lock",
          "uv.lock",
          "requirements.txt",
          "go.sum",
          "Cargo.lock",
          "Gemfile.lock",
        ];
        // A lockfile sits next to the manifest it locks, which is not always the root.
        const dirs = new Set(["."]);
        for (const m of manifests) dirs.add(path.dirname(m));
        const rootManifest = anyExists(root, [
          "package.json",
          "pyproject.toml",
          "go.mod",
          "Cargo.toml",
          "Gemfile",
        ]);
        if (!rootManifest && !manifests.length) return { kind: "SKIP", detail: "no manifest" };
        for (const dir of dirs) {
          const found = LOCKS.find((l) => exists(path.join(root, dir, l)));
          if (found) return { kind: "PASS", detail: rel(path.join(dir, found)) };
        }
        return { kind: "FAIL", detail: "no lockfile" };
      },
    },
    {
      id: "DB-MIGRATIONS",
      priority: "P1",
      rule: "DB-001",
      title: "Schema changes are versioned migrations",
      run: () => {
        const usesDb =
          hasDep("pg", "mysql2", "prisma", "@prisma/client", "typeorm", "sequelize", "knex",
            "drizzle-orm", "mongoose", "sqlalchemy") ||
          files.some((f) => /\.sql$/.test(rel(f)));
        if (!usesDb) return { kind: "SKIP", detail: "no database detected" };
        const dir = anyExists(root, [
          "migrations",
          "db/migrate",
          "prisma/migrations",
          "alembic",
          path.join("src", "migrations"),
        ]);
        if (dir) return { kind: "PASS", detail: dir };
        // Not only at the root: a migrations directory can live under any package.
        const SEGMENTS = new Set(["migrations", "migrate", "alembic"]);
        const nested = files
          .map(rel)
          .find((f) => f.split("/").slice(0, -1).some((seg) => SEGMENTS.has(seg)));
        return nested
          ? { kind: "PASS", detail: nested.split("/").slice(0, -1).join("/") }
          : { kind: "FAIL", detail: "database in use, no migrations directory" };
      },
    },
    {
      id: "AGT-CONTRACT",
      priority: "P1",
      rule: "AGT-001",
      title: "Agent contract at the repository root",
      run: () =>
        exists(path.join(root, "AGENTS.md"))
          ? { kind: "PASS" }
          : { kind: "WARN", detail: "run `devia skills install`" },
    },
    {
      id: "DOC-README",
      priority: "P2",
      rule: "—",
      title: "README present",
      run: () =>
        anyExists(root, ["README.md", "README.rst", "readme.md"])
          ? { kind: "PASS" }
          : { kind: "WARN", detail: "no README" },
    },
    {
      id: "UI-A11Y-TOOLING",
      priority: "P2",
      rule: "A11Y-001",
      title: "Accessibility tooling available",
      run: () => {
        if (config && config.modules && config.modules.design === false)
          return { kind: "SKIP", detail: "design module disabled" };
        if (!pkg) return { kind: "SKIP", detail: noManifest };
        const found = hasDep(
          "axe-core", "@axe-core/react", "@axe-core/playwright", "jest-axe",
          "eslint-plugin-jsx-a11y", "pa11y", "@storybook/addon-a11y", "lighthouse"
        );
        return found
          ? { kind: "PASS" }
          : { kind: "WARN", detail: "no automated accessibility check configured" };
      },
    },
    {
      id: "OBS-ERRORS",
      priority: "P2",
      rule: "OBS-002",
      title: "Errors reach something a human watches",
      run: () => {
        const profile = config?.project?.profile;
        if (["cli", "library", "docs"].includes(profile))
          return { kind: "SKIP", detail: `${profile} does not run as a watched service` };
        if (!pkg) return { kind: "SKIP", detail: noManifest };
        const found = hasDep("@sentry/node", "@sentry/browser", "@sentry/nextjs", "bugsnag",
          "rollbar", "datadog-lambda-js", "dd-trace", "@opentelemetry/api");
        return found
          ? { kind: "PASS" }
          : { kind: "WARN", detail: "no error tracker detected — verify manually" };
      },
    },
  ];
}

export default async function check(ctx) {
  const { root, flags } = ctx;

  if (flags.help) {
    line(`
${color.bold("devia check")} — readiness gates

  --root <dir>   repository to check
  --json         machine-readable output
  --all          show passing checks too

Exit code is 1 when a P0 gate fails.
`.trim());
    return 0;
  }

  const checks = makeChecks(root, ctx);
  const results = checks.map((c) => ({ ...c, ...c.run(), run: undefined }));
  const counts = results.reduce((a, r) => ((a[r.kind] = (a[r.kind] || 0) + 1), a), {});
  const p0Failures = results.filter((r) => r.kind === "FAIL" && r.priority === "P0");
  const failures = results.filter((r) => r.kind === "FAIL");

  if (ctx.json) {
    console.log(
      JSON.stringify(
        { ok: p0Failures.length === 0, counts, blocking: p0Failures.map((r) => r.id), results },
        null,
        2
      )
    );
    return p0Failures.length ? 1 : 0;
  }

  heading(`devia check — ${path.basename(root)}`);
  for (const r of results) {
    if (!flags.all && r.kind === "PASS") continue;
    status(r.kind, `${r.priority}  ${r.title}`, [r.detail, r.rule !== "—" ? r.rule : ""]
      .filter(Boolean)
      .join(" · "));
  }

  line("");
  const parts = ["PASS", "WARN", "FAIL", "SKIP"]
    .filter((k) => counts[k])
    .map((k) => `${counts[k]} ${k.toLowerCase()}`)
    .join(" · ");
  line(`  ${parts}`);

  if (p0Failures.length) {
    line(
      `  ${color.red("BLOCKED")} — ${p0Failures.length} P0 gate(s) failing: ${p0Failures
        .map((r) => r.id)
        .join(", ")}`
    );
    line(color.dim("  Not production ready. Do not report done (AGT-005)."));
  } else if (failures.length) {
    line(`  ${color.yellow("PASSES P0")} — ${failures.length} non-blocking failure(s) to schedule`);
  } else {
    line(`  ${color.green("P0 clear")} — list the warnings for the human before claiming done`);
  }
  line("");
  return p0Failures.length ? 1 : 0;
}
