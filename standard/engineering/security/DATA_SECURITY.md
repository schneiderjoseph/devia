# Data security

## P0

1. Classify data (public, internal, PII, secrets, payment)
2. Encrypt in transit (TLS)
3. Minimize PII in logs
4. Access to production data is least-privilege and audited

## P1

1. Encrypt sensitive fields at rest when threat model requires
2. Retention and deletion processes exist (see `docs/compliance/`)
3. Exports and backups are protected equivalently to production data
