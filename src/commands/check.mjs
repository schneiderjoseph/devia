import path from "node:path";
import { exists, read, readJSON, walk } from "../lib/fs.mjs";
import { trackedFiles } from "../lib/git.mjs";
import { SECRET_PATTERNS } from "../lib/sanitize.mjs";
import { GATES } from "../lib/gates.mjs";
import {
  loadRegister,
  registerIssues,
  blockingPending,
  missingAssets,
  stackDrift,
} from "../lib/decisions.mjs";
import { buildCorpus, classify, select, budgetFor } from "../lib/context.mjs";
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

  const register = loadRegister(path.join(root, ".devia"));
  const noRegister = "no decision register — `devia init` adds one without touching your files";

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

  const runners = {
    "MEM-PRESENT": () =>
      exists(path.join(root, ".devia"))
        ? { kind: "PASS" }
        : { kind: "FAIL", detail: "run `devia init` before working here" },
    "MEM-FILLED": () => {
      const text = read(path.join(root, ".devia", "00_OVERVIEW.md"));
      if (text === null) return { kind: "SKIP", detail: "no .devia/00_OVERVIEW.md" };
      const n = (text.match(/TODO\(devia\)/g) || []).length;
      return n
        ? { kind: "WARN", detail: `${n} placeholders left` }
        : { kind: "PASS" };
    },
    "MEM-DEBT-P0": () => {
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
    "MEM-WAIVERS": () => {
      const waivers = config?.waivers || [];
      if (!waivers.length) return { kind: "PASS", detail: "none" };
      const today = new Date().toISOString().slice(0, 10);
      const expired = waivers.filter((w) => !w.expires || w.expires < today);
      return expired.length
        ? { kind: "FAIL", detail: `${expired.length} expired or undated` }
        : { kind: "PASS", detail: `${waivers.length} active` };
    },
    /**
     * The register's gates, and the one line that decides their shape: a pending decision is a
     * normal state of a live project, so only the project's own `blocks:` declaration turns one
     * into a blocker. A gate that failed on every open question would be switched off in a week,
     * and devia would have traded a real stop for a permanent warning nobody reads.
     */
    "DEC-BLOCKING": () => {
      if (!register.exists) return { kind: "SKIP", detail: noRegister };
      const blocked = blockingPending(root, register.slots);
      if (!blocked.length) {
        const declared = register.slots.filter((s) => s.blocks.length).length;
        return { kind: "PASS", detail: declared ? `${declared} slot(s) declare what they block` : "nothing declared as blocking" };
      }
      return {
        kind: "FAIL",
        detail: blocked
          .map(({ slot, built }) => `${slot.key} is pending and ${built.join(", ")} exists`)
          .join("; "),
      };
    },
    "DEC-REGISTER": () => {
      if (!register.exists) return { kind: "SKIP", detail: noRegister };
      const issues = registerIssues(register);
      if (issues.length) {
        return { kind: "FAIL", detail: issues.slice(0, 3).join("; ") + (issues.length > 3 ? ` (+${issues.length - 3})` : "") };
      }
      return { kind: "PASS", detail: `${register.slots.length} slots` };
    },
    "DEC-ASSETS": () => {
      if (!register.exists) return { kind: "SKIP", detail: noRegister };
      const withPath = register.slots.filter((s) => s.path);
      if (!withPath.length) return { kind: "SKIP", detail: "no decision delivers a file" };
      const missing = missingAssets(root, register.slots);
      return missing.length
        ? { kind: "FAIL", detail: missing.map((s) => `${s.key} → ${s.path}`).join(", ") }
        : { kind: "PASS", detail: `${withPath.length} asset path(s) present` };
    },
    /**
     * Declared version against the manifest — never against a registry. devia has no network,
     * and "is 16 still the newest" is `npm outdated`'s question. "Did we decide 16 and ship 15"
     * is devia's, and it is the one that is actually a defect (`DEC-003`).
     */
    "DEC-STACK": () => {
      if (!register.exists) return { kind: "SKIP", detail: noRegister };
      const pinned = register.slots.filter((s) => s.status === "decided" && s.package);
      if (!pinned.length) return { kind: "SKIP", detail: "no decision names a package" };
      const drift = stackDrift(register.slots, deps);
      if (!drift.length) return { kind: "PASS", detail: `${pinned.length} pinned, manifest agrees` };
      const real = drift.filter((d) => d.kind === "drift");
      const detail = drift
        .map((d) =>
          d.kind === "absent"
            ? `${d.slot.key} pins ${d.slot.package}, no manifest declares it`
            : `${d.slot.key} decided ${d.slot.value}, manifest says ${d.installed}`
        )
        .join("; ");
      return { kind: real.length ? "FAIL" : "WARN", detail };
    },
    "DEC-PENDING": () => {
      if (!register.exists) return { kind: "SKIP", detail: noRegister };
      const pending = register.slots.filter((s) => s.status === "pending");
      return pending.length
        ? { kind: "WARN", detail: `${pending.length} open: ${pending.slice(0, 4).map((s) => s.key).join(", ")}${pending.length > 4 ? "…" : ""}` }
        : { kind: "PASS", detail: "every slot has been ruled on" };
    },
    "CI-PRESENT": () => {
      const wf = path.join(root, ".github", "workflows");
      const found =
        (exists(wf) && walk(wf, { filter: (f) => /\.ya?ml$/.test(f) }).length) ||
        anyExists(root, [".gitlab-ci.yml", "azure-pipelines.yml", "Jenkinsfile", ".circleci"]);
      return found
        ? { kind: "PASS" }
        : { kind: "FAIL", detail: "no CI configuration found" };
    },
    "CI-GATES": () => {
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
    "SEC-ENV": () => {
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
    "SEC-SECRETS": () => {
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
    "OPS-BYPASS": () => {
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
    "TST-PRESENT": () => {
      const testFiles = files.filter((f) =>
        /(^|\/)(tests?|spec|__tests__)\//.test(rel(f)) ||
        /\.(test|spec)\.[a-z]+$/.test(rel(f)) ||
        /(^|\/)test_[^/]+\.py$/.test(rel(f))
      );
      return testFiles.length
        ? { kind: "PASS", detail: `${testFiles.length} test files` }
        : { kind: "FAIL", detail: "no test files found" };
    },
    "TST-SKIPPED": () => {
      const hits = grepFiles(
        /\b(it|test|describe)\.skip\(|\bxit\(|\bxdescribe\(|@pytest\.mark\.skip|t\.Skip\(/,
        20
      );
      return hits.length
        ? { kind: "WARN", detail: `${hits.length} file(s): ${hits.slice(0, 3).join(", ")}` }
        : { kind: "PASS" };
    },
    "TST-SCRIPT": () => {
      if (!pkg) return { kind: "SKIP", detail: noManifest };
      const t = scripts.test;
      const where = pkgWhere === "package.json" ? "" : ` in ${pkgWhere}`;
      if (!t) return { kind: "WARN", detail: `no npm test script${where}` };
      return /no test specified/.test(t)
        ? { kind: "FAIL", detail: `test script is the npm placeholder${where}` }
        : { kind: "PASS", detail: where.trim() };
    },
    "OPS-LOCKFILE": () => {
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
    "DB-MIGRATIONS": () => {
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
    "AGT-CONTRACT": () =>
      exists(path.join(root, "AGENTS.md"))
        ? { kind: "PASS" }
        : { kind: "WARN", detail: "run `devia skills install`" },
    /**
     * A target nobody revisits quietly becomes a permanent overrun. This compares the declared
     * target with the floor for a task that routes nothing — the constraints that apply to
     * every change. If those alone do not fit, no task will ever fit.
     */
    "CTX-BUDGET": () => {
      if (!exists(path.join(root, ".devia"))) {
        return { kind: "SKIP", detail: "no memory to size a context against" };
      }
      const deviaDir = path.join(root, ".devia");
      const { target, mode } = budgetFor(deviaDir, {});
      const corpus = buildCorpus({ root, deviaDir });
      classify(corpus, { task: "", files: [] });
      const { floor, status } = select(corpus, { target, mode });

      if (mode === "strict") {
        return status === "impossible"
          ? { kind: "FAIL", detail: `strict target ${target} cannot hold ${floor} tokens even compressed` }
          : { kind: "PASS", detail: `strict: compresses to fit ${target}` };
      }
      return floor > target
        ? {
            kind: "WARN",
            detail: `every task starts at ${floor} tokens, above the ${target} target — raise it, prune 10_NEVER_ALWAYS.md, or set strict mode`,
          }
        : { kind: "PASS", detail: `baseline floor ${floor} of ${target}` };
    },
    "DOC-README": () =>
      anyExists(root, ["README.md", "README.rst", "readme.md"])
        ? { kind: "PASS" }
        : { kind: "WARN", detail: "no README" },
    "UI-A11Y-TOOLING": () => {
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
    "OBS-ERRORS": () => {
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
  };

  return GATES.map((g) => ({ ...g, run: runners[g.id] }));
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
