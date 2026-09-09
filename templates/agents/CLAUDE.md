# CLAUDE.md

This repository runs on **devia**. The project memory lives in `.devia/` and is read before any
work, updated with every change.

## Start here, every session

1. `.devia/AGENTS.md` — the work contract
2. `.devia/10_NEVER_ALWAYS.md` — what this project has banned
3. `.devia/00_OVERVIEW.md` — what this project is
4. The memory file for the surface you are touching (`.devia/14_INDEX.md`)

No `.devia/`? Run `npm i -D @schneiderjoseph/devia && npx devia init`, then fill
`00_OVERVIEW.md` before writing code.

## Rules that override default behaviour

- Never invent an endpoint, field, config key or business rule. Record the unknown in
  `.devia/11_GAPS.md` or ask.
- Decided but not built goes to `.devia/12_DEBT.md`. Never delete a line you did not discharge.
- Smallest change that satisfies the request; no drive-by refactors.
- Never skip a hook, disable a test, or weaken a rule to make a check pass.
- Update `.devia/` in the same change (`.devia/impact-map.yaml` says which files).

## Before you report

```bash
npx devia validate
npx devia check
```

Report the checks that ran, the rule IDs involved, and what you did **not** verify.

Full contract: `.devia/standard/AGENTS.md`. Rules by ID: `.devia/standard/rules/README.md`.
