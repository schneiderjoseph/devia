# 10 — Never / Always

> Rules this project earned. Each line names the trap **and** the correct move (`MEM-010`).

## Never

- **Never reuse a rule id**, even for a rule that was removed the same day. Old reports and old
  `.devia` copies cite ids; a reused id makes a citation silently resolve to something else.
  Supersede instead.
- **Never hand-edit `rules/README.md`, `compliance/COVERAGE.md` or `compliance/TRACEABILITY.md`.**
  They are generated; an edit is overwritten by the next `npm run build:index` and CI fails on
  the drift in between. Edit the rule file.
- **Never add a runtime dependency to the CLI.** A tool that bills every dependency as a
  liability (`ARC-004`) cannot ship a tree of its own. Node built-ins, or argue it in the PR.
- **Never let a check return `PASS` when it could not determine the answer.** `SKIP` with the
  reason. A false pass is worse than a missing check, exactly like a false registry line.
- **Never write outside `--root`** — the one exception is `skills install --global`, which is
  off by default and prints every path it writes. Every other path a command touches is derived
  from the context, never from `process.cwd()` inside a command.
- **Never overwrite an adopter's memory file without `--force`.** Those files hold decisions the
  tool did not make.
- **Never add a directory the CLI reads at runtime without adding it to `files` in
  `package.json`.** It works locally and ships broken.
- **Never vendor a file without whatever it links to.** A relative link that resolves in this
  repository and not in `.devia/standard/` is a broken link shipped to every adopter, invisible
  here because `validate-links.mjs` skips `.devia/`. Add the target to `src/lib/vendor.mjs`, and
  let the materialised-tree test in `tests/cli.test.mjs` prove it.

## Always

- Always read the memory file for a surface before changing it (`AGT-001`).
- Always update `.devia/` in the same change as the code (`MEM-009`).
- Always run `npm run validate`, `npm test` and `node bin/devia.mjs check --root .` before
  reporting done — all three, because they catch different things.
- Always regenerate the index after touching a rule file.
- Always give a new rule a `source` and a real validation method, or mark honestly that it can
  only be reviewed by a human.

## How a line gets added

```text
Something broke, or a decision was argued twice
        ↓
Fix it
        ↓
Add ONE line: what not to do, and what to do instead
```

A line nobody has ever violated is noise, and noise teaches agents to skim. Delete it.
