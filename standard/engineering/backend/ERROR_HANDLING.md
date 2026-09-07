# Error handling

## Client-safe error shape (example)

```json
{
  "error": {
    "code": "ORDER_NOT_FOUND",
    "message": "Order not found",
    "requestId": "req_123"
  }
}
```

## Never expose in production

- Stack traces
- SQL queries
- Internal paths
- Secrets / env values
- Raw third-party error dumps

## P0

1. Centralize mapping: detailed logs internally, safe messages externally
2. Bound retries; prefer idempotent handlers
