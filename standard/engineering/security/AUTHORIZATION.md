# Authorization

**Authentication ≠ authorization.** Login answers *who*. Every route must still answer *what they can do*.

## P0

1. Enforce permissions on the server (API/DB). Hiding a button is not access control.
2. Object-level authorization on every resource (prevent IDOR/BOLA).
3. For multi-tenant apps, scope every query by tenant from the **verified** server session — never trust client-sent `tenantId` alone.
4. Add automated tests that User A cannot read/write User B (and Tenant A ↛ Tenant B).

## P1

1. Model RBAC as permissions first; roles are bundles of permissions
2. Admin/support break-glass access is audited and explicit
3. Deny by default on new endpoints

## Detect

- `GET /items/:id` with no ownership check
- Authorization only in React route guards
- Shared “service role” keys in the browser

## Verify

- Cross-user and cross-tenant denial tests in CI
- Mutating endpoints return 401/403 correctly
