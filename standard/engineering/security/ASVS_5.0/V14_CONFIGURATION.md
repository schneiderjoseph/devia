# ASVS — V14 CONFIGURATION

**OWASP ASVS theme:** Configuration

> This file maps ASVS intent into **this standard**. It is not a verbatim copy of OWASP ASVS.
> Always prefer the official [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/) text for audits.

## Focus in this standard

Hardened defaults; secrets management; env separation

## Our primary docs

- `docs/security/SECRETS.md`

## Traceability

```text
ASVS theme (V14_CONFIGURATION)
    → Our rules (linked docs)
    → Checklist items (checklists/security.md + domain checklists)
    → Automated checks (scripts/production-check.mjs + app tests)
    → CI gates (templates/github/workflows/app-ci.yml)
```

See [`../ASVS_REGISTRY.md`](../ASVS_REGISTRY.md) for concrete rows.

## Agent rules

- Do not claim ASVS compliance without evidence against the official requirements.
- When implementing features in this theme, update checklist evidence and tests, not just docs.
