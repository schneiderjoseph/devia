# Checklist — Security

## AuthN / AuthZ
- [ ] Authentication implemented correctly
- [ ] Authorization verified server-side
- [ ] Object-level authorization (no IDOR)
- [ ] Passwords hashed with approved algorithm
- [ ] Session/token expiration & revocation work
- [ ] Brute-force protections on auth endpoints

## Input / output
- [ ] Input validation on every external input
- [ ] SQL injection protection (parameterized queries)
- [ ] XSS protection
- [ ] CSRF protection where applicable
- [ ] Upload limits / type checks if uploads exist

## Secrets / config
- [ ] No secrets in source code
- [ ] `.env` ignored; `.env.example` present
- [ ] Credentials separated by environment
- [ ] Secret scanning enabled when possible

## Transport / browser
- [ ] HTTPS enforced in production
- [ ] Secure HTTP headers (baseline)
- [ ] CORS correctly configured
- [ ] Cookies Secure/HttpOnly/SameSite as applicable
- [ ] Rate limiting on public abuse surfaces

## Ops
- [ ] Audit logging for security-relevant events
- [ ] Dependencies audited
