# 14 — Index

> Where to find what. This repository *is* the standard, so the memory points at the repository
> files directly instead of a vendored copy.

## Memory

| Question | File |
|---|---|
| What is this project? | [`00_OVERVIEW.md`](00_OVERVIEW.md) |
| How is it structured? | [`01_ARCHITECTURE.md`](01_ARCHITECTURE.md) |
| What commands and outputs exist? | [`02_SURFACES.md`](02_SURFACES.md) |
| What shapes are the contract? | [`03_DATA_MODEL.md`](03_DATA_MODEL.md) |
| What may the CLI touch? | [`04_PERMISSIONS.md`](04_PERMISSIONS.md) |
| What must never break? | [`05_FLOWS.md`](05_FLOWS.md) |
| What do we depend on? | [`06_INTEGRATIONS.md`](06_INTEGRATIONS.md) |
| How does the output look? | [`07_DESIGN.md`](07_DESIGN.md) |
| What is banned here? | [`10_NEVER_ALWAYS.md`](10_NEVER_ALWAYS.md) |
| What is undecided? | [`11_GAPS.md`](11_GAPS.md) |
| What is owed? | [`12_DEBT.md`](12_DEBT.md) |
| How do I do X? | [`13_RECIPES.md`](13_RECIPES.md) |

## Code

| Thing | Path |
|---|---|
| Entry point | [`../bin/devia.mjs`](../bin/devia.mjs) |
| Dispatch and context | [`../src/cli.mjs`](../src/cli.mjs) |
| Commands | [`../src/commands/`](../src/commands/init.mjs) |
| YAML subset parser | [`../src/lib/yaml.mjs`](../src/lib/yaml.mjs) |
| Rule loading and invariants | [`../src/lib/rules.mjs`](../src/lib/rules.mjs) |
| Filesystem helpers | [`../src/lib/fs.mjs`](../src/lib/fs.mjs) |
| Terminal output | [`../src/lib/ui.mjs`](../src/lib/ui.mjs) |
| Index generator | [`../scripts/build-index.mjs`](../scripts/build-index.mjs) |
| Repository validators | [`../scripts/validate-rules.mjs`](../scripts/validate-rules.mjs), [`../scripts/validate-links.mjs`](../scripts/validate-links.mjs) |
| Tests | [`../tests/`](../tests/cli.test.mjs) |
| CI | [`../.github/workflows/ci.yml`](../.github/workflows/ci.yml) |

## The standard

| Need | Where |
|---|---|
| Work contract | [`../AGENTS.md`](../AGENTS.md) |
| Principles | [`../PRINCIPLES.md`](../PRINCIPLES.md) |
| Memory doctrine | [`../MEMORY.md`](../MEMORY.md) |
| Levels and maturity | [`../LEVELS.md`](../LEVELS.md), [`../MATURITY.md`](../MATURITY.md) |
| Rule by ID | [`../rules/README.md`](../rules/README.md) |
| Rule lifecycle | [`../rules/LIFECYCLE.md`](../rules/LIFECYCLE.md) |
| Engineering policy | [`../standard/engineering/README.md`](../standard/engineering/README.md) |
| Design policy | [`../standard/design/README.md`](../standard/design/README.md) |
| Checklists | [`../checklists/README.md`](../checklists/README.md) |
| Traceability and coverage | [`../compliance/TRACEABILITY.md`](../compliance/TRACEABILITY.md) |
| Governance | [`../GOVERNANCE.md`](../GOVERNANCE.md) |
| Consolidation history | [`../MIGRATION.md`](../MIGRATION.md) |

## What adopters receive

| Artifact | Path |
|---|---|
| Memory template | [`../templates/project/`](../templates/project/README.md) |
| Agent adapters | [`../templates/agents/`](../templates/agents/AGENTS.md) |
| CI workflow | [`../templates/github/workflows/app-ci.yml`](../templates/github/workflows/app-ci.yml) |
| Skill pack | [`../skills/devia/SKILL.md`](../skills/devia/SKILL.md) |
