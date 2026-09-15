---
id: DISC-004
title: Non-public surfaces are never indexable
severity: MUST NOT
status: active
domain: discovery
priority: P0
source:
  - devia
applies_to:
  - agent
  - repository
success_criteria:
  []
requirement: >
  Staging, preview, admin and authenticated surfaces MUST NOT be indexable. They MUST be protected by authentication or network policy; a robots directive MUST NOT be relied on as the protection, because it is a request and a public list of what exists.
validation:
  automated: true
  manual: true
exceptions: none
---

# DISC-004 — Non-public surfaces are never indexable

**Requirement:** Staging, preview, admin and authenticated surfaces MUST NOT be indexable. They MUST be protected by authentication or network policy; a robots directive MUST NOT be relied on as the protection, because it is a request and a public list of what exists.

**Bad:** A staging host disallowed in the robots file, publicly reachable, and indexed by a crawler that ignored it.

**Good:** Staging behind authentication, a noindex response header, and a test asserting that the production host is the only indexable one.

## Validation

- Non-production hosts require authentication
- A noindex response header covers non-public surfaces

## Lifecycle

- Status: `active`
- Priority: `P0`
- Exceptions: `none`

## See also

- [SEC-001](../security/SEC-001.md)
- [DISC-001](../discovery/DISC-001.md)
- [MEMORY.md](../../MEMORY.md)
