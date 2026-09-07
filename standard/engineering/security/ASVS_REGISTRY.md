# ASVS registry — requirement → rule → check → CI

Traceability spine for security controls. Expand rows as apps adopt the standard.

Legend: **Auto** = scriptable today in `production-check` / typical Node CI · **Test** = app must provide automated test · **Manual** = human sign-off until automated.

| ASVS theme | Our rule (P0/P1) | Checklist | Automated check | CI gate |
|---|---|---|---|---|
| V2 Authentication | P0 server verifies identity on protected routes | `checklists/security.md` | Test: unauthenticated → 401 | unit/integration job |
| V3 Session | P0 secure cookie / token handling; no session fixation | `checklists/security.md` | Test + config review | security job |
| V4 Access control | P0 authz on every sensitive read/write; tenant scope from server session | `checklists/security.md` | Test: user A cannot read B | unit/integration **required** |
| V5 Validation | P0 validate external input before business logic | `checklists/api.md` | schema tests / fuzz critical parsers | unit + lint |
| V6 Cryptography | P0 no plaintext secrets at rest where threat model requires crypto; no home-rolled | `checklists/security.md` | Manual + dep review | secret scan + review |
| V7 Error handling | P0 no stack/SQL internals to clients in prod | `checklists/api.md` | Test prod error shape | unit/integration |
| V8 Data protection | P1 classify sensitive fields; minimize retention | `checklists/production.md` | Manual / compliance review | release checklist |
| V9 Communication | P0 HTTPS in production | `checklists/devops.md` | deploy config / smoke | deploy gates |
| V10 Malicious code | P1 lockfile + dependency audit | `checklists/devops.md` | `npm audit` / OSV | **dependency-audit** required |
| V11 Business logic | P1 abuse cases for money/state transitions | domain tests | Test | integration/E2E |
| V12 Files | P0 constrain uploads if feature exists | `checklists/security.md` | Test size/type | integration |
| V13 API | P0 rate limit auth & public abuse surfaces | `checklists/api.md` | Test or config evidence | security job |
| V14 Configuration | P0 no secrets in git; env separation | `checklists/security.md` | secret scan + `.env` gitignore | **secret-scan** required |
| V1 Architecture | P1 threat model for sensitive apps; ADRs for irreversible choices | `checklists/architecture.md` | Manual / ADR presence | review |

## How to extend

When you add a P0 security rule:

1. Link the ASVS theme chapter under `ASVS_5.0/`
2. Add a checklist checkbox
3. Add a `production-check` evidence probe **or** name the required test id
4. Mark the CI job that fails the PR if missing
