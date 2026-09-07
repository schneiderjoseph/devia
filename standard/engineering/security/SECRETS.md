# Secrets

## P0

1. No secrets in source control, screenshots, logs, or client bundles
2. `.env` is gitignored; provide `.env.example` with empty placeholders
3. Separate credentials per environment (local / staging / prod)
4. If a secret was ever committed: **rotate it** — deleting the line is not enough

## P1

1. Use a secret manager in real deployments
2. Short-lived credentials where the platform allows
3. Secret scanning in CI (and push protection when available)

## Forbidden examples

```text
password = "admin123"
API_KEY = "sk-..."
DATABASE_PASSWORD = "..."
```

## Required pattern

```text
env / secret manager → server runtime only → never NEXT_PUBLIC_* for private keys
```
