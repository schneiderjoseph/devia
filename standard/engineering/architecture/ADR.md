# Architecture Decision Records

Use ADRs for decisions that are expensive to reverse: auth provider, multi-tenancy model, event bus, payment provider, primary database, public API shape.

Template: [`templates/ADR.md`](../../../templates/docs/ADR.md)

Rules:

- One decision per ADR
- Include context, options, decision, consequences
- Never silently reverse an ADR in code — supersede it with a new ADR
