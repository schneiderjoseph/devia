# devia

**One standard, one memory.** Devia is the single engineering standard for building software
with AI coding agents — and the living project memory those agents read before they touch
anything.

```text
MEMORY (what this project is)  →  POLICY (rules)  →  CHECK (devia check)  →  ENFORCEMENT (CI)
```

Install it once, run `devia init`, and the project grows a `.devia/` folder. That folder is the
first thing every agent reads and the last thing every change updates.

## Why it exists

An agent that starts cold re-derives the project on every task: it invents APIs, re-litigates
decisions that were already made, ships a UI with no empty state, and reports "done" because the
unit tests passed. Documentation does not fix that — documentation goes stale the moment the code
moves.

Devia fixes it with three things that reinforce each other:

| | | |
|---|---|---|
| **Discipline** | how an agent is allowed to work | `AGENTS.md`, `rules/agent/`, `rules/memory/` |
| **Standard** | how the software must be built | `standard/engineering/`, `standard/design/`, `rules/`, `checklists/` |
| **Memory** | what *this* project actually is | `.devia/` in the target repo |

## Quick start

```bash
npm install -D @schneiderjoseph/devia    # the binary it installs is `devia`
npx devia init                # creates .devia/ + agent adapters
npx devia validate            # memory integrity
npx devia check               # production readiness (P0/P1)
npx devia doctor              # adoption + staleness diagnosis
```

`devia init` writes:

```text
.devia/
├── AGENTS.md            # local work contract
├── 00_OVERVIEW.md       # what this project is, stack, modules
├── 01_ARCHITECTURE.md   # structure, boundaries, current vs target
├── 02_SURFACES.md       # pages / endpoints / jobs and where they live
├── 03_DATA_MODEL.md
├── 04_PERMISSIONS.md
├── 05_FLOWS.md
├── 06_INTEGRATIONS.md
├── 07_DESIGN.md
├── 10_NEVER_ALWAYS.md   # project rules earned from real incidents
├── 11_GAPS.md           # registry: decided by nobody yet
├── 12_DEBT.md           # registry: decided, not built
├── 13_RECIPES.md        # how to do common tasks in THIS repo
├── 14_INDEX.md          # where to find what
├── impact-map.yaml      # change type → files that must be updated
├── devia.json           # profile, modules, maturity target, pinned version
└── standard/            # optional: `devia sync` pins a copy of the standard here
```

Plus adapters so every agent gets the same contract: `AGENTS.md` (universal), `CLAUDE.md`,
`.cursor/rules/devia.mdc`, `.github/copilot-instructions.md`, `.windsurfrules`.

## Rule zero

```text
Work requested on a repository
        ↓
.devia/ exists? ──NO──► run `devia init` FIRST
        ↓ YES
Read .devia/AGENTS.md → 00_OVERVIEW → the surface you are touching
        ↓
Work
        ↓
Update .devia/ in the SAME change
```

An agent that codes without reading the memory, or that ships code without updating it, has
failed the task — not styled it differently.

## What the gates actually caught

`PRINCIPLES.md` says evidence beats opinion, so here is the evidence. Every defect below was
found by devia's own gates, in one week, on devia itself and on one real project — a Next.js
application whose manifest lives in `apps/web/`. None of it is independent adoption; read it as
a tool being run in anger, not as a case study.

| Defect | Caught by |
|---|---|
| Nine relative links resolved in this repository and not in the copy shipped to adopters — every project got nine broken links | The test that walks a materialised `.devia/` instead of listing it |
| `devia debt close` blanked a table row instead of removing it. A blank line ends a markdown table, so every debt line below the closed one was orphaned | Discharging a real debt line with the command itself |
| Two tests parsed `--json` from stdout merged with stderr. On a machine with `FORCE_COLOR` set, a Node warning made the JSON unparseable | `prepublishOnly`, which refused to publish |
| The skill told every agent to bootstrap with `npx devia init`. The package is scoped, so in a repository that has not installed devia that resolves to `404 devia@*` | Installing the skill system-wide, where a cold start is the normal case |
| Five gates reported `SKIP  no package.json` to a repository that has one, with a lockfile, a lint script and thirteen dependencies. The letter of the rule held — nothing was rounded up to `PASS` — but the reason printed was false | Running `devia check` on a real project instead of a fixture |
| `MEM-DEBT-P0` matched `P0` anywhere in a debt row. A P1 line reading "becomes P0 once payments ship" reported a P0 blocker on a project that had none | Writing a real project's debt registry |

The last two are the ones worth dwelling on. A check that cannot answer must say so — but a
`SKIP` with a false reason, or a `FAIL` invented out of prose, is worse than no check at all,
because the reader believes the tool looked. Both are now regression tests.

## What is in the box

| Layer | Where | Content |
|---|---|---|
| Work contract | [`AGENTS.md`](AGENTS.md) | Workflow, hard stops, output contract |
| Principles | [`PRINCIPLES.md`](PRINCIPLES.md) | Simple > clever, complexity earned, dependency liability, evidence > opinion |
| Memory doctrine | [`MEMORY.md`](MEMORY.md) | Registries, sweep discipline, impact map, staleness |
| Rules | [`rules/`](rules/README.md) | 138 rules with stable IDs, severity, priority, validation |
| Engineering | [`standard/engineering/`](standard/engineering/README.md) | Architecture, security (ASVS 5.0), database, API, testing, devops, observability, privacy, payments, AI |
| Design | [`standard/design/`](standard/design/README.md) | UX, UI, accessibility (WCAG 2.2), states, components, data display, i18n, responsive, anti-patterns |
| Checklists | [`checklists/`](checklists/README.md) | Engineering + design review gates |
| Levels | [`LEVELS.md`](LEVELS.md) | Policy → Check → Enforcement |
| Maturity | [`MATURITY.md`](MATURITY.md) | P0–P3, Bronze → Platinum |
| Skill pack | [`skills/devia/SKILL.md`](skills/devia/SKILL.md) | Same contract for Cursor, Claude Code, Copilot, Windsurf, Aider |

## Severity and priority

```text
Rules:    MUST · MUST NOT · SHOULD · MAY
Gates:    P0 blocker · P1 required · P2 recommended · P3 optional
Tiers:    Bronze → Silver → Gold (production-ready) → Platinum
```

A rule without a check is aspirational. A check without CI enforcement is a suggestion.
See [`LEVELS.md`](LEVELS.md).

## Consolidation

Devia absorbs and replaces two earlier standards:

- `production-app-standard` → [`standard/engineering/`](standard/engineering/README.md)
- `design-system-standard` → [`standard/design/`](standard/design/README.md) + design rule IDs

Only devia is maintained. See [`MIGRATION.md`](MIGRATION.md).

## Stack assumption

Written primarily for Node.js / TypeScript, PostgreSQL, React, Docker and GitHub Actions.
The rules transfer to any stack; the commands may need adaptation. The memory layer is
stack-agnostic by construction.

## License

MIT — see [`LICENSE`](LICENSE).
