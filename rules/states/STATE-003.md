---
id: STATE-003
title: Permission-denied and read-only
severity: MUST
status: active
priority: P1
domain: states
source:
  - NN/g
applies_to:
  - page
  - forms
success_criteria:
  []
requirement: >
  When the user lacks permission, the UI MUST explain denial (not a blank/broken page).
validation:
  automated: false
  manual: true
exceptions: documented-only
---

# STATE-003 — Permission-denied and read-only

**Requirement:** When the user lacks permission, the UI MUST explain denial (not a blank/broken page).

**Bad:** Empty screen for forbidden resource.

**Good:** Permission denied message + next step.

## Validation

- Design or engineering review

## Lifecycle

- Status: `active`
- Priority: `P1`
- Exceptions: `documented-only`
