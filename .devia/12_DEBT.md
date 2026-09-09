# 12 — Debt (decided, not built)

> The project decided; the code does not honour it yet. Adding a line is mandatory even when you
> are not the one fixing it (`MEM-002`). A line is removed only by the change that discharges it,
> and partial work **reduces** the line rather than deleting it (`MEM-003`).

IDs are monotone and never reused (`MEM-004`). A false line is worse than a missing one
(`MEM-005`).

Add one with `npx devia debt add "what is missing"`.

| ID | Rule | Where | What is missing | Priority | Opened |
|---|---|---|---|---|---|
| D1 | LEVELS | `src/commands/check.mjs` | Level 2 says a check produces evidence, but `check` only reads files: it never runs the project's own lint, typecheck or test commands | P2 | 2026-09-03 |
| D2 | — | `src/commands/validate.mjs` | `devia.json` is checked key by key instead of against `schema/project-config.schema.json`; the schema is documentation only | P2 | 2026-09-03 |
| D3 | MEM-008 | `src/commands/validate.mjs` | `validate` does not check that links inside a project's `.devia/` resolve; only `tests/cli.test.mjs` does, and only for a scratch project | P2 | 2026-09-03 |
| D4 | GOVERNANCE | `rules/LIFECYCLE.md` | No rule has ever been superseded, so the `deprecated → superseded → removed` path is enforced by `validate-rules.mjs` but never exercised | P3 | 2026-09-03 |
| D5 | SEC-002 | `src/commands/check.mjs` | The secret scanner is a pattern list, not entropy analysis; it will miss a novel key format and `SECURITY.md` says so rather than the check itself | P2 | 2026-09-03 |
| D7 | OPS-001 | `package.json` | No linter or formatter is configured, so `devia check` reports the missing lint gate on this repository itself; adding one means accepting a devDependency under `ARC-004` | P2 | 2026-09-03 |
| D8 | AGT-001 | src/commands/skills.mjs | No user-level install for Copilot and Windsurf: their global configuration is editor settings rather than a file devia can place, so both report SKIP. Establish the real location before building | P2 | 2026-09-09 |
| D9 | OPS-004 | src/commands/check.mjs | check reads package.json manifests anywhere, but pyproject.toml, go.mod and Cargo.toml are still read at the root only, so a Python or Go package one directory down is invisible | P2 | 2026-09-09 |

## Discharged

| ID | What was missing | Discharged by |
|---|---|---|
| D6 | CI runs on one Node version and one OS; the CLI writes files on Windows and POSIX and only Windows is exercised in practice | CI matrix: ubuntu-latest + windows-latest x node 20/22 |
