# Principles

Non-negotiable for this standard and every project that adopts it. Rules expire and get
superseded; these do not.

## Core comparisons

```text
Simple > Clever
Explicit > Implicit
Validated > Trusted
Tested > Assumed
Documented > Remembered
Automated > Manual
Observable > Blind
Recoverable > Fragile
Clear > Novel
Accessible > Decorative
Tokens > One-off values
States complete > Happy path
Evidence > Opinion
Secure by default · Least privilege · Fail safely
```

## Memory is part of the system

A project's truth lives in three places, and only one of them is cheap to keep honest:

```text
Code        — true by definition, unreadable at scale
Docs        — long, authoritative, goes stale silently
.devia/     — short, indexed, updated in the same change as the code
```

`.devia/` **points**, it does not duplicate. If the exact SQL lives in `docs/DATABASE.md`, the
memory records that the table exists and where its definition is — not a second copy that will
drift.

Corollary: a memory file that is allowed to be wrong is worse than no memory file. A false
registry line is worse than a missing one, because it is trusted.

## Complexity must be earned

Do not impose Redis, Kubernetes, microservices, Kafka, Elasticsearch, GraphQL, CDNs, queues,
extra databases, service meshes or multi-region "because serious apps have them".

```text
Need demonstrated?
    ↓
YES → implement, record the decision (ADR)
NO  → do not introduce the complexity
```

The same bar applies to the interface: extra navigation modes, custom components that duplicate
system ones, motion that communicates nothing, colour tokens for "branding experiments" with no
product need.

**Use when justified. Record the decision.**

## Every new dependency is a liability

Before adding a library, a component, or a token, answer:

| Question | Why it matters |
|---|---|
| Why do we need it? | Feature vs convenience |
| Does something we already have cover this? | Drift is the default failure |
| Security track record? | CVEs, maintainer trust |
| Maintenance? | Last release, bus factor |
| License? | Compatible with distribution |
| Cost at runtime / in the bundle? | Performance is a feature |
| Supply-chain risk? | Typosquatting, install scripts |
| What states does it need? | Half-built UI is not a component |

Adding a dependency is a product decision, not a typing shortcut.

## Nothing undecided becomes a silent truth

When the answer is not known, the agent does not pick one quietly and encode it. It implements a
**declared** policy and records the open question in `.devia/11_GAPS.md`.

When the answer *is* known but not built, that is not "we know about it" — it is a line in
`.devia/12_DEBT.md`, with an ID that is never reused.

## Authoritative sources over taste

When taste conflicts with WCAG, ARIA APG, OWASP ASVS, or an adopted rule, the standard wins.
Sources are listed in [`REFERENCES.md`](REFERENCES.md); they are cited, not paraphrased into
private folklore.

## Done means verified

"Done" is a claim about evidence, not about effort:

```text
The change works        → tests or manual steps stated
The change is safe      → P0 gates pass
The change is honest    → memory updated, unverified parts named
```

Anything else is a draft.

## Related

- Agent behaviour: [`AGENTS.md`](AGENTS.md)
- Memory doctrine: [`MEMORY.md`](MEMORY.md)
- Enforcement levels: [`LEVELS.md`](LEVELS.md)
- Maturity tiers: [`MATURITY.md`](MATURITY.md)
- Architecture detail: [`standard/engineering/architecture/PRINCIPLES.md`](standard/engineering/architecture/PRINCIPLES.md)
- Design hierarchy: [`standard/design/principles/design-principles.md`](standard/design/principles/design-principles.md)
