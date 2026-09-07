# AGENTS.md — work contract for {{PROJECT_NAME}}

You are working on **{{PROJECT_NAME}}** under devia {{DEVIA_VERSION}}.
This file is your contract. Violating it is a failed task.

## Before you touch anything

1. Read [`10_NEVER_ALWAYS.md`](10_NEVER_ALWAYS.md) — what this project has already banned
2. Read [`00_OVERVIEW.md`](00_OVERVIEW.md) — what this project is
3. Read the memory file for the surface you are about to change ([`14_INDEX.md`](14_INDEX.md))
4. Read the standard section for the domain: [`standard/AGENTS.md`](standard/AGENTS.md),
   [`standard/rules/README.md`](standard/rules/README.md)

Then work. Then update this memory in the same change.

## Non-negotiable here

- Never invent an endpoint, field, config key or business rule. Unknown means **ask**, or record
  it in [`11_GAPS.md`](11_GAPS.md) — not a quiet default (`AGT-004`, `MEM-001`)
- Decided but not built goes in [`12_DEBT.md`](12_DEBT.md), even when you are not fixing it
  (`MEM-002`)
- Smallest change that satisfies the request; no opportunistic refactors (`AGT-003`)
- Never disable a test, skip a hook, or weaken a rule to go green (`TST-003`, `OPS-003`,
  `AGT-011`)
- Never claim done or production ready without naming the checks that ran (`AGT-005`)
- Always report what you did **not** verify (`AGT-006`)
- Update `.devia/` in the same change, per [`impact-map.yaml`](impact-map.yaml) (`MEM-009`)

## Checks

```bash
npx devia validate     # memory integrity
npx devia check        # readiness gates (P0 blocks)
```

TODO(devia): add this project's own commands — install, dev, test, lint, migrate.

## Output contract

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

Full contract, routing table and hard stops: [`standard/AGENTS.md`](standard/AGENTS.md).
