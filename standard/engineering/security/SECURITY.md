# Security overview

Security is not a final polish step. Defaults from scaffolds and AI codegen are often demo-oriented and **open**.

## Baseline domains (ASVS-oriented)

- Authentication
- Authorization / access control
- Session management
- Input validation & output encoding
- Cryptography
- Error handling & logging
- Data protection
- API security
- File handling
- Business logic security
- Configuration security

## P0 ship blockers

1. No secrets in git or client bundles; rotate anything that ever leaked
2. Server-side authorization on every sensitive read/write (UI checks are not security)
3. Validate/sanitize all external input before business logic
4. Hide stack traces and internal errors from clients in production
5. Rate-limit auth and other public abuse surfaces
6. HTTPS in production with secure cookie attributes where cookies are used

See also: `AUTHENTICATION.md`, `AUTHORIZATION.md`, `SECRETS.md`, `API_SECURITY.md`, and [`checklists/security.md`](../../../checklists/engineering/security.md).
