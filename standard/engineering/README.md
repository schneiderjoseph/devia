# Engineering standard

Deep policy by domain. Pair every change with the matching rules and the checklist under
[`../../checklists/engineering/`](../../checklists/README.md).

Spine: [`../../PRINCIPLES.md`](../../PRINCIPLES.md) · [`../../LEVELS.md`](../../LEVELS.md) ·
[`../../MATURITY.md`](../../MATURITY.md) · `devia check`

| Domain | Pages | Rules |
|---|---|---|
| Architecture | [`architecture/`](architecture/ARCHITECTURE.md), [`ADR.md`](architecture/ADR.md), [`THREAT_MODEL.md`](architecture/THREAT_MODEL.md) | `ARC-*` |
| Security | [`security/`](security/SECURITY.md), [`AUTHENTICATION.md`](security/AUTHENTICATION.md), [`AUTHORIZATION.md`](security/AUTHORIZATION.md), [`SECRETS.md`](security/SECRETS.md), [`API_SECURITY.md`](security/API_SECURITY.md), [`DATA_SECURITY.md`](security/DATA_SECURITY.md) | `SEC-*` |
| ASVS mapping | [`security/OWASP_ASVS.md`](security/OWASP_ASVS.md), [`security/ASVS_REGISTRY.md`](security/ASVS_REGISTRY.md), [`security/ASVS_5.0/`](security/ASVS_5.0/V1_ARCHITECTURE.md) | `SEC-*` |
| Database | [`database/DATABASE.md`](database/DATABASE.md), [`MIGRATIONS.md`](database/MIGRATIONS.md), [`BACKUPS.md`](database/BACKUPS.md) | `DB-*` |
| API / backend | [`backend/API.md`](backend/API.md), [`ERROR_HANDLING.md`](backend/ERROR_HANDLING.md), [`LOGGING.md`](backend/LOGGING.md), [`BACKGROUND_JOBS.md`](backend/BACKGROUND_JOBS.md) | `API-*` |
| Testing | [`testing/TESTING.md`](testing/TESTING.md) | `TST-*` |
| DevOps | [`devops/CI_CD.md`](devops/CI_CD.md), [`BRANCH_PROTECTION.md`](devops/BRANCH_PROTECTION.md), [`DEPLOYMENT.md`](devops/DEPLOYMENT.md), [`ENVIRONMENTS.md`](devops/ENVIRONMENTS.md), [`DOCKER.md`](devops/DOCKER.md), [`RELEASE.md`](devops/RELEASE.md), [`ROLLBACK.md`](devops/ROLLBACK.md) | `OPS-*` |
| Observability | [`observability/MONITORING.md`](observability/MONITORING.md), [`ALERTING.md`](observability/ALERTING.md), [`INCIDENTS.md`](observability/INCIDENTS.md) | `OBS-*` |
| Performance | [`performance/PERFORMANCE.md`](performance/PERFORMANCE.md) | — |
| Privacy | [`compliance/PRIVACY.md`](compliance/PRIVACY.md), [`DATA_RETENTION.md`](compliance/DATA_RETENTION.md) | `PRIV-*` |
| Payments | [`payments/PAYMENTS.md`](payments/PAYMENTS.md) | `SEC-007`, `API-004` |
| AI features | [`ai/AI_SECURITY.md`](ai/AI_SECURITY.md), [`PROMPT_SECURITY.md`](ai/PROMPT_SECURITY.md) | `AI-*` |
| Frontend | [`frontend/FRONTEND.md`](frontend/FRONTEND.md), [`ACCESSIBILITY.md`](frontend/ACCESSIBILITY.md), [`UX.md`](frontend/UX.md), [`DESIGN_SYSTEM.md`](frontend/DESIGN_SYSTEM.md) | design rules — see [`../design/README.md`](../design/README.md) |

Sources: [`REFERENCES.md`](REFERENCES.md).

Frontend pages here cover the engineering side of the interface — bundles, state, XSS, storage.
The interface itself is governed by [`../design/README.md`](../design/README.md); a UI that ships
without its design rules is not done, however clean the code is.
