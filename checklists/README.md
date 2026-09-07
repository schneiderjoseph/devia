# Checklists

Walk the checklist for the surface you touched before you claim the work is done. A checklist is
the human-readable form of the gates in [`../MATURITY.md`](../MATURITY.md); the machine-readable
form is `devia check`.

## Engineering

| Checklist | Use when |
|---|---|
| [`engineering/architecture.md`](engineering/architecture.md) | Adding a boundary, a service, a dependency |
| [`engineering/security.md`](engineering/security.md) | Any auth, data-access or input-handling change |
| [`engineering/database.md`](engineering/database.md) | Schema, migration, index, retention |
| [`engineering/api.md`](engineering/api.md) | New or changed endpoint |
| [`engineering/frontend.md`](engineering/frontend.md) | Client-side engineering |
| [`engineering/accessibility.md`](engineering/accessibility.md) | Any user-facing surface |
| [`engineering/testing.md`](engineering/testing.md) | Before calling coverage sufficient |
| [`engineering/devops.md`](engineering/devops.md) | Pipeline, environment, deploy |
| [`engineering/performance.md`](engineering/performance.md) | Latency, payload, query cost |
| [`engineering/incident.md`](engineering/incident.md) | During and after an incident |
| [`engineering/disaster-recovery.md`](engineering/disaster-recovery.md) | Backup and restore work |
| [`engineering/release.md`](engineering/release.md) | Definition of done for a feature |
| [`engineering/production.md`](engineering/production.md) | Before claiming production ready |

## Design

| Checklist | Use when |
|---|---|
| [`design/ux-review.md`](design/ux-review.md) | Flow, journey or IA change |
| [`design/ui-review.md`](design/ui-review.md) | Visual change |
| [`design/accessibility-review.md`](design/accessibility-review.md) | Any interface change |
| [`design/responsive-review.md`](design/responsive-review.md) | Layout across sizes and inputs |
| [`design/design-to-code-review.md`](design/design-to-code-review.md) | Implementing a design |

## Rules for using them

- A checklist item you did not check is **not verified**, and says so in the report.
- An item that does not apply is marked not applicable with a reason — never silently dropped.
- An item that keeps not applying is a bug in the checklist: fix the checklist.
