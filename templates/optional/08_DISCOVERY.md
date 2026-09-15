# 08 — Discovery

> How this project is found, by search engines and by machines. Written here because "SEO" and
> "AI access" are not tasks somebody remembers at the end — they are decisions with owners
> (`DISC-001`, `DISC-005`).

Two sections, one set of mechanisms. What differs between them is the policy, not the technique:
semantics, structure and a robots file serve both readers.

## Search

| Decision | Value | Where it is implemented |
|---|---|---|
| Indexable at all | TODO(devia): yes / no / per-surface | |
| Canonical host | TODO(devia) | |
| Robots policy | TODO(devia) | |
| Sitemap | TODO(devia) | |
| Title and description | TODO(devia): generated from what? | |
| Structured data | TODO(devia): which types, generated from what | |
| Locales and alternates | TODO(devia) | |

The register holds the ruling (`decisions.yaml` → `discovery.indexing`); this table holds where
the code implements it.

### Never indexable

TODO(devia): the surfaces that must never appear in an index — staging, previews, admin,
anything behind authentication. Each one is protected by authentication or network policy, not
by a robots directive: a robots file is a request, and a public list of what exists
(`DISC-004`).

| Surface | Kept out how | Verified by |
|---|---|---|
| | | |

## Machine and AI access

The policy question is not a technical one, and it is not the agent's to answer: **may automated
clients fetch this content, and may it be used to train models?**

| Decision | Value | Mechanism | Status of that mechanism |
|---|---|---|---|
| AI crawlers may fetch | TODO(devia) | robots user-agent groups | standard (RFC 9309) |
| Content may be used for training | TODO(devia) | robots user-agent groups, response headers | partly enforceable |
| Machine-readable summary | TODO(devia) | `llms.txt` and similar | **convention, unratified** |

Record what each mechanism actually is. A robots file is a standard that well-behaved crawlers
honour and nothing forces; a `noai` meta tag is a convention a handful of sites adopted; an
`llms.txt` is a proposal with partial adoption. None of them is access control, and none may be
described to anyone as protection (`DISC-006`).

Where a decision must hold regardless of goodwill, it is enforced at the boundary — auth, rate
limits, network policy — and that enforcement is what gets written down here.

## What actually helps a machine read this

Ahead of any of the above, and true for both readers:

```text
one <h1>, headings that nest
content in the markup, not only after hydration
links with text that says where they go
structured data generated from the rendered content (DISC-003)
stable URLs
```

A page a screen reader can follow is a page a crawler can follow. That is not a coincidence, and
it is the cheapest discovery work in the project (`A11Y-001`).
