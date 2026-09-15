---
id: DISC-003
title: Structured data describes what the page actually shows
severity: MUST
status: active
domain: discovery
priority: P1
source:
  - devia
applies_to:
  - agent
  - repository
success_criteria:
  []
requirement: >
  Where structured data is published, it MUST describe content that is present and visible on the page. Markup MUST NOT assert ratings, prices, availability, authorship or events the page does not show.
validation:
  automated: true
  manual: true
exceptions: none
---

# DISC-003 — Structured data describes what the page actually shows

**Requirement:** Where structured data is published, it MUST describe content that is present and visible on the page. Markup MUST NOT assert ratings, prices, availability, authorship or events the page does not show.

**Bad:** Product markup carrying a rating the page never displays, added because it produced a richer search result.

**Good:** Structured data generated from the same source as the rendered content, so the two cannot disagree.

## Validation

- Structured data is generated from rendered content, not authored beside it
- A validator runs against representative pages

## Lifecycle

- Status: `active`
- Priority: `P1`
- Exceptions: `none`

## See also

- [DISC-002](../discovery/DISC-002.md)
- [AI-003](../ai/AI-003.md)
- [MEMORY.md](../../MEMORY.md)
