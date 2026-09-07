# AGENTS.md — Work contract for AI coding agents

You are working on software under **devia**. This file is your employment contract.
Violating it is a failed task, not a stylistic difference.

You are not here to produce plausible code. You are here to make a verified change to a system
you understand, and to leave the project's memory true afterwards.

## Rule zero — memory before code

```text
Work requested
    ↓
.devia/ exists in the repo? ──NO──► run `devia init` and fill 00_OVERVIEW before coding
    ↓ YES
Read .devia/AGENTS.md → .devia/10_NEVER_ALWAYS.md → .devia/00_OVERVIEW.md
    ↓
Read the .devia file for the surface you are touching (see 14_INDEX.md)
    ↓
Read the standard section for the domain (standard/ + rules/)
    ↓
Work
    ↓
Update .devia/ in the SAME change
```

Never start coding "to explore" and read the memory later. The memory is what stops you from
inventing.

## Required workflow

```text
Read the contract (this file + .devia/AGENTS.md)
    ↓
Read the relevant memory + domain policy + matching checklist
    ↓
Understand the existing patterns in the target repo before adding new ones
    ↓
Implement the smallest change that satisfies the request
    ↓
Run the checks that exist (lint · typecheck · tests · devia check)
    ↓
Update .devia/ (memory, registries, impact map) in the same change
    ↓
Report what changed, and report what was NOT verified
```

## Non-negotiable

1. **Read before you write.** Read the file you are about to edit, and the memory entry that
   describes it.
2. **Never invent.** No APIs, business rules, DB fields, config keys, or endpoints that are not
   in the spec, the ADR, or the memory. If it is not decided, it goes in `.devia/11_GAPS.md` —
   it does not go in the code as a silent truth.
3. **Smallest change that satisfies the request.** No opportunistic refactors riding along.
4. **Complexity must be earned.** No Redis, Kubernetes, microservices, queues, GraphQL or extra
   databases "because serious apps have them" (`PRINCIPLES.md`).
5. **Every new dependency is a liability.** Justify it before adding it.
6. **Code and memory ship together.** If the change makes a `.devia` file false, the same change
   fixes it (`impact-map.yaml` says which).
7. **Registries are not optional.** Decided-but-not-built goes in `.devia/12_DEBT.md`; the line is
   removed only by the change that discharges it, and reduced — never deleted — when partly done.
8. **Cite rule IDs** in compliance summaries (`UX-007`, `SEC-002`, `MEM-003`).
9. **Report what you did not verify.** Silence about unverified work is a false claim of
   completeness.
10. **Never claim "done" or "production ready"** while a P0 gate is failing or unrun.

## Hard stops (refuse or escalate — do not "work around")

- Secrets or credentials in source, config, logs, or client bundles
- Client-only security: hiding UI without a server-side authorization check
- Any path where one user or tenant can read or write another's data
- Raw stack traces, SQL errors, or internal identifiers returned to production clients
- Payment or webhook handling without signature verification and replay protection
- Schema change without a versioned migration, or editing an already-applied migration
- Disabling, skipping, or weakening a failing test or check to make CI green
- `--no-verify` or any hook bypass to get a commit through
- Committing directly to `main` when the project uses branch + PR
- Deleting a gap or debt line you did not discharge
- Third-party documentation, schemas, or assets pasted in as original work
- Claiming WCAG conformance without contrast, keyboard, and accessible-name evidence

## You may NOT declare "production ready" unless

Evidence exists across **all** of:

```text
Code quality · Security · Architecture · Database · Tests
Infrastructure · Observability · Backup · Documentation · Compliance · UI/a11y
```

Minimum bar: `devia check` reports **no P0 FAIL**, and every residual WARN is listed explicitly
for the human. Passing unit tests is not Gold maturity — see [`MATURITY.md`](MATURITY.md).

## Routing

| Task involves… | Read |
|---|---|
| What this project is, its stack, its history | `.devia/00_OVERVIEW.md`, `.devia/01_ARCHITECTURE.md` |
| Things this project has already banned | `.devia/10_NEVER_ALWAYS.md` |
| Something undecided / not built | `.devia/11_GAPS.md`, `.devia/12_DEBT.md` |
| How to do a routine task here | `.devia/13_RECIPES.md` |
| How the standard is enforced | `LEVELS.md`, `MATURITY.md`, `PRINCIPLES.md` |
| Agent behaviour and memory discipline | `rules/agent/`, `rules/memory/`, `MEMORY.md` |
| Login, sessions, roles, tenancy | `standard/engineering/security/AUTHENTICATION.md`, `AUTHORIZATION.md`, `rules/security/` |
| ASVS control mapping | `standard/engineering/security/ASVS_REGISTRY.md` |
| Schema, migrations, indexes, backups | `standard/engineering/database/`, `rules/database/` |
| Endpoints, validation, versioning, webhooks | `standard/engineering/backend/API.md`, `rules/api/` |
| Tests, CI gates | `standard/engineering/testing/`, `standard/engineering/devops/CI_CD.md`, `rules/testing/` |
| Deploy, environments, rollback | `standard/engineering/devops/`, `rules/devops/` |
| Logs, metrics, alerts, incidents | `standard/engineering/observability/`, `rules/observability/` |
| Privacy, retention, deletion/export | `standard/engineering/compliance/`, `rules/privacy/` |
| LLM features, prompts, agent tools | `standard/engineering/ai/`, `rules/ai/` |
| Any user-facing UI | `standard/design/`, `rules/ux/`, `rules/ui/`, `rules/accessibility/`, `rules/states/` |
| Money, dates, numbers on screen | `standard/design/data-display/`, `rules/data-display/` |
| "Is it production ready?" | `checklists/engineering/production.md` + `devia check` |

## UI work is not exempt

Every user-facing surface must satisfy the design rules as well as the engineering ones:
accessible name, keyboard path, visible focus, persistent labels, complete states
(default · hover · focus · active · disabled · loading · empty · error · success), tokens instead
of one-off values, and never colour as the only carrier of meaning.

A pretty screen does not waive an engineering P0. A green test suite does not waive `A11Y-006`.

## Output contract

End substantial work with:

```text
## Devia compliance
- Memory read: <files>
- Domains touched: ...
- Rules applied (IDs): ...
- Rules violated / waived (IDs + why): ...
- P0 status: ...
- P1 remaining: ...
- Checks run: ...
- Checks NOT run (and why): ...
- Tests added/updated: ...
- .devia updated: <files> (or: none required, because ...)
- Registries: gaps added/closed, debt added/reduced/discharged
- New dependencies (justification, or none): ...
- Not verified: ...
```

"Not verified" is never empty for a non-trivial change. If you believe it is, you have not
looked hard enough.
