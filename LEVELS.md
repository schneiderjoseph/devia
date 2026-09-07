# Four levels of the standard

Documentation alone is not a standard. Devia operates on four levels, and each one is worthless
without the next.

```text
LEVEL 0 — MEMORY       what is true about this project
LEVEL 1 — POLICY       what must be true of the work
LEVEL 2 — CHECK        how we verify it
LEVEL 3 — ENFORCEMENT  how CI says no
```

## Level 0 — Memory

`.devia/` in the target repo: overview, architecture, surfaces, data model, permissions,
never/always, gaps, debt, recipes, index, impact map.

Without it every agent starts cold, and policy has nothing to attach to: "follow the existing
pattern" is meaningless if nobody wrote down what the pattern is.

Verified by `devia validate` (structure, registries, staleness markers) and `devia doctor`
(is the memory older than the code it describes?).

## Level 1 — Policy

Rules with stable IDs under [`rules/`](rules/README.md), domain policy under
[`standard/`](standard/README.md), and priorities in [`MATURITY.md`](MATURITY.md).

Examples: server-side authorization on every sensitive route (`SEC-001`), versioned migrations
(`DB-001`), visible focus (`A11Y-006`), no undecided rule coded as a silent truth (`MEM-001`).

## Level 2 — Check

Commands that produce evidence:

```bash
npm run lint
npm run typecheck
npm test
npm audit --omit=dev
npx devia validate      # memory integrity
npx devia check         # readiness gates (P0/P1) → PASS / WARN / FAIL
npx devia doctor        # adoption, drift, staleness
```

`devia check` aggregates evidence into PASS / WARN / FAIL and exits non-zero on any P0 FAIL.

## Level 3 — Enforcement

CI must be able to say **NO** to a pull request.

Copy [`templates/github/workflows/app-ci.yml`](templates/github/workflows/app-ci.yml) into the
application repo and mark the checks required in branch protection.

```text
PR
├── Lint / Typecheck / Unit        required
├── Integration                    required (when present)
├── Dependency audit               required
├── Secret scan                    required
├── devia validate (memory)        required
├── devia check (P0)               required
├── Accessibility gates            required for UI paths
├── E2E / smoke                    required for release paths
└── MERGE BLOCKED on any FAIL
```

## Mapping rule

Every P0 policy item should map all the way down:

```text
Memory fact → Policy rule → Checklist item → Automated check → CI gate
```

If a P0 cannot be automated yet, document the manual check and treat it as a release-blocking
sign-off — never as "optional". A rule with no check is aspirational; say so in the rule's
`validation` block instead of pretending.
