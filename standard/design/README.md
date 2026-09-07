# Design standard

UX, UI, accessibility and design-system policy for every user-facing surface. The enforceable
statements are the `A11Y-*`, `UX-*`, `UI-*`, `CMP-*`, `STATE-*`, `DATA-*`, `RWD-*`, `INT-*`,
`I18N-*`, `DS-*`, `MOT-*` and `CNT-*` rules in [`../../rules/README.md`](../../rules/README.md).

```text
FOUNDATION (tokens, accessibility baseline)
   ↓
UX (jobs, flows, information architecture)
   ↓
UI (visual system)
   ↓
COMPONENTS → PATTERNS → SCREENS
   ↓
VALIDATION (checklists, accessibility, handoff)
```

A pretty button does not fix a broken flow.

| Area | Pages |
|---|---|
| Principles | [`principles/`](principles/design-principles.md), [`ux-principles.md`](principles/ux-principles.md), [`ui-principles.md`](principles/ui-principles.md) |
| Accessibility | [`accessibility/`](accessibility/wcag-2.2.md) — names, keyboard, focus, contrast, target size, reflow, motion, screen readers, testing |
| UX | [`ux/`](ux/heuristics.md) — heuristics, forms, errors, feedback, navigation, information architecture, cognitive load |
| UI | [`ui/`](ui/visual-design.md) — colour, typography, spacing, layout, grids, icons, imagery |
| Components | [`components/`](components/buttons.md) — buttons, forms, dialogs, tables, navigation, feedback |
| States | [`states/`](states/loading.md) — loading, empty, error, offline, permission-denied, read-only, stale, optimistic, unsaved changes |
| Data display | [`data-display/`](data-display/README.md) — tables, currency, dates, numbers, density, sorting, filtering, pagination |
| Responsive | [`responsive/`](responsive/mobile.md), [`platforms/`](platforms/README.md), [`interaction/`](interaction/README.md) |
| Localisation | [`localization/`](localization/README.md) — i18n, RTL, pluralisation, text expansion, formats |
| Design system | [`design-system/`](design-system/tokens.md) — tokens, components, naming, variants, versioning |
| Anti-patterns | [`anti-patterns/`](anti-patterns/ui.md) — including [`ai-generated.md`](anti-patterns/ai-generated.md) |
| Content | [`content/`](content/ux-writing.md) — UX writing, error messages |
| Motion | [`motion/animation.md`](motion/animation.md) |
| AI review | [`ai/`](ai/instructions.md) — review protocol, compliance format, prompts |
| Health | [`health/`](health/maturity-model.md) — coverage, score, maturity |
| Decisions | [`decisions/`](decisions/README.md) — token naming, radius scale, colour system, component versioning |

Sources: [`REFERENCES.md`](REFERENCES.md) and [`references/`](references/w3c.md).

## Non-negotiable for any UI change

1. Prefer existing tokens and components over new one-offs (`DS-001`, `DS-002`, `UI-003`, `UI-005`)
2. Every interactive control has an accessible name, a keyboard path and visible focus
   (`A11Y-001`, `A11Y-004`, `A11Y-006`)
3. Labels are persistent, never placeholder-only (`UX-007`)
4. Meaning is never carried by colour alone (`UI-004`)
5. States are complete: default, hover, focus, active, disabled, loading, empty, error, success —
   plus permission-denied and offline where they can occur (`STATE-001`, `STATE-002`, `STATE-003`)
6. Never claim WCAG conformance without contrast, keyboard and accessible-name evidence
