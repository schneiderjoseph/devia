# Maturity model

## Priority tags

| Tag | Meaning | Enforcement |
|---|---|---|
| **P0** | BLOCKER | Must pass for real users / money / data; CI blocks merge or release |
| **P1** | REQUIRED | Same milestone unless the human records an explicit risk acceptance |
| **P2** | RECOMMENDED | Scheduled deliberately, not "later" |
| **P3** | OPTIONAL | Nice to have; never pretend it is done |

Rule severities (`MUST`, `MUST NOT`, `SHOULD`, `MAY`) describe the obligation. Priority tags
describe when the obligation blocks. A `MUST` for a surface the product does not have yet is
still a `MUST` — it is simply not applicable.

## Tiers

### Bronze — functional

Works for a trusted demo or an internal pilot.

- Core happy paths work
- Basic auth if multi-user
- Deployable somehow
- No secrets in the client bundle
- `.devia/` exists and `00_OVERVIEW.md` is true

Not production for paying customers.

### Silver — seriously tested and secured

- Automated unit tests plus critical integration tests
- Server-side authorization on every sensitive route
- Input validation at every external boundary
- CI on every PR: lint, typecheck, test
- Dependency audit and secret scan in CI
- Errors handled without leaking internals
- Memory current: registries used, `devia validate` clean

### Gold — production-ready

Everything in [`checklists/engineering/production.md`](checklists/engineering/production.md),
including:

- Cross-user / cross-tenant isolation covered by tests
- Migrations versioned; backup **and restore** drilled
- Monitoring, alerting and error tracking in place
- Staging → production path with a rollback that has actually been used
- Rate limits on abuse surfaces
- Privacy baseline matched to the data the product really holds
- UI surfaces pass the design MUST rules: accessible name, keyboard path, visible focus,
  contrast, persistent labels, complete states

`devia check` reports **no P0 FAIL**.

### Platinum — production-grade

Gold, plus:

- High availability where justified; documented DR with RPO/RTO and rehearsed drills
- Full observability: SLOs and alerts a human can act on
- Security automation: SAST, dependency and image scanning, ASVS tracking
- Performance budgets enforced in CI
- Supply-chain controls: lockfile discipline, SBOM where appropriate
- Compliance controls matched to real obligations, not imagined ones
- Accessibility validated with assistive technology, not only automated checks

## Declaring a tier

Record it in `.devia/devia.json` and keep it honest:

```json
{ "maturity": { "target": "gold", "current": "silver" } }
```

List the blockers in `.devia/12_DEBT.md`.

Agents must never claim Gold or "production ready" while a P0 fails, is unrun, or is unknown.
"I did not check" is reported, not rounded up.
