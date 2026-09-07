# AGENTS.md — work contract for devia

You are working on **devia** itself: the standard, its rule registry, and the CLI that installs
it. A change here reaches every project that runs `devia init` or `devia sync`.

## Before you touch anything

1. Read [`10_NEVER_ALWAYS.md`](10_NEVER_ALWAYS.md) — what this repository has banned
2. Read [`00_OVERVIEW.md`](00_OVERVIEW.md) and [`01_ARCHITECTURE.md`](01_ARCHITECTURE.md)
3. Read the memory file for the surface you are about to change ([`14_INDEX.md`](14_INDEX.md))
4. Read the contract you are extending: [`../AGENTS.md`](../AGENTS.md),
   [`../PRINCIPLES.md`](../PRINCIPLES.md), [`../MEMORY.md`](../MEMORY.md),
   [`../GOVERNANCE.md`](../GOVERNANCE.md)

## Non-negotiable here

- Rule ids are stable. Supersede, never reuse (`GOVERNANCE.md`, `../rules/LIFECYCLE.md`)
- Generated files (`../rules/README.md`, `../compliance/COVERAGE.md`,
  `../compliance/TRACEABILITY.md`) are never hand-edited — run `npm run build:index`
- No runtime dependencies in the CLI (`ARC-004`)
- A check that cannot determine an answer returns `SKIP` with the reason, never `PASS`
- Never write outside `--root`, never overwrite an adopter's memory without `--force`
- A change to `../templates/project/` is a change to every future adopter: same bar as a `MUST`,
  plus a `CHANGELOG.md` note saying whether `devia sync` is enough
- Update `.devia/` in the same change, per [`impact-map.yaml`](impact-map.yaml) (`MEM-009`)

## Checks

```bash
npm run validate                   # rules, links, generated files current
npm test                           # unit + CLI behaviour
node bin/devia.mjs check --root .  # the standard passes its own gates
node bin/devia.mjs validate        # this repository's own memory
```

All four. They catch different things.

## Output contract

```text
## Devia compliance
- Memory read: ...
- Rules touched (IDs): ...
- P0 status: ...
- Checks run / NOT run: ...
- .devia updated: ...
- Registries: gaps / debt touched
- Not verified: ...
```

Full contract, routing table and hard stops: [`../AGENTS.md`](../AGENTS.md).
