---
id: PRIV-005
title: A tool contribution carries evidence, never the repository
severity: MUST NOT
status: active
domain: privacy
priority: P0
source:
  - devia
applies_to:
  - agent
  - repository
success_criteria:
  []
requirement: >
  A report prepared against a tool from inside a user's repository MUST NOT carry that repository's source, secrets, environment files, dependency list or private filenames. It carries a sanitized minimal reproduction, the tool's own metadata, and the expected and actual behaviour. Every remote operation MUST be authorised explicitly by the user, under a contributor identity the project declared.
validation:
  automated: true
  manual: true
exceptions: none
---

# PRIV-005 — A tool contribution carries evidence, never the repository

**Requirement:** A report prepared against a tool from inside a user's repository MUST NOT carry
that repository's source, secrets, environment files, dependency list or private filenames. It
carries a sanitized minimal reproduction, the tool's own metadata, and the expected and actual
behaviour. Every remote operation MUST be authorised explicitly by the user, under a contributor
identity the project declared.

**Bad:** A crash report that attaches the failing file, so a customer's schema and an API key
land in a public issue.

**Good:** A standalone fixture that reproduces the crash, with the tool's version, the invocation
and both behaviours — and a manifest of every byte, shown before anything is sent.

## Validation

- `devia contribute` sanitizes every file entering a payload and refuses an environment file
  outright
- The finished payload is re-scanned, and a surviving secret shape blocks the upload rather than
  warning about it
- Nothing is sent without `--yes`, and never under the maintainer's account

## Lifecycle

- Status: `active`
- Priority: `P0`
- Exceptions: `none`
