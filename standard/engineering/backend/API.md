# API standard

## Request pipeline (conceptual)

```text
Request → AuthN → AuthZ → Validation → Idempotency → Business rules
        → Transaction → Persistence → Audit log → Response
```

## P0

1. Explicit contract per endpoint (accept / return / error / auth)
2. Validate inputs before business logic
3. Re-check permissions and ownership on mutating operations
4. Correct HTTP status codes; stable error codes for clients
5. No stack traces or SQL text in production responses

## P1

1. Version public APIs (`/v1`, …) + changelog
2. Pagination / filtering conventions documented
3. Timeouts on outbound calls; bounded retries
4. OpenAPI (or equivalent) kept current for public/partner APIs
5. Request IDs / correlation IDs

## Webhooks

- Verify signatures
- Handle duplicate deliveries idempotently
