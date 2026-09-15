---
id: DISC-006
title: A convention is never cited as a standard
severity: MUST NOT
status: active
domain: discovery
priority: P2
source:
  - devia
applies_to:
  - agent
  - repository
success_criteria:
  []
requirement: >
  A discovery mechanism MUST NOT be adopted on the strength of its name or its novelty. An unratified convention MUST be recorded as a convention, naming what actually honours it, and MUST NOT be presented as protection or as compliance.
validation:
  automated: false
  manual: true
exceptions: none
---

# DISC-006 — A convention is never cited as a standard

**Requirement:** A discovery mechanism MUST NOT be adopted on the strength of its name or its novelty. An unratified convention MUST be recorded as a convention, naming what actually honours it, and MUST NOT be presented as protection or as compliance.

**Bad:** "AI headers added" in a pull request, for a file nothing reads, sold onward as a guarantee that models will not train on the content.

**Good:** The convention is added and recorded as an unratified convention with limited adoption; the enforceable part of the policy lives in the robots file and the access rules.

## Validation

- Each mechanism is recorded with its status: standard, de-facto, or convention
- No claim of protection rests on a mechanism nothing enforces

## Lifecycle

- Status: `active`
- Priority: `P2`
- Exceptions: `none`

## See also

- [DISC-005](../discovery/DISC-005.md)
- [AGT-004](../agent/AGT-004.md)
- [MEMORY.md](../../MEMORY.md)
