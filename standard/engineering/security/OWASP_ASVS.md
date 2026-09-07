# OWASP ASVS

Use [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/) as the detailed security requirements catalog.

## In this repo

| Path | Role |
|---|---|
| [`ASVS_5.0/`](ASVS_5.0/) | Theme chapters (V1–V14) mapped to our docs |
| [`ASVS_REGISTRY.md`](ASVS_REGISTRY.md) | Requirement → rule → checklist → test → CI |

## How to use

1. Choose a target verification level appropriate to risk (many SaaS start with a pragmatic Level 1–2 subset).
2. Track coverage via the registry + `checklists/security.md`.
3. Prefer official ASVS wording in formal audits; use this repo for engineering application.
4. Never claim “ASVS certified” without performing verification against the official standard.

## Traceability model

```text
ASVS Requirement
       ↓
Our Rule (docs/security/*)
       ↓
Checklist (checklists/security.md)
       ↓
Automated Test / production-check probe
       ↓
CI Gate (required check)
```
