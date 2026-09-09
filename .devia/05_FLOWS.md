# 05 — Flows

> The journeys this project cannot afford to break (`TST-005`).

## Critical journeys

| Journey | Steps | Covered by |
|---|---|---|
| Adopt | `npm i -D @schneiderjoseph/devia` → `devia init` → memory and adapters exist, nothing pinned | `tests/cli.test.mjs` "init creates the memory…" |
| Re-run safely | `devia init` on a repository that already has a filled memory keeps every decision | "init does not overwrite a filled memory" |
| Verify | `devia validate` → structure, config, impact map, registry ids, placeholders | "validate reports placeholders…", "validate detects a reused registry id" |
| Gate | `devia check` → P0 failures block, exit code 1 | "check blocks on P0 and explains why", "check finds a committed secret" |
| Record | `devia gap add` / `devia debt add` / `debt close` → monotone ids, nothing deleted | "gap and debt lines get monotone ids…" |
| Upgrade | `devia sync` → standard pinned or refreshed, pin updated, memory untouched | "sync pins the standard on demand" |
| Cite | `devia rules --id SEC-001` → the full rule text | "rules can be queried by id and by filter" |

## Failure behaviour

| Journey | Failure mode | The user sees | The system does |
|---|---|---|---|
| Adopt | No write permission | The node error, prefixed `devia:` | Exits 1; nothing partially claimed as done |
| Verify | Memory missing entirely | `no .devia/ in this repository` and the fix | Exits 1 |
| Gate | A P0 gate fails | The gate, the reason, the rule id, `BLOCKED` | Exits 1 so CI stops the merge |
| Gate | A check cannot determine an answer | `SKIP` with the reason | Never counts as a pass |
| Upgrade | The pinned version differs from the installed one | `validate` and `doctor` warn and name `devia sync` | Leaves the pin until sync runs |
| Any | An unexpected exception | `devia: <message>` (stack with `DEVIA_DEBUG=1`) | Exits 1 |

The rule behind the whole table: silence is never a pass.
