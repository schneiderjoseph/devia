# Reference standards

This standard is intentionally built on recognized sources. Prefer the primary documents when details matter.

## Security

- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/) — verifiable application security requirements
- [OWASP Top 10](https://owasp.org/www-project-top-ten/) — common risk classes
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)

## Architecture & delivery

- [12-Factor App](https://12factor.net/)
- AWS Well-Architected (cloud design trade-offs)
- SOLID principles (when they reduce complexity, not as dogma)

## Web & accessibility

- [WCAG](https://www.w3.org/WAI/standards-guidelines/wcag/)
- [WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/)
- HTTP semantics / status codes
- [OpenAPI Specification](https://www.openapis.org/)
- UX/UI operational rules: [`../design/REFERENCES.md`](../design/REFERENCES.md) (WCAG, NN/g, GOV.UK, Carbon and the rest)

## Supply chain & DevOps

- OpenSSF / secure software practices
- SBOM generation for releases when appropriate
- Container minimal base images + non-root + image scanning

## Data

- PostgreSQL operational best practices
- Encryption in transit / at rest as required by threat model
- Backup **and restore testing**

## Quality

- Semantic Versioning
- Conventional Commits (optional but useful)
- Automated testing pyramid + critical-path E2E
