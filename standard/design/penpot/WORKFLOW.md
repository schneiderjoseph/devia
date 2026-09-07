# Penpot workflow

[Penpot](https://github.com/penpot/penpot) is recommended as the **visual** design-system surface (components, libraries, inspect). Self-host optional.

## Source of truth split

```text
GitHub
├── tokens/           ← SSOT for values
├── rules (this repo) ← SSOT for policy
└── component code    ← SSOT for behavior

Penpot
└── visual library    ← SSOT for layout/comps visuals (synced)
```

## Practice

1. Define/change tokens in Git first (or export immediately to Git)
2. Update Penpot shared library components
3. Publish library; products consume
4. Handoff via inspect + token names — not screenshots alone
5. AI agents read **this repo + tokens**, not only PNG exports

## MCP / API

Prefer structured tokens + this standard over “recreate from screenshot” prompts.
