# Contributing

This repository is the standard. A change here reaches every project that runs `devia init` or
`devia sync`, so the review bar is the one in [`GOVERNANCE.md`](GOVERNANCE.md).

## Workflow

1. Never commit to `main`. Branch, then open a pull request (`OPS-002`).
2. One change per pull request. A rule change and a CLI change are two pull requests.
3. Run the checks before asking for review:

```bash
npm run validate     # rules, links, generated files current
npm test             # unit + CLI behaviour
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

## Reporting a problem

Use the issue templates. For a security issue in the CLI, see [`SECURITY.md`](SECURITY.md).
