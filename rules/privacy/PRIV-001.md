---
id: PRIV-001
title: Collect the minimum personal data
severity: MUST
status: active
domain: privacy
priority: P1
source:
  - GDPR principles
applies_to:
  - repository
success_criteria:
  []
requirement: >
  Personal data MUST be collected only where a stated product need requires it, and every field MUST have a reason recorded in the data model.
validation:
  automated: false
  manual: true
exceptions: documented-only
---

# PRIV-001 — Collect the minimum personal data

**Requirement:** Personal data MUST be collected only where a stated product need requires it, and every field MUST have a reason recorded in the data model.

**Bad:** A national identifier collected 'in case we need it later'.

**Good:** Only the fields the flow needs, each with a documented purpose.

## Validation

- Every personal field in the diff has a stated purpose

## Lifecycle

- Status: `active`
- Priority: `P1`
- Exceptions: `documented-only`
