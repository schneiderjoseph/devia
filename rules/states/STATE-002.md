---
id: STATE-002
title: Async outcome states
severity: MUST
status: active
priority: P1
domain: states
source:
  - NN/g
applies_to:
  - async
  - forms
success_criteria:
  []
requirement: >
  Async operations MUST expose pending, success, and failure (with retry when safe).
validation:
  automated: false
  manual: true
exceptions: documented-only
---

# STATE-002 — Async outcome states

**Requirement:** Async operations MUST expose pending, success, and failure (with retry when safe).

**Bad:** Spinner forever on failure.

**Good:** Error + Retry.

## Validation

- Design or engineering review

## Lifecycle

- Status: `active`
- Priority: `P1`
- Exceptions: `documented-only`
