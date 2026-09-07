---
id: PRIV-004
title: Personal data stays out of logs, analytics and prompts
severity: MUST
status: active
domain: privacy
priority: P1
source:
  - GDPR principles
applies_to:
  - service
  - web
  - ai
success_criteria:
  []
requirement: >
  Personal data MUST NOT be sent to logs, analytics, third-party tools or model providers unless that transfer is a recorded decision with a lawful basis and a data agreement.
validation:
  automated: true
  manual: true
exceptions: documented-only
---

# PRIV-004 — Personal data stays out of logs, analytics and prompts

**Requirement:** Personal data MUST NOT be sent to logs, analytics, third-party tools or model providers unless that transfer is a recorded decision with a lawful basis and a data agreement.

**Bad:** Full customer records pasted into a model prompt for summarisation.

**Good:** Identifiers are pseudonymised; the transfer, if needed, is recorded and minimised.

## Validation

- Grep the diff for personal fields crossing a boundary
- The transfer is recorded

## Lifecycle

- Status: `active`
- Priority: `P1`
- Exceptions: `documented-only`
