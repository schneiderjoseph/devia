# AI feature security

## P0

1. Never ship raw model output to users without validation/encoding
2. Treat model output as untrusted (XSS, data exfiltration, tool abuse)
3. Protect against prompt injection when tools/browsing/files are connected
4. Provider keys stay on the server; rate-limit user-triggered generations

## P1

1. Human approval for high-impact automated actions
2. Audit logs for tool calls that mutate data
3. Cost/token controls and model routing for expensive tasks
4. Evaluation sets for contractual behaviors
