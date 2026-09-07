# 01 — Architecture

> How the system is organised, and which boundaries must not be crossed (`ARC-001`).

## Shape

```text
bin/devia.mjs          thin entry: parse, dispatch, set the exit code
   ↓
src/cli.mjs            argument parsing, command table, context (root, .devia, flags)
   ↓
src/commands/*.mjs     one file per command, each exporting a default (ctx, name) => exit code
   ↓
src/lib/*.mjs          yaml · fs · rules · ui — no command logic lives here
   ↓
content                rules/ · standard/ · checklists/ · templates/ (read, never imported)
```

Content is data. Code reads it; code never encodes what a rule says.

## Layers and boundaries

| Layer | Owns | Must not |
|---|---|---|
| `bin/` | Process concerns: argv, exit code, error printing | Contain logic |
| `src/cli.mjs` | Dispatch and context | Know what any command does |
| `src/commands/` | One command each; prints its own report | Import another command for its side effects (only `skills.mjs` and `validate.mjs` export helpers, deliberately) |
| `src/lib/` | Parsing, file access, rule loading, output styling | Know about commands or exit codes |
| Content | The standard | Contain executable logic |

## Directory map

| Path | Contains |
|---|---|
| `bin/` | The executable |
| `src/` | CLI implementation |
| `rules/` | The registry: `<domain>/<ID>.md`, plus generated `README.md` and `LIFECYCLE.md` |
| `standard/` | Narrative policy: `engineering/`, `design/` |
| `checklists/` | Review gates: `engineering/`, `design/` |
| `compliance/` | Generated coverage and traceability, plus requirements and waivers |
| `schema/` | JSON Schema for rules, tokens, waivers, checklists, project config |
| `templates/project/` | What `devia init` writes into `.devia/` |
| `templates/agents/` | Adapters: AGENTS.md, CLAUDE.md, cursor, copilot, windsurf |
| `templates/github/` | CI workflow for adopting repositories |
| `skills/devia/` | The skill pack |
| `scripts/` | Repository self-validation and index generation |
| `tests/` | `node --test` suites |

## Decisions that constrain new work

| Decision | Why | Recorded in |
|---|---|---|
| No runtime dependencies | The tool that preaches `ARC-004` cannot carry a tree of its own | `.cursor/rules/devia.mdc`, `CONTRIBUTING.md` |
| Own YAML subset parser | Frontmatter and impact maps only; devia writes the files it reads | `src/lib/yaml.mjs` header |
| Rule IDs are stable and never reused | Citations in old reports must keep resolving | `GOVERNANCE.md`, `rules/LIFECYCLE.md` |
| The standard is vendored into `.devia/standard/` | Agents read it offline, with no package manager and no network | `src/commands/init.mjs` |
| Design rule IDs carried over unchanged | Consolidation must not invalidate existing citations | `MIGRATION.md` |
| A check that cannot answer returns SKIP | `PASS` must mean verified, never assumed | `src/commands/check.mjs` |

## Current vs target

This repository vendors nothing into its own `.devia/standard/`: it *is* the standard, so its
memory points at the repository files directly. Every other adopter gets the vendored copy.
