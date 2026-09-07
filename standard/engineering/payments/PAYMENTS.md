# Payments

## P0

1. Verify webhook signatures before granting entitlements
2. Idempotent processing — duplicates must not double-charge or double-grant
3. Never unlock paid features from client-only success callbacks
4. Money math uses decimal-safe types — never float

## P1

1. Clear states: pending / succeeded / failed / refunded / canceled
2. Failed payment retry + user messaging + grace period strategy
3. Refund/dispute runbook before first real chargeback
4. Reconciliation/audit trail
