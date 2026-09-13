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

Rules by ID: `npx devia rules --id SEC-001`, or by domain: `npx devia rules --domain database`.
A pinned copy lives under `.devia/standard/` only if this project ran `devia sync`.

For the rules that apply to the task in front of you, rather than all of them:

```bash
npx devia context "<what you are about to do>"     # --explain says why each item is there
```

Found a problem in devia itself rather than in this project? `npx devia contribute` prepares an
issue or a pull request from evidence, without exposing this repository, and sends nothing
without `--yes`.
