# devia rules

This repository runs on devia. `.devia/` is the project memory.

1. Read `.devia/AGENTS.md`, `.devia/10_NEVER_ALWAYS.md`, `.devia/00_OVERVIEW.md` and the memory
   file for the surface you are touching before editing anything. No `.devia/`? Run
   `npm i -D @schneiderjoseph/devia && npx devia init` first.
2. Never invent an endpoint, field, config key or business rule — record the unknown in
   `.devia/11_GAPS.md` or ask.
3. A `pending` slot in `.devia/decisions.yaml` is not permission to choose one — no brand,
   palette, framework major or indexing policy invented while implementing. A missing asset stays
   missing.
4. Decided but not built goes to `.devia/12_DEBT.md`; never delete a line you did not discharge.
5. Smallest change that satisfies the request.
6. Server-side authorization, validated input, no secrets, versioned migrations.
7. UI: accessible name, keyboard path, visible focus, persistent labels, complete states, never
   colour alone.
8. Never disable a test, bypass a hook, or weaken a rule to go green.
9. Update `.devia/` in the same change (`.devia/impact-map.yaml`).
9. Report the checks you ran, the rule IDs, and what you did not verify.
10. `npx devia context "<task>"` gives the rules for one task instead of the whole standard.
11. A problem in devia itself goes through `npx devia contribute`: reproduce it first, and
    nothing leaves this repository without `--yes`.
