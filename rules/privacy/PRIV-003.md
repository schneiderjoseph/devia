---
id: PRIV-003
title: Users can obtain and erase their data
severity: MUST
status: active
domain: privacy
priority: P1
source:
  - GDPR principles
applies_to:
  - api
  - service
success_criteria:
  []
requirement: >
  Where the product holds personal data, an export path and an erasure path MUST exist, MUST be authenticated, and MUST state what erasure cannot remove and why.
validation:
  automated: false
  manual: true
exceptions: documented-only
---

# PRIV-003 — Users can obtain and erase their data

**Requirement:** Where the product holds personal data, an export path and an erasure path MUST exist, MUST be authenticated, and MUST state what erasure cannot remove and why.

**Bad:** Support deletes rows by hand on request, differently each time.

**Good:** A tested export and an erasure flow that names its exceptions (legal retention, audit trail).

## Validation

- Both flows exist and are tested
- Exceptions documented

## Lifecycle

- Status: `active`
- Priority: `P1`
- Exceptions: `documented-only`
