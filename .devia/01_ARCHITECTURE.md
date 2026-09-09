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
src/lib/*.mjs          yaml · markdown · fs · git · rules · ui · vendor · version — no command logic
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
| Own Markdown subset renderer | Same reason, same bar: the memory templates use a known subset, and `ARC-004` rules out a library. A line outside the subset is shown as written, never dropped | `src/lib/markdown.mjs` header |
| `devia read` embeds its content | A reader that needs a server is a reader nobody opens: the page works by double-click, offline | `src/commands/read.mjs` |
| Rule IDs are stable and never reused | Citations in old reports must keep resolving | `GOVERNANCE.md`, `rules/LIFECYCLE.md` |
| Pinning the standard into `.devia/standard/` is opt-in | 391 copied files against 17 of memory buries what the folder is for, and every sync becomes a 391-file diff. `devia rules` reads the standard; `devia sync` pins it for offline agents and audits | `src/commands/init.mjs`, `.devia/11_GAPS.md` G8 |
| The CLI version and the standard version move separately | A CLI fix must not force an adopter to re-pin the corpus | `src/lib/version.mjs` |
| `check` scans what git carries, not what the disk holds | A P0 failure on an ignored build artefact is a false positive that teaches people to ignore the gate | `src/lib/git.mjs` |
| Design rule IDs carried over unchanged | Consolidation must not invalidate existing citations | `MIGRATION.md` |
| A check that cannot answer returns SKIP | `PASS` must mean verified, never assumed | `src/commands/check.mjs` |
| devia is for every agent | No agent is privileged: a surface that serves one must say why the others are not served, and record the gap. Absence of evidence about an agent is reported as SKIP, never as "unsupported" | `.devia/11_GAPS.md` G6, `src/commands/skills.mjs` |
| The npm package is scoped, the command is not | npm refused the bare name `devia` as too similar to `degit`, `dexie` and `dva`; scoped names skip that filter. Docs say `npm i -D @schneiderjoseph/devia`, then `npx devia` | `package.json` |

## Current vs target

This repository pins nothing into its own `.devia/standard/`: it *is* the standard, so its
memory points at the repository files directly. Adopters are in the same position by default,
and pin a copy only when they ask for one.
