# Copilot instructions

This repository runs on devia. The project memory is `.devia/`.

- Read `.devia/AGENTS.md`, `.devia/10_NEVER_ALWAYS.md` and `.devia/00_OVERVIEW.md` before
  suggesting changes; read the memory file for the surface you are touching
  (`.devia/14_INDEX.md`).
- Do not invent endpoints, fields, config keys or business rules. Follow the contracts recorded
  in `.devia/02_SURFACES.md` and `.devia/03_DATA_MODEL.md`.
- Authorization is server-side; input is validated at the boundary; no secrets in source; schema
  changes are versioned migrations.
- UI changes need an accessible name, a keyboard path, visible focus, persistent labels, and
  complete states — including empty, loading and error.
- Suggest the matching `.devia/` update alongside the code change.
- Never suggest disabling a test, skipping a hook, or loosening a check to make CI pass.
