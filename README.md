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
npm install -D devia          # or: npx devia init
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
└── standard/            # vendored, version-pinned copy of the standard
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
