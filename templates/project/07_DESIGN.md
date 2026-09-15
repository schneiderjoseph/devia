# 07 — Design

> The interface decisions specific to this project. The general rules live in the standard
> (`standard/standard/design/`); this file records what is local.

## Visual direction

TODO(devia): what this product looks like and why — the decision the styling implements. Until
`design.direction` in [`decisions.yaml`](decisions.yaml) is decided or delegated, there is no
direction to implement, and nothing may establish one by accident (`DEC-004`).

Undefined direction is not an invitation to reach for whatever a generated interface usually
looks like. It is a gap, with an owner.

| Decision | Value | Ruled in |
|---|---|---|
| Visual direction | TODO(devia) | `decisions.yaml` → `design.direction` |
| Design system | TODO(devia): existing, custom, or none | `decisions.yaml` → `design.system` |
| Imagery | TODO(devia): photography, illustration, or neither | `decisions.yaml` → `content.imagery` |

Assets are delivered by their owner, not improvised by whoever needs one (`DEC-005`). A missing
logo shows as a missing logo.

## Tokens

| Token set | Source of truth | Consumed by |
|---|---|---|
| TODO(devia) | | |

Git is the source of truth for tokens (`DS-001`); components consume semantic tokens, not raw
values (`DS-002`, `UI-003`).

## Components

| Component | Where | States implemented |
|---|---|---|
| TODO(devia) | | |

Complete means default, hover, focus, active, disabled, loading, empty, error, success — plus
permission-denied and offline where they can occur (`STATE-001`, `STATE-002`, `STATE-003`).

## Patterns fixed for this product

TODO(devia): the choices that must stay consistent — table density, date and currency format,
empty-state voice, how destructive actions are confirmed (`UX-011`).

## Interface decisions

| Decision | Why | Recorded in |
|---|---|---|
| TODO(devia) | | |
