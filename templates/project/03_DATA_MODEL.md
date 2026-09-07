# 03 — Data model

> What is stored, and where its definition lives. The schema itself stays in the migrations
> (`MEM-008`).

## Entities

| Entity | Meaning | Defined in | Notes |
|---|---|---|---|
| TODO(devia) | | | |

## Invariants

TODO(devia): what must always hold — money exact and carrying its currency (`DB-003`), archive
instead of delete where history matters (`DB-005`), append-only audit trail (`DB-007`).

## Lifecycles

TODO(devia): the state machines that matter (order, payment, subscription): states, allowed
transitions, and where the transition code lives. A transition not listed here does not exist.

## Migrations

| Convention | Value |
|---|---|
| Location | TODO(devia) |
| Naming | TODO(devia) |
| How they run | TODO(devia) |
| Rollback strategy | TODO(devia) |

Applied migrations are immutable; corrections ship forward (`DB-002`).
