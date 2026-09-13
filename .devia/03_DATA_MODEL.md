# 03 — Data model

> This project has no database. Its data is files, and their shapes are the contract.

## Entities

| Entity | Meaning | Defined in | Shape |
|---|---|---|---|
| Rule | One enforceable statement | `rules/<domain>/<ID>.md` | `schema/rule.schema.json` |
| Project config | An adopter's declared profile, maturity and waivers | `.devia/devia.json` | `schema/project-config.schema.json` |
| Impact map | Change type → memory files | `.devia/impact-map.yaml` | `version` + `impacts` |
| Registry line | A gap or a debt row | `.devia/11_GAPS.md`, `.devia/12_DEBT.md` | Markdown table row, id `G<n>` / `D<n>` |
| Waiver | Time-boxed exception | `devia.json` `waivers[]` | `schema/waiver.schema.json` |
| Version pin | Standard and schema versions | `VERSION` | YAML scalars |
| Contribution record | Evidence for a devia problem seen here | `.devia/contributions/<id>/record.json` | `schema/contribution.schema.json` |
| Context item | One addressable piece of deliverable context | Derived from rules and `.devia/` | `{ kind, id, domains, tier, tokens, why }` in `src/lib/context.mjs` |

A contribution record is JSON rather than YAML because it is machine data the CLI writes and
reads, like `devia.json` — not content a human authors, which is where the frontmatter shape
belongs.

## Invariants

- A rule id matches `^[A-Z][A-Z0-9]*(-[A-Z0-9]+)+$`, the filename equals the id, and the
  directory equals the domain. Enforced in `src/lib/rules.mjs` and in CI.
- Rule ids are unique across the whole registry and are never reused after removal.
- Every rule has at least one `source` and at least one validation method.
- Registry ids are monotone per registry and never reused, including after closure (`MEM-004`).
- Generated files are derived from the rule files; the rule files are the source of truth.
- A contribution record never stores its own state. The state is computed from the verification,
  and the verification is bound to a hash of the claim it was made about — editing the claim
  drops the verdict rather than carrying it forward.
- `fixed` requires two observations that are the same experiment: devia saw the problem, then
  devia saw it gone, with the same fixture digest and a different devia digest. One run can only
  ever be half of that, and two runs over two different fixtures are not a fix at all.
- A mandatory context item is admitted before the target is consulted. In `advisory` it is never
  compressed and the target is reported as exceeded; in `strict` it may be compressed toward its
  identifier but is never dropped, and the target is never exceeded.
- `target`, `mandatory floor` and `selected` are three separate numbers and are always reported
  as three.

## Lifecycles

Rule status: `draft → proposed → active → deprecated → superseded → removed`
(`rules/LIFECYCLE.md`). A `superseded` rule must name an existing `superseded_by`, which
`scripts/validate-rules.mjs` enforces.

Registry line: `open → closed` for a gap, `open → discharged` for debt. Closure records the
change that closed it; partial work reduces the line instead of removing it (`MEM-003`).

Contribution: `incomplete → observed → reproduced → fixed`, with `rejected` reachable from any
verification that did not show the reported behaviour. Only `reproduced` and `fixed` are
eligible to be proposed, and only `fixed` with a named regression test routes to a pull request
(`AGT-012`).

## Migrations

There is no schema migration. The equivalent is versioning: a breaking change to a rule id, the
`.devia/` layout, or the CLI contract bumps `VERSION` and ships with a note in `CHANGELOG.md`
telling adopters whether `devia sync` is enough.
