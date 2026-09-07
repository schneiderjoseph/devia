# Testing

## Pyramid

```text
        E2E (critical journeys)
       /                    \
  Integration (API/DB/auth)
     /                        \
Unit (domain rules, validators)
```

## P0

1. Features that touch authz/payments/data isolation ship with tests in the same change
2. CI runs tests on every PR; red builds do not merge
3. Every production bug gets a regression test

## P1

1. Critical business journeys covered by E2E/smoke
2. LLM features have frozen eval fixtures when output is contractual
3. Load testing before expected traffic spikes

## Rule

Test business-critical paths — not only trivial pure functions.
