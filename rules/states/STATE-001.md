---
id: STATE-001
title: Interaction state set
severity: MUST
status: active
priority: P1
domain: states
source:
  - devia
applies_to:
  - components
success_criteria:
  []
requirement: >
  Interactive components MUST define default, hover (if pointer), focus-visible, active, and disabled as applicable.
validation:
  automated: false
  manual: true
exceptions: documented-only
---

# STATE-001 — Interaction state set

**Requirement:** Interactive components MUST define default, hover (if pointer), focus-visible, active, and disabled as applicable.

**Bad:** Only default styles shipped.

**Good:** Full interaction matrix in component spec.

## Validation

- Design or engineering review

## Lifecycle

- Status: `active`
- Priority: `P1`
- Exceptions: `documented-only`
