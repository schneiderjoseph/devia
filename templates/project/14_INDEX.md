# 14 — Index

> Where to find what. The first stop when the answer is "somewhere in the repo".

## Memory

| Question | File |
|---|---|
| What is this project? | [`00_OVERVIEW.md`](00_OVERVIEW.md) |
| How is it structured? | [`01_ARCHITECTURE.md`](01_ARCHITECTURE.md) |
| What routes, endpoints and jobs exist? | [`02_SURFACES.md`](02_SURFACES.md) |
| What is stored? | [`03_DATA_MODEL.md`](03_DATA_MODEL.md) |
| Who can do what? | [`04_PERMISSIONS.md`](04_PERMISSIONS.md) |
| What must never break? | [`05_FLOWS.md`](05_FLOWS.md) |
| What do we call out to? | [`06_INTEGRATIONS.md`](06_INTEGRATIONS.md) |
| What are the interface rules here? | [`07_DESIGN.md`](07_DESIGN.md) |
| What is banned? | [`10_NEVER_ALWAYS.md`](10_NEVER_ALWAYS.md) |
| What is undecided? | [`11_GAPS.md`](11_GAPS.md) |
| What is owed? | [`12_DEBT.md`](12_DEBT.md) |
| How do I do X? | [`13_RECIPES.md`](13_RECIPES.md) |

## Code

| Thing | Path |
|---|---|
| Entry point | TODO(devia) |
| Routes / controllers | TODO(devia) |
| Domain logic | TODO(devia) |
| Data access | TODO(devia) |
| Migrations | TODO(devia) |
| UI components | TODO(devia) |
| Tests | TODO(devia) |
| CI configuration | TODO(devia) |

## Documents

| Document | Path | Owns |
|---|---|---|
| TODO(devia) | | |

## Standard

The standard is read through the CLI, not copied into this repository.

| Need | Command |
|---|---|
| A rule by ID | `npx devia rules --id SEC-001` |
| Every rule in a domain | `npx devia rules --domain database --priority P0` |
| Work contract | `AGENTS.md` at this repository's root |
| Readiness gates | `npx devia check` |

`npx devia sync` pins a version-locked copy under `standard/` when an agent must read it
offline, or when an audit needs the exact wording you built against. Add the paths here if you
do.
