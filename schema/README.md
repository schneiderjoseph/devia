# Schemas

JSON Schema for the file shapes devia reads and writes. They are the contract; the validators
enforce them.

| Schema | Describes | Enforced by |
|---|---|---|
| [`rule.schema.json`](rule.schema.json) | A rule file's frontmatter | `scripts/validate-rules.mjs`, `src/lib/rules.mjs` |
| [`project-config.schema.json`](project-config.schema.json) | `.devia/devia.json` | `devia validate` (required keys today — see the debt register) |
| [`waiver.schema.json`](waiver.schema.json) | A time-boxed exception | `devia check` (expiry) |
| [`checklist.schema.json`](checklist.schema.json) | A machine-readable checklist | — |
| [`component.schema.json`](component.schema.json) | A design-system component record | — |
| [`token.schema.json`](token.schema.json) | A design token | — |

Schema versions live in [`../VERSION`](../VERSION). A change to a required field is a breaking
change: bump the version and say in [`../CHANGELOG.md`](../CHANGELOG.md) what adopters must do.

A schema listed with no enforcement is documentation, and is marked as such rather than implied
to be checked.
