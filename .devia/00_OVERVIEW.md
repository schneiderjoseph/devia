# 00 — Overview

> What this project **is**. No progress, no counters, no plans (`MEM-007`).

## What it is

Devia is a standard and a CLI. The standard says how software must be built and how an AI agent
must work on it; the CLI installs a living memory (`.devia/`) into any repository, checks that
the memory stays true, and runs the readiness gates. It replaces two earlier standards
(`production-app-standard`, `design-system-standard`), which are frozen.

## Who uses it

| Role | Uses |
|---|---|
| AI coding agent | `.devia/` in a target repo; the rule IDs; the output contract |
| Developer | the CLI, the checklists, the rule registry |
| CI | `devia validate` and `devia check` as required gates |
| Maintainer | the rule lifecycle and the project template |

## Stack

| Layer | Technology | Notes |
|---|---|---|
| Language / runtime | Node.js >= 20, ES modules | No runtime dependencies, by rule |
| CLI | `bin/devia.mjs` → `src/cli.mjs` | Lazy-imported command modules |
| Content | Markdown with YAML frontmatter | Parsed by the in-repo YAML subset parser |
| Tests | `node --test` | `tests/*.test.mjs` |
| CI | GitHub Actions | `.github/workflows/ci.yml` |
| Distribution | npm package `@schneiderjoseph/devia` | Scoped; the binary it installs is `devia` |

## Modules

| Module | Responsibility | Where |
|---|---|---|
| Contract | What an agent may and may not do | `AGENTS.md`, `PRINCIPLES.md`, `MEMORY.md` |
| Rule registry | Enforceable statements with stable IDs | `rules/` |
| Corpus | Narrative policy, engineering and design | `standard/`, `checklists/` |
| CLI | init · validate · check · doctor · rules · sync · skills · gap · debt | `bin/`, `src/` |
| Project template | What `devia init` writes into a repository | `templates/project/` |
| Adapters | The same contract for each agent tool | `templates/agents/`, `skills/` |
| Generated | Index, coverage, traceability | `rules/README.md`, `compliance/` |

## Non-goals

- Not a code generator, a linter, or a formatter
- Not a certification: devia interprets WCAG, ASVS and APG, it does not audit against them
- Not a runtime library — nothing here is imported by an adopting application at runtime
- Not a place for project-specific business rules: those live in each project's own `.devia/`

## Where the truth lives

| Question | Source of truth |
|---|---|
| What an agent must do | `AGENTS.md` |
| Why a rule exists | the rule file under `rules/`, plus its `source` |
| How the memory works | `MEMORY.md` |
| How a rule changes | `GOVERNANCE.md`, `rules/LIFECYCLE.md` |
| What the CLI does | `src/commands/`, exercised by `tests/cli.test.mjs` |
| What ships to npm | `files` in `package.json` |
