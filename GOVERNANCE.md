# Governance

## Purpose

This repository defines the standard. Application repositories **consume** it through
`devia init` and their own `.devia/`; they do not casually fork conflicting rules.

Devia is the only standard maintained here. `production-app-standard` and
`design-system-standard` are absorbed and frozen — see [`MIGRATION.md`](MIGRATION.md).

## Levels

Policy → Check → Enforcement, on top of Memory. See [`LEVELS.md`](LEVELS.md).
A rule without a check is aspirational; a check without CI is a suggestion. Both are allowed,
provided the rule says which it is.

## Changing a rule

- A change to a `MUST` requires a PR with rationale and a traceability update
- Rule IDs are **stable**: supersede, never reuse
- A rule is never silently deleted: `deprecated` → `superseded` → `removed`, with a changelog
  entry and a migration note (see [`rules/LIFECYCLE.md`](rules/LIFECYCLE.md))
- New rules start `draft` or `proposed` and carry at least one source
- Schema changes bump `rule_schema_version` in [`VERSION`](VERSION)

## Changing the project template

`templates/project/` is what every adopter receives. A change there affects every future
`devia init`, so it takes the same review bar as a `MUST` rule, plus a note in
[`CHANGELOG.md`](CHANGELOG.md) telling existing adopters whether `devia sync` is enough.

## Versioning

[`VERSION`](VERSION) carries the standard version and the schema versions. Breaking changes to
rule IDs, to the `.devia/` layout, or to the CLI contract bump the version and ship with a
migration path.

Vendored copies in `.devia/standard/` are pinned to the version that wrote them. `devia sync`
updates them and reports what changed.

## Waivers

A project may waive a rule. It may not do so silently: the waiver lives in `.devia/`, and names
the rule ID, the scope, the reason, the accepting human, and an expiry date. An expired waiver
is a finding, not a habit. Schema: [`schema/waiver.schema.json`](schema/waiver.schema.json).

## Scope

Devia interprets upstream standards (WCAG 2.2, ARIA APG, OWASP ASVS 5.0, NN/g, and adopted
design systems). It does not replace an accessibility audit, a penetration test, or legal
advice.
