---
id: DISC-005
title: AI crawler access is an explicit, recorded policy
severity: MUST
status: active
domain: discovery
priority: P1
source:
  - devia
applies_to:
  - agent
  - repository
success_criteria:
  []
requirement: >
  Whether AI crawlers may fetch this content, and whether it may be used for training, MUST be a recorded decision, implemented where the mechanism is actually honoured — robots user-agent groups, and response headers where they are used. The policy MUST NOT be left to the default the framework ships.
validation:
  automated: true
  manual: true
exceptions: none
---

# DISC-005 — AI crawler access is an explicit, recorded policy

**Requirement:** Whether AI crawlers may fetch this content, and whether it may be used for training, MUST be a recorded decision, implemented where the mechanism is actually honoured — robots user-agent groups, and response headers where they are used. The policy MUST NOT be left to the default the framework ships.

**Bad:** Nobody decided; the site is crawled for training by everything that asked, and the question is discovered after publication.

**Good:** `discovery.ai_crawlers` records the policy and its reason, and the robots file names the user-agent groups that implement it.

## Validation

- `discovery.ai_crawlers` is decided
- The robots policy in the repository implements the recorded decision

## Lifecycle

- Status: `active`
- Priority: `P1`
- Exceptions: `none`

## See also

- [DEC-001](../decision/DEC-001.md)
- [DISC-006](../discovery/DISC-006.md)
- [PRIV-001](../privacy/PRIV-001.md)
- [MEMORY.md](../../MEMORY.md)
