# Contributing

This repository is the standard. A change here reaches every project that runs `devia init` or
`devia sync`, so the review bar is the one in [`GOVERNANCE.md`](GOVERNANCE.md).

## Workflow

1. Never commit to `main`. Branch, then open a pull request (`OPS-002`).
2. One change per pull request. A rule change and a CLI change are two pull requests.
3. Run the checks before asking for review:

```bash
npm run validate           # rules, links, generated files current
npm test                   # unit + CLI behaviour
npm run benchmark:context  # context recall first, reduction second
node bin/devia.mjs check --root .
```

4. Fill the pull request template, including **what you did not verify** (`AGT-006`).

## Adding or changing a rule

A rule lives at `rules/<domain>/<ID>.md` and carries frontmatter:

```yaml
id: SEC-013
title: Short imperative title
severity: MUST | MUST NOT | SHOULD | MAY
status: draft | proposed | active | deprecated | superseded | removed
domain: security
priority: P0 | P1 | P2 | P3
source:
  - OWASP ASVS 5.0 V4
applies_to:
  - api
requirement: >
  One sentence stating the obligation.
validation:
  automated: false
  manual: true
exceptions: none | documented-only
```

Then:

- Filename equals the id; the directory equals the domain — both are enforced.
- Write the body with a **Bad** and a **Good** example that a reader can picture.
- State how it is verified. A rule nobody can check is aspirational; say so in `validation`
  rather than implying a check exists.
- Run `npm run build:index` to regenerate `rules/README.md`, `compliance/COVERAGE.md` and
  `compliance/TRACEABILITY.md`.
- Never reuse an id. Supersede instead (`rules/LIFECYCLE.md`).

New rules earn their place by naming a failure they would have caught. "Best practice" is not a
justification.

## Changing the project template

`templates/project/` is what every adopter receives on `devia init`. Treat a change there like a
`MUST` change, and say in [`CHANGELOG.md`](CHANGELOG.md) whether `devia sync` is enough for
existing adopters or whether they must edit their own memory.

## Changing the CLI

- No runtime dependencies. If you believe one is needed, argue it in the pull request against
  `ARC-004`.
- Commands answer from evidence. A check that cannot determine an answer returns `SKIP` with the
  reason — never `PASS`.
- Add a test in `tests/cli.test.mjs` that exercises the behaviour through the binary.

## Style

- English, in the repository and in the rules.
- Short sentences. Tables over prose where the content is a list.
- No emoji, no AI attribution, no marketing voice.
- Say what is true, including when it is inconvenient.

## Changing context routing or the budget

`src/lib/context.mjs` decides what an agent receives. Two constraints are not negotiable:

- A mandatory item is admitted before the target is consulted and is never dropped. `advisory`
  delivers it whole and reports the target as exceeded; `strict` compresses it toward its
  identifier and never exceeds the target. Neither ever loses it.
- The target, the mandatory floor and what was selected are three numbers and are reported as
  three. Collapsing them makes a stated design read as a broken promise.
- Every selection carries its reason, so `--explain` can answer both "why is this here?" and
  "why is that not?".

Run `npm run benchmark:context` after any change to the keyword table, the path table, the
implication table or the tiers. It asserts recall before it reports a reduction and fails on a
lost blocking rule whatever the percentage says — it is how three real routing defects were
found, none of which were visible in the percentage.

Anchor a new keyword on a whole word. `key` inside `monkey` and `table` inside a schema change
are the two failure modes already recorded in `.devia/10_NEVER_ALWAYS.md`.

## Reporting a problem

Use the issue templates. For a security issue in the CLI, see [`SECURITY.md`](SECURITY.md).

An agent that hit the problem inside a real repository can prepare the report from there with
`npx devia contribute`, which builds a standalone reproduction rather than exposing that
repository. A candidate is eligible only once devia reproduced the problem itself, so an issue
arriving this way already carries a fixture, both behaviours and the version it was seen on. A
fix with a regression test arrives as a pull request; anything else arrives as an issue.

Review it the way you would any other: read the fixture, run it, and check that the claimed
behaviour is the behaviour. The report carries an evidence chain — each run bound to a digest of
the fixture that ran and of the `bin/` + `src/` that ran it — so a `fixed` claim is checkable:
the two rows must share a fixture and differ in devia. If they do not, devia says so itself and
the record stays at `reproduced`.
