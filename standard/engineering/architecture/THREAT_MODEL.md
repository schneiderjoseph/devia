# Threat model (lightweight)

For every app, answer:

1. What assets matter (credentials, PII, payments, admin actions)?
2. Who are the actors (anon, user, admin, attacker, insider)?
3. What are the trust boundaries (browser, API, DB, third parties)?
4. What happens on abuse (credential stuffing, IDOR, webhook forgery, prompt injection)?

Minimum outputs:

- List of assets + impact if lost
- Top abuse cases mapped to controls in `docs/security/`
- Residual risks accepted by the owner
