# Changelog

## 0.5.0 — 2026-09-09

The standard is unchanged: `VERSION` stays at 0.1.0.

### Pinning the standard is now opt-in

`devia init` used to copy the whole standard into `.devia/standard/`. Measured on a real
repository: **391 pinned files against 17 of memory** — a folder whose purpose is to be read by
a human and an agent, in which 96% of the files were a copy nobody wrote. On a 211-file project
it tripled the repository, and every `devia sync` produced a 391-file diff in which a real
memory change was invisible.

- `devia init` writes the memory and the adapters, and pins nothing: **17 files, 57 kB**
- `devia init --vendor` pins the copy for those who want it up front
- `devia sync` pins it on demand and refreshes it afterwards — that is now its first job, not
  only its maintenance one
- `doctor` reports an unpinned standard as `INFO`, not a `WARN` to clear: the default is not a
  defect
- The memory templates, the agent adapters and the skill read the rules with
  `npx devia rules --id <ID>` / `--domain <name>` instead of linking into a copy that may not
  exist. A pinned copy is mentioned as what it is: optional

Nothing to do when upgrading. An existing `.devia/standard/` is left alone, `devia sync` keeps
refreshing it, and only new `devia init` runs behave differently. Recorded as G8.

### A P0 blocker comes from the priority cell, never from prose

`MEM-DEBT-P0` matched `P0` anywhere in a debt row. A P1 line reading "becomes P0 once the
payment module ships" failed the gate, so a project with no P0 debt was told it was blocked by
one. The check now reads the priority cell. Found by writing a real project's debt registry.

## 0.4.0 — 2026-09-09

The standard is unchanged: `VERSION` stays at 0.1.0, no adopter needs `devia sync`.

### A manifest is not always at the root

Running `devia init` on a real project for the first time — a Next.js app whose manifest lives
in `apps/web/` — exposed five gates reporting `SKIP  no package.json` to a repository that has
one, with a lockfile, a lint script and thirteen dependencies. The letter of the rule was kept,
since nothing was rounded up to `PASS`; the reason given was false, which is worse. A reader
believes the tool looked.

- `check` reads every `package.json` in the repository, nearest the root first, and takes the
  union of their dependencies: "does this project use X" is not a question about one directory
- A lockfile is looked for next to each manifest, not only at the root
- A migrations directory is found at any depth
- `SKIP` now says `no package.json anywhere in the repository`, and findings name the file they
  came from — `no npm test script in apps/web/package.json`
- `init` detects the profile from the nearest manifest instead of falling back to a default, and
  records the directories holding manifests in `code.paths`, which is what `doctor` watches for
  staleness

On that project: six SKIPs became two, four gates turned into real findings, and the dependency
lockfile went from invisible to `PASS  apps/web/package-lock.json`.

- G1 closed and reframed: the blind spot was never the ecosystem, it was the root assumption.
  D9 records what is still root-only: `pyproject.toml`, `go.mod`, `Cargo.toml`
- G7 opened: what devia should do when a repository already carries an ad-hoc memory of its own

### Fixed

- Nested directories were not excluded from the scan on Windows when git was unavailable: the
  separator class only matched `/`, so `apps/web/node_modules` was walked. Both separators now.

## 0.3.0 — 2026-09-09

The standard is unchanged: `VERSION` stays at 0.1.0, no adopter needs `devia sync`.

### devia is for every agent

0.2.0 shipped `--global` serving Claude Code alone and reported the other agents as SKIP. Two of
those reasons were wrong: they came from an absence never verified. `~/.cursor/rules/` holds
user-level `.mdc` rules, and `~/.codex/skills/` uses the same `SKILL.md` convention as Claude
Code. The decision is recorded as G6: no agent is privileged.

`devia skills install --global` now writes, each in the format the agent actually reads:

| Agent | Path | File |
|---|---|---|
| Claude Code | `~/.claude/skills/devia/SKILL.md` | skill pack |
| Codex | `~/.codex/skills/devia/SKILL.md` | skill pack |
| Cursor | `~/.cursor/rules/devia.mdc` | rules adapter |
| Gemini | `~/.gemini/GEMINI.md` | universal contract, only when absent or empty |
| Copilot, Windsurf | — | `SKIP`: user-level configuration is editor settings, not a file devia can place (`12_DEBT.md` D8) |

`CLAUDE_CONFIG_DIR` and `CODEX_HOME` are honoured when set. A directory the agent owns is
written to freely; a file the **user** owns is written only when absent or empty, and otherwise
skipped with the reason rather than replaced. `--force` overrides both and names every path.

## 0.2.0 — 2026-09-09

The standard is unchanged: `VERSION` stays at 0.1.0 and no adopter needs `devia sync`. This
release is the CLI only.

### The skill, once for every project

- `devia skills install --global` installs the skill pack in the agent's own configuration
  directory instead of one repository, so the contract applies everywhere. Claude Code is
  supported (`~/.claude/skills/devia/SKILL.md`, or `CLAUDE_CONFIG_DIR` when set); Cursor,
  Copilot and Windsurf report `SKIP` with the reason, because devia will not guess a path
  inside someone's home directory
- It is the only command that writes outside `--root`: off by default, every path printed, an
  edited file kept without `--force` (`04_PERMISSIONS.md`, `10_NEVER_ALWAYS.md`)

### Bootstrap, fixed

- The skill and every agent adapter told an agent to run `npx devia init`. Since the package is
  scoped, that resolves to nothing in a repository that has not installed devia: `404 devia@*`.
  They now say `npm i -D @schneiderjoseph/devia && npx devia init`, which is what a cold start
  actually needs. Found while installing the skill system-wide, where the cold start is the
  normal case rather than the exception

## 0.1.0 — 2026-09-03

First release. Devia consolidates three bodies of work into one maintained standard plus a
living project memory.

### Standard

- Work contract for agents: [`AGENTS.md`](AGENTS.md) — rule zero, hard stops, output contract
- [`PRINCIPLES.md`](PRINCIPLES.md), [`LEVELS.md`](LEVELS.md) (memory → policy → check →
  enforcement), [`MATURITY.md`](MATURITY.md) (P0–P3, Bronze → Platinum),
  [`GOVERNANCE.md`](GOVERNANCE.md)
- [`MEMORY.md`](MEMORY.md) — the living-memory doctrine: the two registries, sweep discipline,
  the impact map, no perishable facts, freshness

### Rules

- Unified registry of **138 rules** with stable IDs, severity, priority, source and validation
  method: [`rules/README.md`](rules/README.md)
- 58 design rules carried over unchanged from `design-system-standard`: `A11Y-*`, `CMP-*`,
  `CNT-*`, `DATA-*`, `DS-*`, `I18N-*`, `INT-*`, `MOT-*`, `RWD-*`, `STATE-*`, `UI-*`, `UX-*`
- 80 new engineering, agent and memory rules: `ARC-*`, `SEC-*`, `DB-*`, `API-*`, `TST-*`,
  `OPS-*`, `OBS-*`, `PRIV-*`, `AI-*`, `AGT-*`, `MEM-*`
- `priority` (P0–P3) added to every rule, including the carried-over design rules
- Generated index, coverage and traceability: `npm run build:index`

### Corpus

- `production-app-standard` absorbed into [`standard/engineering/`](standard/engineering/README.md)
  and `checklists/engineering/`
- `design-system-standard` absorbed into [`standard/design/`](standard/design/README.md) and
  `checklists/design/`
- See [`MIGRATION.md`](MIGRATION.md) for the path mapping

### CLI

- `devia init` — writes `.devia/`, vendors the standard, installs the agent adapters
- `devia validate` — memory integrity: structure, config, impact map, registry ids,
  placeholders, perishable facts
- `devia check` — readiness gates with P0 blocking, replacing `scripts/production-check.mjs`
- `devia doctor` — adoption, version drift, and whether the memory lags the code
- `devia rules` — query the registry by id, domain, priority, severity or text
- `devia sync` — refresh the vendored standard and report what changed
- `devia gap` / `devia debt` — registry lines with monotone ids that are never reused
- `devia skills install` — adapters for Cursor, Claude Code, Copilot, Windsurf and the universal
  `AGENTS.md`
- `devia --version` prints both versions: the CLI, and the standard it carries
- `devia init` refuses a root it inferred that is not the current directory — `--root` says
  where, `--yes` accepts the detected one; nothing is written before that is settled
- `devia check` scans what git carries: tracked files plus untracked ones that are not ignored.
  An ignored build artefact can no longer fail a P0 gate. Without git, the tree is walked instead
- `.devia/standard/` is vendored together with everything its files link to (`templates/docs/`,
  `templates/github/`, `MIGRATION.md`, `CHANGELOG.md`), so every relative link resolves in the
  adopter's copy; the test walks the materialised tree to prove it
- `devia.json` records the CLI version in `deviaVersion` and the corpus version in
  `standardVersion` — the two move independently
- Closing a registry line splices the row out instead of blanking it, which used to leave a
  blank line that ended the markdown table and orphaned every row below it
- No runtime dependencies

### Enforcement

- CI runs the whole suite on ubuntu and windows, Node 20 and 22: the CLI writes files on both
- `npm publish` re-runs `npm run validate`, the tests and both self-checks (`prepublishOnly`)

### Adopting

```bash
npm install -D @schneiderjoseph/devia && npx devia init
```

Replace `node scripts/production-check.mjs` in CI with `npx devia check`, and add
`npx devia validate`.

The package is scoped, the command is not: npm refused the bare name `devia` as too similar to
existing packages, so installs read `@schneiderjoseph/devia` while everything you type afterwards
stays `devia`.
