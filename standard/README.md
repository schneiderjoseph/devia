# The standard

Narrative policy. The enforceable statements live in [`rules/`](../rules/README.md); these pages
are the reasoning, the detail, and the how.

```text
rules/       what must be true, with an ID you can cite
standard/    why, and how to do it
checklists/  what to walk through before calling something done
```

| Area | Where | Covers |
|---|---|---|
| Engineering | [`engineering/`](engineering/README.md) | Architecture, security (OWASP ASVS 5.0), database, API, testing, devops, observability, performance, privacy, payments, AI features |
| Design | [`design/`](design/README.md) | UX, UI, accessibility (WCAG 2.2), states, components, data display, localisation, responsive, interaction, anti-patterns |
| Memory | [`../MEMORY.md`](../MEMORY.md) | Living project memory: registries, sweep discipline, impact map, freshness |
| Agent | [`../AGENTS.md`](../AGENTS.md) | The work contract every agent operates under |

## Reading order

1. [`../AGENTS.md`](../AGENTS.md) — the contract
2. [`../PRINCIPLES.md`](../PRINCIPLES.md) — what never changes
3. The domain page for what you are touching
4. The matching checklist in [`../checklists/`](../checklists/README.md)
5. The rule IDs you will cite in the report

## Adding to the standard

A new page here is guidance, not obligation. If it states something a project must do, it needs
a rule with an ID under [`rules/`](../rules/README.md), a source, and a validation method — see
[`../GOVERNANCE.md`](../GOVERNANCE.md).
