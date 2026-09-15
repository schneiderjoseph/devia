---
id: DISC-007
title: Localized surfaces declare their alternates
severity: SHOULD
status: active
domain: discovery
priority: P2
source:
  - devia
applies_to:
  - agent
  - repository
success_criteria:
  []
requirement: >
  Where the same content is published in several languages or regions, each page SHOULD declare its alternates and its own canonical URL, so that locales are treated as alternates of one another rather than as duplicates.
validation:
  automated: true
  manual: true
exceptions: none
---

# DISC-007 — Localized surfaces declare their alternates

**Requirement:** Where the same content is published in several languages or regions, each page SHOULD declare its alternates and its own canonical URL, so that locales are treated as alternates of one another rather than as duplicates.

**Bad:** Four locales of the same page competing with each other, and the wrong one surfacing per region.

**Good:** Reciprocal alternate declarations generated from the route table, one canonical per locale.

## Validation

- Alternates are generated from the routing table, not maintained by hand
- Reciprocity is checked in CI

## Lifecycle

- Status: `active`
- Priority: `P2`
- Exceptions: `none`

## See also

- [I18N-001](../localization/I18N-001.md)
- [DISC-002](../discovery/DISC-002.md)
- [MEMORY.md](../../MEMORY.md)
