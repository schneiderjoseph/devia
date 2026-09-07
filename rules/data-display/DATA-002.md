---
id: DATA-002
title: Dates unambiguous
severity: MUST
status: active
priority: P1
domain: data-display
source:
  - i18n-best-practice
applies_to:
  - dates
  - tables
success_criteria:
  []
requirement: >
  Dates MUST be unambiguous for the audience locale (avoid 03/04/05 without context).
validation:
  automated: false
  manual: true
exceptions: documented-only
---

# DATA-002 — Dates unambiguous

**Requirement:** Dates MUST be unambiguous for the audience locale (avoid 03/04/05 without context).

**Bad:** 03/04/05 in mixed FR/EN teams.

**Good:** 4 Mar 2026 or ISO date in dense tables with legend.

## Validation

- Design or engineering review

## Lifecycle

- Status: `active`
- Priority: `P1`
- Exceptions: `documented-only`
