# Architecture principles

See root [`PRINCIPLES.md`](../../../PRINCIPLES.md) for the full set (complexity earned, dependency liability).

## Architecture-specific

```text
Simple > Clever
Explicit > Implicit
Modular > Spaghetti
Typed > Untyped (when the stack allows)
```

- Prefer a modular monolith until scale or team boundaries **force** services.
- Prefer Postgres features you already run over a new data store.
- Prefer boring, operable patterns over novel ones.
- Every irreversible choice gets an ADR ([`ADR.md`](ADR.md)).
