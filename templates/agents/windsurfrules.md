# devia rules

This repository runs on devia. `.devia/` is the project memory.

1. Read `.devia/AGENTS.md`, `.devia/10_NEVER_ALWAYS.md`, `.devia/00_OVERVIEW.md` and the memory
   file for the surface you are touching before editing anything. No `.devia/`? Run
   `npm i -D @schneiderjoseph/devia && npx devia init` first.
2. Never invent an endpoint, field, config key or business rule — record the unknown in
   `.devia/11_GAPS.md` or ask.
3. Decided but not built goes to `.devia/12_DEBT.md`; never delete a line you did not discharge.
4. Smallest change that satisfies the request.
5. Server-side authorization, validated input, no secrets, versioned migrations.
6. UI: accessible name, keyboard path, visible focus, persistent labels, complete states, never
   colour alone.
7. Never disable a test, bypass a hook, or weaken a rule to go green.
8. Update `.devia/` in the same change (`.devia/impact-map.yaml`).
9. Report the checks you ran, the rule IDs, and what you did not verify.
