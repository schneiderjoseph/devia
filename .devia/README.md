# .devia — living memory for devia

This folder is the project's memory. It is read **before** any work and updated **with** every
change. It is not documentation: it is the short, indexed truth an agent needs to stop guessing.

Created by `devia init` (devia 0.1.0, 2026-09-03).

## Read order

| # | File | Answers |
|---|---|---|
| — | [`AGENTS.md`](AGENTS.md) | What am I allowed to do here? **Read first.** |
| 10 | [`10_NEVER_ALWAYS.md`](10_NEVER_ALWAYS.md) | What has this project already banned? |
| 00 | [`00_OVERVIEW.md`](00_OVERVIEW.md) | What is this project, and what is it built with? |
| 01 | [`01_ARCHITECTURE.md`](01_ARCHITECTURE.md) | How is it organised? What boundaries hold? |
| 02 | [`02_SURFACES.md`](02_SURFACES.md) | What pages, endpoints and jobs exist, and where? |
| 03 | [`03_DATA_MODEL.md`](03_DATA_MODEL.md) | What is stored, and where is it defined? |
| 04 | [`04_PERMISSIONS.md`](04_PERMISSIONS.md) | Who can do what? What is audited? |
| 05 | [`05_FLOWS.md`](05_FLOWS.md) | What journeys must never break? |
| 06 | [`06_INTEGRATIONS.md`](06_INTEGRATIONS.md) | What external services, and which secrets? |
| 07 | [`07_DESIGN.md`](07_DESIGN.md) | What tokens, components and interface decisions? |
| 11 | [`11_GAPS.md`](11_GAPS.md) | What is **not decided**? |
| 12 | [`12_DEBT.md`](12_DEBT.md) | What is decided and **not built**? |
| 13 | [`13_RECIPES.md`](13_RECIPES.md) | How do I do this routine task here? |
| 14 | [`14_INDEX.md`](14_INDEX.md) | Where do I find X? |

Machine files: [`devia.json`](devia.json) (profile, maturity, pinned version) and
[`impact-map.yaml`](impact-map.yaml) (change type → files to update).

This repository **is** the standard, so its memory points at the repository files directly —
[`../standard/`](../standard/), [`../rules/`](../rules/README.md) — and vendors nothing into
`.devia/standard/`. Adopters are in the same position by default: they read the standard with
`devia rules`, and pin a version-locked copy with `devia sync` when an agent must read it
offline or an audit needs the exact wording.

## The two registries

| File | Means | Never |
|---|---|---|
| `11_GAPS.md` | Undecided. Nobody has ruled. | Quietly pick an answer and code it |
| `12_DEBT.md` | Decided, not built. | Delete a line you did not discharge |

## Maintenance

```bash
npx devia validate    # structure, registries, placeholders
npx devia doctor      # is the memory older than the code?
npx devia check       # readiness gates
npx devia sync        # pin the standard under .devia/standard/, or refresh it
```

`.devia/` is committed. It is part of the repository, not a local scratch pad.
