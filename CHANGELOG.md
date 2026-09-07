# Changelog

## 0.1.0 — 2026-09-03

First release. Devia consolidates three bodies of work into one maintained standard plus a
living project memory.

### Standard

- Work contract for agents: [`AGENTS.md`](AGENTS.md) — rule zero, hard stops, output contract
- [`PRINCIPLES.md`](PRINCIPLES.md), [`LEVELS.md`](LEVELS.md) (memory → policy → check →
  enforcement), [`MATURITY.md`](MATURITY.md) (P0–P3, Bronze → Platinum),
  [`GOVERNANCE.md`](GOVERNANCE.md)
- [`MEMORY.md`](MEMORY.md) — the living-memory doctrine: the two registries, sweep discipline,
  the impact map, no perishable facts, freshness

### Rules

- Unified registry of **138 rules** with stable IDs, severity, priority, source and validation
  method: [`rules/README.md`](rules/README.md)
- 58 design rules carried over unchanged from `design-system-standard`: `A11Y-*`, `CMP-*`,
  `CNT-*`, `DATA-*`, `DS-*`, `I18N-*`, `INT-*`, `MOT-*`, `RWD-*`, `STATE-*`, `UI-*`, `UX-*`
- 80 new engineering, agent and memory rules: `ARC-*`, `SEC-*`, `DB-*`, `API-*`, `TST-*`,
  `OPS-*`, `OBS-*`, `PRIV-*`, `AI-*`, `AGT-*`, `MEM-*`
- `priority` (P0–P3) added to every rule, including the carried-over design rules
- Generated index, coverage and traceability: `npm run build:index`

### Corpus

- `production-app-standard` absorbed into [`standard/engineering/`](standard/engineering/README.md)
  and `checklists/engineering/`
- `design-system-standard` absorbed into [`standard/design/`](standard/design/README.md) and
  `checklists/design/`
- See [`MIGRATION.md`](MIGRATION.md) for the path mapping

### CLI

- `devia init` — writes `.devia/`, vendors the standard, installs the agent adapters
- `devia validate` — memory integrity: structure, config, impact map, registry ids,
  placeholders, perishable facts
- `devia check` — readiness gates with P0 blocking, replacing `scripts/production-check.mjs`
- `devia doctor` — adoption, version drift, and whether the memory lags the code
- `devia rules` — query the registry by id, domain, priority, severity or text
- `devia sync` — refresh the vendored standard and report what changed
- `devia gap` / `devia debt` — registry lines with monotone ids that are never reused
- `devia skills install` — adapters for Cursor, Claude Code, Copilot, Windsurf and the universal
  `AGENTS.md`
- No runtime dependencies

### Adopting

```bash
npm install -D devia && npx devia init
```

Replace `node scripts/production-check.mjs` in CI with `npx devia check`, and add
`npx devia validate`.
