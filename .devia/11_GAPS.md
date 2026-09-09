# 11 — Gaps (undecided)

> Questions nobody has ruled on. Until a gap is decided, the code must not encode an answer
> silently (`MEM-001`).

IDs are monotone and never reused (`MEM-004`). A gap is closed by recording the decision — then
either building it, or opening a debt line for it.

Add one with `npx devia gap add "question"`.

| ID | Question | Impact if wrong | Interim behaviour | Status |
|---|---|---|---|---|
| G2 | Should `--strict` make P1 failures blocking for projects targeting Gold? | Teams at Gold get no gate between "P0 clear" and manual review | Only P0 blocks; P1 is reported and left to the human | open |
| G3 | Do waivers belong in `devia.json` or in separate reviewable files? | Waivers in one JSON blob are easy to slip through review | `waivers[]` in `devia.json`, validated for expiry by `devia check` | open |
| G4 | Should `devia sync` warn when an adopter has edited a vendored file? | Silent overwrite of a local edit that someone believed was persistent | `sync` reports changed and removed files after the fact | open |
| G5 | How should a project override a rule's priority for its own context (a docs repo has no `SEC-001` surface)? | Either noisy irrelevant findings, or a habit of ignoring output | Rules apply as written; irrelevant ones are simply not applicable | open |
| G7 | Should devia read an existing ad-hoc project memory (a DEVIA/ folder of YAML, a docs/context tree) when initialising, or leave the merge to a human? | | | open |

## Closed

| ID | Question | Decided by |
|---|---|---|
| G6 | Should devia install its contract at user level for every agent, or stay per-repository outside Claude Code? | devia is for every agent — user-level install built for Claude Code, Codex, Cursor and Gemini in 0.3.0 |
| G1 | Should `devia check` grow ecosystem-specific gates (Python, Go, Rust) or stay deliberately generic? | Reframed: the failure was not the ecosystem but the assumption that the manifest sits at the repository root — fixed in 0.4.0. Ecosystem-specific gates remain out of scope |
