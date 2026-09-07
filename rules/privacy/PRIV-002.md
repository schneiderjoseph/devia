---
id: PRIV-002
title: Retention and deletion are defined and implemented
severity: MUST
status: active
domain: privacy
priority: P1
source:
  - GDPR principles
applies_to:
  - database
  - service
success_criteria:
  []
requirement: >
  Every category of personal data MUST have a retention period and a mechanism that actually enforces it, including backups and logs.
validation:
  automated: false
  manual: true
exceptions: documented-only
---

# PRIV-002 — Retention and deletion are defined and implemented

**Requirement:** Every category of personal data MUST have a retention period and a mechanism that actually enforces it, including backups and logs.

**Bad:** A retention policy in a document, with data kept forever in practice.

**Good:** A scheduled job that removes or anonymises expired data, with the policy recorded next to it.

## Validation

- Retention documented per category
- The job exists and has run

## Lifecycle

- Status: `active`
- Priority: `P1`
- Exceptions: `documented-only`

## See also

- [DATA_RETENTION.md](../../standard/engineering/compliance/DATA_RETENTION.md)
