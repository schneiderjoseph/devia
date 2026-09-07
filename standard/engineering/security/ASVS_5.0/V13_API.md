# ASVS — V13 API

**OWASP ASVS theme:** API and Web Service

> This file maps ASVS intent into **this standard**. It is not a verbatim copy of OWASP ASVS.
> Always prefer the official [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/) text for audits.

## Focus in this standard

Authn on APIs; mass assignment; rate limits

## Our primary docs

- `docs/backend/API.md`

## Traceability

```text
ASVS theme (V13_API)
    → Our rules (linked docs)
    → Checklist items (checklists/security.md + domain checklists)
    → Automated checks (scripts/production-check.mjs + app tests)
    → CI gates (templates/github/workflows/app-ci.yml)
```

See [`../ASVS_REGISTRY.md`](../ASVS_REGISTRY.md) for concrete rows.

## Agent rules

- Do not claim ASVS compliance without evidence against the official requirements.
- When implementing features in this theme, update checklist evidence and tests, not just docs.
