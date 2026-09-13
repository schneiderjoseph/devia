# .devia — living memory for {{PROJECT_NAME}}

This folder is the project's memory. It is read **before** any work and updated **with** every
change. It is not documentation: it is the short, indexed truth an agent needs to stop guessing.

Created by `devia init` (devia {{DEVIA_VERSION}}, {{DATE}}).

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

Machine files: [`devia.json`](devia.json) (profile, maturity, pinned version, context budget) and
[`impact-map.yaml`](impact-map.yaml) (change type → files to update).

The standard itself is not copied in here. Read it with `npx devia rules --id SEC-001` or
`npx devia rules --domain database`, which is the same text for every agent. If you need it on
disk — an agent with no network, or an audit that must show the exact wording you built against
— `npx devia sync` pins a version-locked copy under `standard/`, and `14_INDEX.md` then points
at it.

## Reading this is not reading all of it

Everything above plus the rule registry is more than one task needs. Ask for the slice:

```bash
npx devia context "add POST /api/orders"
npx devia context "fix the empty state" --files src/components/Orders.tsx --explain
```

It returns this project's own never/always lines, the blocking rules for the surfaces involved
and the impact-map duty first, then whatever else fits the target in `devia.json`
(`context.budget`).

Three numbers are always reported, because they are three different things:

```text
Target              1200   what you asked for
Mandatory floor      962   what the blocking items cost
Selected            1187   what you got
```

`context.mode` decides what happens when the floor is larger than the target. `advisory` (the
default) delivers the mandatory items whole and says `OVER TARGET`; `strict` never exceeds the
target and compresses them toward their identifiers instead, never dropping one.

Keeping `10_NEVER_ALWAYS.md` pruned matters here: every line is admitted before the target is
consulted, so a line nobody has ever violated costs every task that runs after it.

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
npx devia sync        # pin the standard under standard/, or refresh a pinned copy
```

`.devia/` is committed. It is part of the repository, not a local scratch pad.

## If devia itself is what went wrong

`npx devia contribute` turns a devia problem you hit here into an issue or a pull request. It
runs locally, builds a standalone reproduction rather than sending this repository, sanitizes
anything you explicitly include, prints every byte before sending, and sends nothing without
`--yes`. A candidate is only eligible once devia has reproduced the problem itself.

Records live in `contributions/`; the generated `payload/` is disposable and gitignored. Turn
the feature off entirely with `"contribution": { "enabled": false }` in `devia.json`.
