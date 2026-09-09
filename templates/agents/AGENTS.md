# AGENTS.md

This repository uses **devia**: a standard plus a living project memory in `.devia/`.

## Before any work

1. Read [`.devia/AGENTS.md`](.devia/AGENTS.md) — the work contract for this repository
2. Read [`.devia/10_NEVER_ALWAYS.md`](.devia/10_NEVER_ALWAYS.md) — what is already banned here
3. Read [`.devia/00_OVERVIEW.md`](.devia/00_OVERVIEW.md) — what this project is
4. Read the memory file for the surface you are touching — see
   [`.devia/14_INDEX.md`](.devia/14_INDEX.md)

If `.devia/` is missing, run `npm i -D @schneiderjoseph/devia && npx devia init`, then fill
`00_OVERVIEW.md` before writing code.

## While working

- Never invent endpoints, fields, config keys or business rules. Unknown means ask, or record it
  in `.devia/11_GAPS.md`
- Decided but not built goes in `.devia/12_DEBT.md`, even when you are not fixing it
- Smallest change that satisfies the request
- Never disable a test, bypass a hook, or weaken a rule to make a check pass

## Before reporting

```bash
npx devia validate    # memory integrity
npx devia check       # readiness gates
```

Update `.devia/` in the same change (see `.devia/impact-map.yaml`), then report what you changed
**and what you did not verify**.

Full standard: [`.devia/standard/AGENTS.md`](.devia/standard/AGENTS.md) ·
rules by ID: [`.devia/standard/rules/README.md`](.devia/standard/rules/README.md)
