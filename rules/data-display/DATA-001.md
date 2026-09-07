---
id: DATA-001
title: Currency context explicit
severity: MUST
status: active
priority: P1
domain: data-display
source:
  - i18n-best-practice
applies_to:
  - currency
  - tables
success_criteria:
  []
requirement: >
  Currency values MUST retain explicit currency context (code or symbol+locale-aware formatting).
validation:
  automated: false
  manual: true
exceptions: documented-only
---

# DATA-001 — Currency context explicit

**Requirement:** Currency values MUST retain explicit currency context (code or symbol+locale-aware formatting).

**Bad:** 1,250.00

**Good:** HTG 1,250.00 / USD 1,250.00 (locale-aware).

## Validation

- Design or engineering review

## Lifecycle

- Status: `active`
- Priority: `P1`
- Exceptions: `documented-only`
