# 06 — Integrations

> External services this project depends on. Secret **names** only — never values (`SEC-002`).

| Service | Used for | Environment variable | Failure behaviour |
|---|---|---|---|
| TODO(devia) | | | |

## Webhooks in

| Provider | Verification | Idempotency key | Handler |
|---|---|---|---|
| TODO(devia) | | | |

Signature verified against the raw body, stale timestamps rejected, replays are no-ops
(`SEC-007`).

## When one is down

TODO(devia): degrade, queue, or fail closed — per integration. "It breaks" is an acceptable
answer only if it is a deliberate one.
