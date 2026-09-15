---
id: DISC-001
title: Indexing is a decision, not a framework default
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
  A public surface MUST record whether search engines may index it and which host is canonical, and the repository MUST carry the robots policy and sitemap that implement that decision. Whatever the framework emits by default MUST NOT stand in for the decision.
validation:
  automated: true
  manual: true
exceptions: none
---

# DISC-001 — Indexing is a decision, not a framework default

**Requirement:** A public surface MUST record whether search engines may index it and which host is canonical, and the repository MUST carry the robots policy and sitemap that implement that decision. Whatever the framework emits by default MUST NOT stand in for the decision.

**Bad:** Four hostnames serve the same pages, none is canonical, and the sitemap is whatever the framework generated.

**Good:** `discovery.indexing` names the canonical host and the policy; the robots file and the sitemap are in the repository and reviewed like code.

## Validation

- `discovery.indexing` is decided
- A robots policy and a sitemap exist for an indexable surface

## Lifecycle

- Status: `active`
- Priority: `P1`
- Exceptions: `none`

## See also

- [DEC-001](../decision/DEC-001.md)
- [DISC-004](../discovery/DISC-004.md)
- [MEMORY.md](../../MEMORY.md)
