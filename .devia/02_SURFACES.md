# 02 — Surfaces

> Everything the outside world can reach. For this project that is the CLI, the package exports,
> and the files an adopter receives.

## Commands

| Command | Purpose | Implementation | Exit code |
|---|---|---|---|
| `devia init` | Create `.devia/` and install adapters; `--vendor` also pins the standard | `src/commands/init.mjs` | 0, or 2 on a bad profile or a detected root away from the cwd |
| `devia validate` | Memory integrity | `src/commands/validate.mjs` | 1 on any FAIL |
| `devia check` | Readiness gates | `src/commands/check.mjs` | 1 on any P0 FAIL |
| `devia doctor` | Adoption, drift, staleness | `src/commands/doctor.mjs` | 1 when there is no `.devia/` |
| `devia rules` | Query the registry | `src/commands/rules.mjs` | 1 when `--id` is unknown |
| `devia read` | Render the memory as one self-contained page | `src/commands/read.mjs` | 1 without `.devia/` |
| `devia context` | The smallest sufficient context for one task | `src/commands/context.mjs` | 1 without `.devia/`, or when a strict target cannot hold the mandatory set |
| `devia sync` | Pin the standard, or refresh a pinned copy | `src/commands/sync.mjs` | 1 without `.devia/` |
| `devia skills` | Install adapters and the skill pack, per repository or `--global` | `src/commands/skills.mjs` | 2 on a bad action |
| `devia decide` | The decision register: read it, and record a ruling, a bounded delegation or a deliberate absence | `src/commands/decide.mjs` | 1 when a pending decision blocks a path that exists, or there is no register; 2 on a ruling with no reason or a delegation with no bounds |
| `devia gap` / `devia debt` | Registry lines | `src/commands/registry.mjs` | 1 when the id is unknown |
| `devia contribute` | A devia problem observed here, as an issue or a pull request | `src/commands/contribute.mjs` | 1 when a candidate is not eligible, 2 on a bad action |
| `devia update` | Is a newer devia published, and what does it bring — in the reader's language | `src/commands/update.mjs` | 1 only when `--yes` ran an install that failed |

Global flags: `--root`, `--json`, `--help`, `--version` (prints the CLI **and** standard
versions — an adopter pins one and reports the other).

`init` alone refuses to act on a root it inferred that is not the current directory: `--root` to
say where, or `--yes` to accept it. Nothing is written before that question is settled.

## The two surfaces that can reach the network

Both delegate: devia ships no HTTP client and no runtime dependency, so a request is always made
by a tool the user already has, already trusts, and has already pointed at the right endpoint.

| Command | Hands it to | Sends | Guard |
|---|---|---|---|
| `contribute submit --yes` | `gh` | A fixture the contributor built and read | Eligible · clean · `--yes` · attributed |
| `update` | `npm` | The package name, nothing else | Cached a day · off in CI · installs only with `--yes` |

`devia update` answers three questions in order — is there a newer version, what does it bring,
do you want it — and the third is always the user's. The summary comes from the published
package's own `devia.release` field, which is how a version that is not installed can be
described without devia inventing anything about it (`AGT-004`). Remote text is sanitized before
it is printed: control characters stripped, strings and bullet counts capped (`AI-001`).

Only `update`, `init` and `doctor` ever spend a lookup, and only when the cached answer is more
than a day old. Every other command reads `.devia/.update-check.json` or says nothing, so no
command acquired a network call by carrying the notice.

`devia contribute submit --yes` is the only command that can publish anything about this
repository, and it makes that request by handing a prepared file to `gh`. Everything else —
recording, reproducing, verifying, rendering the payload — is local, and `submit` without `--yes`
writes the payload and prints the command rather than running it.

| Step | Reaches the network | Guard |
|---|---|---|
| `contribute new` · `repro` · `verify` · `show` | No | — |
| `contribute submit` | No | Writes `payload/` and prints the `gh` command |
| `contribute submit --yes` | Yes, through `gh` | Eligible · payload clean · identity declared and not the maintainer · `gh` authenticated as that identity |

devia holds no GitHub token, reads none from the environment, and never commits or pushes in a
checkout. A pull request is opened only against a branch the contributor already pushed.

## Package exports

| Export | Path | For |
|---|---|---|
| `.` | `src/cli.mjs` | Programmatic `run(argv)` |
| `./rules` | `src/lib/rules.mjs` | Loading and validating the registry |
| `bin.devia` | `bin/devia.mjs` | The `devia` executable. The package is `@schneiderjoseph/devia`, the command is `devia`: `npx devia <cmd>` resolves once the package is a dependency |

## What an adopter receives

| Written by | Path in the target repo |
|---|---|
| `init` | `.devia/` (memory, `decisions.yaml`, `devia.json`, `impact-map.yaml`, `standard/`) |
| `init`, `skills install` | `AGENTS.md`, `CLAUDE.md`, `.cursor/rules/devia.mdc`, `.github/copilot-instructions.md`, `.windsurfrules` |
| `skills install --skill` | `.cursor/skills/devia/SKILL.md`, `.claude/skills/devia/SKILL.md` |
| `read` | `.devia/reader.html` — a generated snapshot, gitignored, never the source |
| `init`, `doctor`, `update` | `.devia/.update-check.json` — the cached version answer, gitignored |
| `contribute` | `.devia/contributions/<id>/` — the record, the fixture, and a generated `payload/` |
| `skills install --global` | Outside the repository, in each agent's own configuration: `~/.claude/skills/devia/`, `~/.codex/skills/devia/`, `~/.cursor/rules/devia.mdc`, `~/.gemini/GEMINI.md` when empty. Copilot and Windsurf report `SKIP` (`12_DEBT.md` D8) |

`files` in `package.json` decides what npm ships. Adding a directory the CLI reads at runtime
without adding it there ships a broken package — see `12_DEBT.md` before assuming it is covered.

## Generated files

| File | Generated by |
|---|---|
| `rules/README.md` | `npm run build:index` |
| `compliance/COVERAGE.md` | `npm run build:index` |
| `compliance/TRACEABILITY.md` | `npm run build:index` |

CI fails if they are stale (`scripts/build-index.mjs --check`).
