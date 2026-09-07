# Performance

Define targets — even rough ones — or you cannot manage them.

Example targets (adjust per product):

```text
API p95 < 500ms
API p99 < 1s
Critical DB queries < 100ms
Error rate < 1%
```

## P0/P1 practices

- Move heavy work to queues
- Cache expensive reads deliberately
- Profile before premature sharding
- Load-test critical paths before marketing spikes
