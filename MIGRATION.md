# Migration — from two standards to one

Devia consolidates three bodies of work into a single maintained standard:

| Source | Became |
|---|---|
| `production-app-standard` | [`standard/engineering/`](standard/engineering/README.md), [`checklists/engineering/`](checklists/README.md), engineering rule IDs |
| `design-system-standard` | [`standard/design/`](standard/design/README.md), [`checklists/design/`](checklists/README.md), design rule IDs |
| Ad-hoc project memory (`DEVIA/` folders, agent guides, gap and debt registers) | [`MEMORY.md`](MEMORY.md), `rules/memory/`, `rules/agent/`, the `.devia/` template |

Only devia is maintained. The two source repositories are frozen; do not open PRs against them.

## Path mapping

```text
production-app-standard/docs/<domain>/X.md   →  devia/standard/engineering/<domain>/X.md
production-app-standard/checklists/X.md      →  devia/checklists/engineering/X.md
production-app-standard/templates/ADR.md     →  devia/templates/docs/ADR.md
production-app-standard/scripts/production-check.mjs
                                             →  devia check   (CLI command)

design-system-standard/rules/<domain>/ID.md  →  devia/rules/<domain>/ID.md
design-system-standard/<domain>/X.md         →  devia/standard/design/<domain>/X.md
design-system-standard/checklists/X.md       →  devia/checklists/design/X.md
design-system-standard/schema/*.json         →  devia/schema/*.json
design-system-standard/scripts/validate-*.mjs
                                             →  devia/scripts/validate-*.mjs
```

## Rule IDs

Design rule IDs are **unchanged**: `A11Y-*`, `CMP-*`, `CNT-*`, `DATA-*`, `DS-*`, `I18N-*`,
`INT-*`, `MOT-*`, `RWD-*`, `STATE-*`, `UI-*`, `UX-*`. Anything citing them keeps working.

Engineering and agent rules are **new** IDs, not renames: `ARC-*`, `SEC-*`, `DB-*`, `API-*`,
`TST-*`, `OPS-*`, `OBS-*`, `PRIV-*`, `AI-*`, `AGT-*`, `MEM-*`. They formalise obligations that
`production-app-standard` expressed only as prose and checklists.

Note the two `DATA` families do not collide: `DATA-*` is data **display** (design), database
rules are `DB-*`.

## If a repo already adopted one of the old standards

```bash
npm install -D @schneiderjoseph/devia
npx devia init          # writes .devia/ and the agent adapters
npx devia validate
npx devia check
```

Then:

1. Delete `.cursor/rules/production-app-standard.mdc` and
   `.cursor/rules/design-system-standard.mdc`; `devia init` writes `.cursor/rules/devia.mdc`.
2. Replace references to `production-app-standard` / `design-system-standard` in the repo's own
   `AGENTS.md`, `CLAUDE.md` or `CONTRIBUTING.md` with `.devia/AGENTS.md`.
3. Move anything the project had recorded as "known issues" into `.devia/11_GAPS.md`
   (undecided) and `.devia/12_DEBT.md` (decided, not built) — the split matters.
4. Replace `node scripts/production-check.mjs` in CI with `npx devia check`.

Nothing in the old repos is lost: the full text of both is vendored here, and `devia init`
vendors it again into the project under `.devia/standard/`.
