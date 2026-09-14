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
npm i -D @schneiderjoseph/devia    # the package is scoped, the command is not
npx devia init
```

Install first: `npx devia` only resolves once the package is a dependency of the project.

Then fill `.devia/00_OVERVIEW.md` from what the repository actually contains — stack, modules,
where the truth lives. Read the code to fill it; do not invent it. This is not paperwork: it is
the difference between a task and a guess (`AGT-002`).

**`.devia/` exists** → read, in this order:

1. `.devia/AGENTS.md` — the contract for this repository
2. `.devia/10_NEVER_ALWAYS.md` — what this project has already banned
3. `.devia/00_OVERVIEW.md` — what this project is
4. The memory file for the surface you are about to touch (`.devia/14_INDEX.md`)

## Step 2 — ask for the context this task needs

Do not read the whole standard. Ask for the part of it this task needs:

```bash
npx devia context "add POST /api/orders"
npx devia context "fix the empty state" --files src/components/Orders.tsx
npx devia context "refund flow" --diff --explain
```

It returns the mandatory constraints for the task first — this project's own never/always lines,
the P0 rules for the surfaces involved, and the impact-map duty — then whatever else fits the
target. Roughly a tenth the size of everything devia knows, and it can tell you why any item is
there or missing (`--explain`).

It reports three numbers, and they mean different things: the **target** you asked for, the
**mandatory floor** those constraints cost, and what was **selected**. A mandatory item is never
dropped — in `strict` mode it shrinks to its identifier rather than going over the target, and a
rule shown that way is one you must read with `devia rules --id <ID>` before relying on it.

A rule shown as `checked by devia check → SEC-SECRETS (P0) → blocks the change` is verified
deterministically: you do not need its text, you need to not trip the gate. A rule shown with its
full requirement has nothing checking it but you.

## Step 3 — work under the rules

The rules have stable IDs and are read with `npx devia rules --id <ID>`, or `--domain <name>`
for a whole area. A project that ran `devia sync` also has them on disk under
`.devia/standard/rules/`. The ones that stop most bad changes:

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

## Step 4 — update the memory in the same change

`.devia/impact-map.yaml` maps what you changed to the memory files that must change with it
(`MEM-009`). New endpoint → `02_SURFACES.md`. New table → `03_DATA_MODEL.md`. Permission change
→ `04_PERMISSIONS.md`.

Registries:

```bash
npx devia gap add "Should invoices round per line or per total?"
npx devia debt add "Refund endpoint has no idempotency key (API-004)"
```

Never delete a gap or debt line you did not discharge (`MEM-011`).

## Step 5 — verify, then report

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

## If devia itself is what went wrong

A gate that fires on valid code, a check that misses one, a context selection that spends its
budget badly — that is a devia problem, and it can be reported from here without exposing this
repository.

```bash
npx devia contribute new --type false_positive --gate <ID> \
  --summary "..." --expected "..." --actual "..." \
  --argv "check --json" --actual-matches '"blocking": \[[^\]]*"<ID>"' \
  --expect-absent '"blocking": \[[^\]]*"<ID>"'
npx devia contribute repro C1     # then make the fixture actually fail
npx devia contribute verify C1    # the gate: reproduced, or there is nothing to report
npx devia contribute submit C1    # writes the payload and prints the command; sends nothing
```

Three things are not negotiable:

- **Evidence, not opinion.** "devia could support X" is not a contribution (`AGT-012`). Only a
  problem devia re-ran and reproduced is eligible. A deliberate proposal uses `--manual`, and
  becomes an issue, never a pull request.
- **This repository does not leave the machine** (`PRIV-005`). The payload is a standalone
  fixture, devia's version metadata, and the two behaviours. Read `payload/` before you agree
  to anything.
- **Nothing is sent without `--yes`**, and never under an identity the project did not declare.

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
