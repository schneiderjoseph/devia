---
id: STATE-004
title: Unsaved changes
severity: SHOULD
status: active
priority: P2
domain: states
source:
  - NN/g
applies_to:
  - forms
success_criteria:
  []
requirement: >
  Views with unsaved edits SHOULD warn before destructive navigation.
validation:
  automated: false
  manual: true
exceptions: documented-only
---

# STATE-004 — Unsaved changes

**Requirement:** Views with unsaved edits SHOULD warn before destructive navigation.

**Bad:** Back discards form silently.

**Good:** Leave without saving? confirm.

## Validation

- Design or engineering review

## Lifecycle

- Status: `active`
- Priority: `P2`
- Exceptions: `documented-only`
