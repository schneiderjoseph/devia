---
name: devia
description: >-
  Project memory and engineering standard. Use at the START of any work on a repository:
  initialise or read .devia/, follow the rules it pins, and update it in the same change.
  Triggers on starting work in an unfamiliar repo, "init devia", memory or standard questions,
  and before claiming anything is done or production ready.
---

# devia

A repository worth working on has a memory. `.devia/` is that memory, and this skill is how you
use it.

## Step 1 — is there a memory?

```bash
ls .devia
```

**No `.devia/`** → initialise before writing any code:

```bash
npx devia init
```

Then fill `.devia/00_OVERVIEW.md` from what the repository actually contains — stack, modules,
where the truth lives. Read the code to fill it; do not invent it. This is not paperwork: it is
the difference between a task and a guess (`AGT-002`).

**`.devia/` exists** → read, in this order:

1. `.devia/AGENTS.md` — the contract for this repository
2. `.devia/10_NEVER_ALWAYS.md` — what this project has already banned
3. `.devia/00_OVERVIEW.md` — what this project is
4. The memory file for the surface you are about to touch (`.devia/14_INDEX.md`)

## Step 2 — work under the rules

The rules are pinned in `.devia/standard/rules/` with stable IDs. The ones that stop most bad
changes:

| If you are about to… | Rule |
|---|---|
| Guess an endpoint, field, config key or business rule | `AGT-004` — do not. Ask, or record a gap |
| Encode an undecided policy | `MEM-001` — declare it and open a gap |
| Notice something broken you are not fixing | `MEM-002` — open a debt line |
| Refactor beyond the request | `AGT-003` — do not |
| Skip a hook or disable a test | `OPS-003`, `TST-003` — do not |
| Read user data on the server | `SEC-001`, `SEC-005` — authorize, scope, test it |
| Accept input from anywhere | `SEC-003` — validate at the boundary |
| Change the schema | `DB-001`, `DB-002` — versioned migration, never edit an applied one |
| Ship a screen | `A11Y-001`, `A11Y-004`, `A11Y-006`, `UX-007`, `UI-004`, `STATE-002` |
| Say "done" | `AGT-005`, `AGT-006` — name the checks, name what is unverified |

Look one up:

```bash
npx devia rules --id SEC-001
npx devia rules --domain database --priority P0
```

## Step 3 — update the memory in the same change

`.devia/impact-map.yaml` maps what you changed to the memory files that must change with it
(`MEM-009`). New endpoint → `02_SURFACES.md`. New table → `03_DATA_MODEL.md`. Permission change
→ `04_PERMISSIONS.md`.

Registries:

```bash
npx devia gap add "Should invoices round per line or per total?"
npx devia debt add "Refund endpoint has no idempotency key (API-004)"
```

Never delete a gap or debt line you did not discharge (`MEM-011`).

## Step 4 — verify, then report

```bash
npx devia validate     # memory integrity: structure, registries, placeholders
npx devia check        # readiness gates — P0 failures block
npx devia doctor       # is the memory older than the code?
```

Report with:

```text
## Devia compliance
- Memory read: ...
- Rules applied (IDs): ...
- P0 status: ...
- Checks run / NOT run: ...
- .devia updated: ...
- Registries: gaps / debt touched
- Not verified: ...
```

For a non-trivial change, "Not verified" is never empty.

## Installing the contract for other agents

`devia init` writes the adapters: `AGENTS.md` (universal), `CLAUDE.md`,
`.cursor/rules/devia.mdc`, `.github/copilot-instructions.md`, `.windsurfrules`. To refresh them
later:

```bash
npx devia skills install --agent all
```

## What this skill is not

It is not a code generator, and it is not a substitute for reading the repository. It is the
discipline that makes reading the repository unnecessary a second time.
