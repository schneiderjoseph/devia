# Background jobs

## P0

1. Heavy work (email, LLM, webhooks fan-out, reports) runs out of band — not on the request thread when latency matters
2. Jobs are idempotent where retries exist
3. Failed jobs are visible (log + alert on spikes)

## P1

1. Dead-letter / retry limits
2. Job payloads exclude secrets when possible
