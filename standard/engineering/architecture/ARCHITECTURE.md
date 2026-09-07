# Architecture

## P0

1. Document what you are building, for whom, and which data is sensitive **before** large features ship.
2. Keep UI, API/application services, and persistence boundaries clear — business rules do not live only in React components.
3. Identify critical components and single points of failure; plan recovery for them.
4. Dependency direction is inward toward domain rules (UI/infrastructure depend on domain — not the reverse).

## P1

1. Record non-trivial decisions as ADRs ([`templates/ADR.md`](../../../templates/docs/ADR.md)).
2. Maintain a simple architecture diagram and data-flow sketch in the app repo.
3. Define scalability and availability assumptions explicitly (even if “single region, vertical scale for now”).

## Detect

- Business rules duplicated across frontend and backend with divergent behavior
- Direct DB access from UI code
- No threat model for auth, payments, or PII

## Verify

- A new engineer can explain the system from `ARCHITECTURE.md` alone
- Sensitive data flows are listed end-to-end
