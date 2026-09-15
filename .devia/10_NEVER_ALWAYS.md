# 10 — Never / Always

> Rules this project earned. Each line names the trap **and** the correct move (`MEM-010`).

## Never

- **Never accept a failure message as a diagnosis.** `devia update` reported "could not reach
  the registry" and the registry was fine: `npm view` returns a bare scalar when only one of the
  asked-for fields resolves, and `npm.cmd` cannot be spawned without a shell since the fix for
  CVE-2024-27980. Two bugs wearing the same sentence, and that sentence looked like somebody
  else's problem. Reproduce the underlying call by hand before believing what the wrapper says.
- **Never test a code path only through a seeded fixture.** Every update test passed against a
  hand-written cache while the lookup that fills it was dead. If a function talks to the outside
  world, one test drives the real thing and tolerates it being unavailable — the rest may seed.
- **Never let a new check fail a memory an older devia created.** A gate added in version N
  reports `SKIP` with the reason when the file it reads does not exist, and `validate` warns
  rather than failing. An upgrade that fails every existing adopter's build is a bill, not an
  upgrade path.
- **Never let a new gate block on a state that is normal.** A pending decision is the ordinary
  condition of a live project; only the project's own `blocks:` declaration turns one into a P0.
  A gate that fires on everything is a gate somebody switches off, and it takes the gates that
  mattered with it.
- **Never `padEnd` a string that already carries colour.** An escape sequence has width in
  `padEnd` and none on screen, so the column is right with `NO_COLOR` and wrong in a terminal.
  Pad the plain word, then colour it.
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
- **Never set `FORCE_COLOR` to an empty string to neutralise it.** Node warns on stderr when it
  sees both `NO_COLOR` and `FORCE_COLOR`, and `""` still counts as seeing it. Delete the key from
  the inherited environment instead. The tests learned this once; `runObservation` had to learn
  it again, because a warning leaking into captured stdout turns a verdict into a parse failure.
- **Never let a routing table match a substring of a word.** `key` inside `monkey` redacted
  `monkey: banana`; `table` in the component keywords sent a schema change through
  `components → accessibility` and pulled the whole screen corpus into it. Anchor on a whole
  segment, and let a benchmark or a test name the word it must not match.
- **Never call a number a budget when it is a target that can be exceeded.** Print the target,
  the mandatory floor and what was actually selected, and the status that reconciles them.
  "Budget 600, selected 1380" reads as a broken promise even when the design was stated.
- **Never degrade everything to fit, then spend the freed room on something less important.**
  Compression starts at the smallest form and buys back upward in relevance order. The first
  version shrank every mandatory rule to an identifier and then admitted *optional* rules at
  full text.
- **Never record a verdict that outlives the claim it was made about.** A verification is bound
  to a hash of the observation; edit the observation and the state drops back to `observed`. A
  stale verdict is exactly how an unreproduced problem reaches a maintainer.
- **Never vendor a file without whatever it links to.** A relative link that resolves in this
  repository and not in `.devia/standard/` is a broken link shipped to every adopter, invisible
  here because `validate-links.mjs` skips `.devia/`. Add the target to `src/lib/vendor.mjs`, and
  let the materialised-tree test in `tests/cli.test.mjs` prove it.

## Always

- Always read the memory file for a surface before changing it (`AGT-001`).
- Always update `.devia/` in the same change as the code (`MEM-009`).
- Always run `npm run validate`, `npm test` and `node bin/devia.mjs check --root .` before
  reporting done — all three, because they catch different things.
- Always run `npm run benchmark:context` after touching the router, the tiers or the budget. A
  reduction that drops a rule the task needed is not a reduction, and only the benchmark says so.
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
