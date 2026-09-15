# devia

**One standard, one memory.** Devia is the single engineering standard for building software
with AI coding agents — and the living project memory those agents read before they touch
anything.

```text
MEMORY (what this project is)  →  POLICY (rules)  →  CHECK (devia check)  →  ENFORCEMENT (CI)
```

Install it once, run `devia init`, and the project grows a `.devia/` folder. That folder is the
first thing every agent reads and the last thing every change updates.

## Why it exists

An agent that starts cold re-derives the project on every task: it invents APIs, re-litigates
decisions that were already made, ships a UI with no empty state, and reports "done" because the
unit tests passed. Documentation does not fix that — documentation goes stale the moment the code
moves.

Devia fixes it with three things that reinforce each other:

| | | |
|---|---|---|
| **Discipline** | how an agent is allowed to work | `AGENTS.md`, `rules/agent/`, `rules/memory/` |
| **Standard** | how the software must be built | `standard/engineering/`, `standard/design/`, `rules/`, `checklists/` |
| **Memory** | what *this* project actually is | `.devia/` in the target repo |
| **Decisions** | what it has ruled on — and what it has not | `.devia/decisions.yaml`, `rules/decision/` |

And one line underneath all of it:

> **An undefined decision is not an implicit permission.**

A hole in a project is not a blank for the implementation to fill. It is a question with an
owner, and devia makes it one before an agent stands in front of it.

## Quick start

```bash
npm install -D @schneiderjoseph/devia    # the binary it installs is `devia`
npx devia init                # creates .devia/ + agent adapters
npx devia validate            # memory integrity
npx devia check               # production readiness (P0/P1)
npx devia doctor              # adoption + staleness diagnosis
npx devia context "<task>"    # the smallest sufficient context for one task
npx devia decide              # the decision register: decided · pending · delegated
npx devia update              # is there a newer devia, and what does it bring?
```

`devia init` writes:

```text
.devia/
├── AGENTS.md            # local work contract
├── 00_OVERVIEW.md       # what this project is, stack, modules
├── 01_ARCHITECTURE.md   # structure, boundaries, current vs target
├── 02_SURFACES.md       # pages / endpoints / jobs and where they live
├── 03_DATA_MODEL.md
├── 04_PERMISSIONS.md
├── 05_FLOWS.md
├── 06_INTEGRATIONS.md
├── 07_DESIGN.md
├── 08_DISCOVERY.md      # web and docs profiles: search, indexing, AI access policy
├── 10_NEVER_ALWAYS.md   # project rules earned from real incidents
├── 11_GAPS.md           # registry: a question somebody hit; nobody has ruled
├── 12_DEBT.md           # registry: decided, not built
├── 13_RECIPES.md        # how to do common tasks in THIS repo
├── 14_INDEX.md          # where to find what
├── decisions.yaml       # register: what this project owes an explicit answer to
├── impact-map.yaml      # change type → files that must be updated
├── devia.json           # profile, modules, maturity target, pinned version, context budget
├── contributions/       # optional: evidence for devia problems found in this repo
└── standard/            # optional: `devia sync` pins a copy of the standard here
```

Plus adapters so every agent gets the same contract: `AGENTS.md` (universal), `CLAUDE.md`,
`.cursor/rules/devia.mdc`, `.github/copilot-instructions.md`, `.windsurfrules`.

## The register

The two older registries are reactive: a gap is a question somebody tripped over, a debt line is
a rule somebody noticed the code breaking. Neither says anything **before** the work starts —
which is exactly when an agent invents a brand, a framework major and a robots policy nobody
asked it for.

`devia init` seeds the questions a project of this kind always owes an answer to, from its
profile, every one of them pending:

```bash
npx devia decide                 # every slot, grouped, with its status
npx devia decide pending         # only what nobody has ruled on

npx devia decide set stack.framework "16.x" --package next --because "latest stable at init"
npx devia decide delegate testing.framework --bounded-by "runs in CI with no network"
npx devia decide drop content.imagery --because "this product ships no imagery"
npx devia decide open design.direction --owner "design lead" --blocks app/marketing
```

Four statuses, because absence of information and absence of need are different facts:

| | Means | What an agent may do |
|---|---|---|
| `decided` | A human ruled. | Implement it. |
| `pending` | Nobody has ruled. | **Build around it. Never answer it.** |
| `delegated` | The agent may choose, inside `bounded_by`. | Choose — inside those bounds only. |
| `not_required` | Deliberately not needed here. | Do not add one. |

A pending slot is not a nag. It travels with the work: `devia context "style the marketing hero"`
puts `design.direction`, `brand.colors` and `content.imagery` in the **blocking** tier, where the
budget cannot evict them. The agent is told not to invent a brand at the moment it would have.

Three of them are checked against the repository rather than against good intentions:

```text
brand.logo   decided → assets/brand/logo.svg     the file is not there        FAIL  DEC-005
stack.frame. decided → 16.x, package next        the manifest says ^15.2.0    FAIL  DEC-003
design.dir.  pending, blocks app/marketing       app/marketing exists         FAIL  DEC-001  P0
```

Only the third blocks, and only because the project itself declared what that decision blocks. A
gate that failed on every open question would be switched off inside a week.

devia never asks a registry what the newest release is — it has no network, and "latest" rots in
a file the day after it is written. "Is 16 still the newest" is `npm outdated`'s question. "Did
we decide 16 and ship 15" is devia's, and it is the one that is actually a defect.

## Staying current, without devia deciding that for you

`devia update` answers three questions in order, and the third is always yours.

```text
$ npx devia update

devia update — 0.9.0
  INFO  devia 1.1.0 est disponible. Vous êtes en 0.9.0.

  Ce qu'apporte la version 1.1.0 :
  ...

  Mettez à jour quand vous le décidez :
    npm install -D @schneiderjoseph/devia@1.1.0
    npx devia update --yes

  devia n'installe rien de lui-même — cette commande vous appartient.
```

The summary is in the reader's language — six of them, plus English — because that is the only
part of devia addressed to a person rather than to an agent. The standard, the rules and every
memory file stay in English: they are read by agents and cited by identifier, and a translated
obligation is a second wording of the same rule.

It can describe a version you have not installed because each release publishes its own summary
in its `devia.release` field, which `npm view` serves from the registry. devia does not summarise
a release it does not have — that would be inventing, and this whole version is an argument
against that (`AGT-004`). Remote text is sanitized before it reaches your terminal.

| | |
|---|---|
| Installs | Never on its own. `--yes` runs the command it just printed, and nothing else |
| Reaches the network | Through your own `npm` — your registry, your proxy, your credentials |
| Sends | The package name. Nothing about this repository (that stays `contribute`'s promise) |
| Costs | One lookup a day, inside `update`, `init` and `doctor`. No other command waits on it |
| Off with | `DEVIA_NO_UPDATE_CHECK=1`, `"update": { "check": false }`, or being in CI |

Other commands show a three-line notice from the cached answer, never a fresh lookup — and never
on `--json`, which is a contract.

## Rule zero

```text
Work requested on a repository
        ↓
.devia/ exists? ──NO──► run `devia init` FIRST
        ↓ YES
Read .devia/AGENTS.md → 00_OVERVIEW → the surface you are touching
        ↓
Work
        ↓
Update .devia/ in the SAME change
```

An agent that codes without reading the memory, or that ships code without updating it, has
failed the task — not styled it differently.

## Reading the memory is not reading all of it

More context is not better context. Everything devia knows about this repository is about 20,000
estimated tokens; the part that belongs in the window for one task is a fraction of it, and the
rest pushes out the code the agent is supposed to read.

```bash
npx devia context "add POST /api/orders"           # the context itself, ready to pipe
npx devia context "fix the empty state" --explain  # why each item is there, and what was withheld
npx devia context --stats                          # the accounting
```

```text
Target              2400 tokens  (advisory)
Mandatory floor     2001 tokens in 36 items
Selected            2400 tokens in 43 items
Raw corpus         19882 tokens (estimated)
Reduction           87.9 %

Status           WITHIN TARGET
```

**Three numbers, not one.** A target is what you asked for; the mandatory floor is what the
blocking items cost; selected is what you got. Collapsing them is how "target 600, selected 1380"
comes to look like a broken promise instead of a stated design.

Two modes make the promise explicit:

| | `advisory` (default) | `strict` |
|---|---|---|
| Mandatory items | always whole | compressed toward their identifier, never dropped |
| The target | may be exceeded, and says so | never exceeded |
| When it cannot fit | `OVER TARGET`, with the floor | `IMPOSSIBLE` — nothing is produced, exit 1 |

Compression is minimal and reversible: every mandatory item starts at its smallest form and is
bought back toward full text in relevance order, so a larger target always returns more text.

Two things hold it up:

- **A blocking constraint is never dropped.** Not by a small target, not by a strict one. `npm
  run benchmark:context` measures exactly that across 352 runs and fails on a lost blocking rule
  whatever it saved.
- **A rule devia verifies itself is cited, not recited.** `SEC-002` arrives as
  `checked by devia check → SEC-SECRETS (P0) → blocks the change` instead of its full text,
  because the gate is what stops the change, not the agent's memory of the sentence. The
  exception carries the rule: a P0 whose only gate *warns* keeps its text, since nothing is
  actually stopping it (`AGT-013`).

Every selection can answer "why is this here?" and "why is that not?". A selector nobody can
interrogate is a selector nobody should trust.

Routing starts from the table *your project* already wrote. `impact-map.yaml` says a
`permission_change` updates `04_PERMISSIONS.md`, and that file speaks for security and privacy —
so a permission change routes to security without anyone teaching devia your word for it. A
project that invents `new_consent_record` routes exactly as well as a built-in change type does.

## Contributing back from a real repository

An agent using devia inside your project will sometimes hit a devia problem — a gate that fires
on valid code, a check that misses one, a context selection that spends its budget badly.
`devia contribute` turns that into an issue or a pull request, under two hard constraints.

**Your project stays your project.** Nothing is uploaded. The payload is a standalone fixture the
contributor wrote, devia's own version metadata, and the expected and actual behaviour. Secrets,
tokens, addresses, IP addresses, your home directory, your account name and the repository path
are redacted on the way in; an environment file is refused outright rather than sanitized and
copied. The finished payload is re-scanned, and a surviving secret shape blocks the upload
instead of warning about it. `submit` prints every byte first, and sends nothing without `--yes`.

**Evidence, not opinion.** "devia could support X" is not a contribution. A candidate becomes
eligible because devia re-ran the recorded invocation inside the minimal case and observed the
reported behaviour:

```text
observed  →  reproduced  →  fixed  →  issue or pull request
```

`reproduced` is never something the record says about itself. Every run is bound to two digests —
the fixture that ran and the devia source that ran it — so `fixed` means the two runs agreed
about the experiment and disagreed about the tool:

```text
| Run        | Date       | Fixture  | devia source |
| reproduced | 2026-09-12 | 3f2a…    | 9c11…        |
| expected   | 2026-09-13 | 3f2a…    | 4d80…        |
```

Same fixture, different devia: a maintainer can check that by running the fixture against each.
Edit the fixture until it passes and the record says so and stays at `reproduced`; edit the claim
and the state drops back to `observed`. A fix with a regression test is a PR candidate; anything
else is an issue; a security defect goes to the private advisory path and never becomes either
(`AGT-012`, `PRIV-005`). Turn the whole feature off with `"contribution": { "enabled": false }`.

## What the gates actually caught

`PRINCIPLES.md` says evidence beats opinion, so here is the evidence. Every defect below was
found by devia's own gates, in one week, on devia itself and on one real project — a Next.js
application whose manifest lives in `apps/web/`. None of it is independent adoption; read it as
a tool being run in anger, not as a case study.

| Defect | Caught by |
|---|---|
| Nine relative links resolved in this repository and not in the copy shipped to adopters — every project got nine broken links | The test that walks a materialised `.devia/` instead of listing it |
| `devia debt close` blanked a table row instead of removing it. A blank line ends a markdown table, so every debt line below the closed one was orphaned | Discharging a real debt line with the command itself |
| Two tests parsed `--json` from stdout merged with stderr. On a machine with `FORCE_COLOR` set, a Node warning made the JSON unparseable | `prepublishOnly`, which refused to publish |
| The skill told every agent to bootstrap with `npx devia init`. The package is scoped, so in a repository that has not installed devia that resolves to `404 devia@*` | Installing the skill system-wide, where a cold start is the normal case |
| Five gates reported `SKIP  no package.json` to a repository that has one, with a lockfile, a lint script and thirteen dependencies. The letter of the rule held — nothing was rounded up to `PASS` — but the reason printed was false | Running `devia check` on a real project instead of a fixture |
| `MEM-DEBT-P0` matched `P0` anywhere in a debt row. A P1 line reading "becomes P0 once payments ship" reported a P0 blocker on a project that had none | Writing a real project's debt registry |
| Context routing sent "add POST /api/orders" to `api` alone, dropping `SEC-001` and `SEC-003` — the two rules a write endpoint most needs — at every budget | `npm run benchmark:context`, which asserts recall before reduction |
| The word "table" routed a schema change through `components` into the whole accessibility corpus. `key` inside `monkey` redacted `monkey: banana` | A benchmark scenario and a test that each name the word that must not match |
| Strict-mode compression shrank every mandatory rule to a bare identifier, then spent the freed tokens admitting *optional* rules at full text | Reading the strict output at four targets instead of trusting that "it fit" meant "it fit well" |
| A "noise ratio" metric that was 0.0% in all 352 runs, because nothing could ever score above zero. A metric that always passes measures nothing | Looking at a column of zeros and not believing it |
| `contribute verify` reported `fixed` when the expected behaviour held — on a fixture that had never once failed. Nothing had been fixed | The test that drives the loop instead of asserting the state machine directly |
| The contribution report's own Evidence line read `sanitized: not recorded` on a payload that had just been sanitized | Reading the generated issue body instead of the code that generates it |

One theme runs through all of them. A check that cannot answer must say so — but a `SKIP` with a
false reason, a `FAIL` invented out of prose, a `fixed` on something that never broke, or a
`sanitized: not recorded` on a payload that was sanitized, is worse than no check at all, because
the reader believes the tool looked. Every line above is now a regression test.

The routing defects are worth dwelling on separately: all three were found by a benchmark that
refuses to report a saving until it has reported recall, and none of them were visible in the
percentage. A context optimiser measured only by how much it cut will cut the wrong things.

## What is in the box

| Layer | Where | Content |
|---|---|---|
| Work contract | [`AGENTS.md`](AGENTS.md) | Workflow, hard stops, output contract |
| Principles | [`PRINCIPLES.md`](PRINCIPLES.md) | Simple > clever, complexity earned, dependency liability, evidence > opinion |
| Memory doctrine | [`MEMORY.md`](MEMORY.md) | Registries, sweep discipline, impact map, staleness |
| Decisions | [`rules/decision/`](rules/README.md) | What must be ruled on before it is built, and by whom |
| Rules | [`rules/`](rules/README.md) | 155 rules with stable IDs, severity, priority, validation |
| Engineering | [`standard/engineering/`](standard/engineering/README.md) | Architecture, security (ASVS 5.0), database, API, testing, devops, observability, privacy, payments, AI |
| Design | [`standard/design/`](standard/design/README.md) | UX, UI, accessibility (WCAG 2.2), states, components, data display, i18n, responsive, anti-patterns |
| Checklists | [`checklists/`](checklists/README.md) | Engineering + design review gates |
| Levels | [`LEVELS.md`](LEVELS.md) | Policy → Check → Enforcement |
| Maturity | [`MATURITY.md`](MATURITY.md) | P0–P3, Bronze → Platinum |
| Skill pack | [`skills/devia/SKILL.md`](skills/devia/SKILL.md) | Same contract for Cursor, Claude Code, Copilot, Windsurf, Aider |

## Severity and priority

```text
Rules:    MUST · MUST NOT · SHOULD · MAY
Gates:    P0 blocker · P1 required · P2 recommended · P3 optional
Tiers:    Bronze → Silver → Gold (production-ready) → Platinum
```

A rule without a check is aspirational. A check without CI enforcement is a suggestion.
See [`LEVELS.md`](LEVELS.md).

## Consolidation

Devia absorbs and replaces two earlier standards:

- `production-app-standard` → [`standard/engineering/`](standard/engineering/README.md)
- `design-system-standard` → [`standard/design/`](standard/design/README.md) + design rule IDs

Only devia is maintained. See [`MIGRATION.md`](MIGRATION.md).

## Stack assumption

Written primarily for Node.js / TypeScript, PostgreSQL, React, Docker and GitHub Actions.
The rules transfer to any stack; the commands may need adaptation. The memory layer is
stack-agnostic by construction.

## License

MIT — see [`LICENSE`](LICENSE).
