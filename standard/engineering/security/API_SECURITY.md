# API security

## P0

1. Authenticate and authorize every sensitive endpoint
2. Validate request schemas before business logic
3. Rate-limit public and auth endpoints
4. Verify webhook signatures before trusting events
5. Never put provider secrets in browser calls

## P1

1. Security headers (CSP start report-only, then enforce; plus baseline headers)
2. CORS allowlists — not `*` with credentials
3. Idempotency keys on payment and other critical POSTs
4. Consistent error shape without internal details

## Detect

- Open CORS on credentialed APIs
- Webhook handlers that accept raw JSON with no signature
- GraphQL/Data APIs that expose fields based only on “knowing the UUID”
