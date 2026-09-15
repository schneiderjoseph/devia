# Changelog

## 0.9.0 — 2026-09-15

**An undefined decision is not an implicit permission.**

0.8.0 could tell an agent what this project had already decided. It had nothing to say about
what the project had *not* decided, and that turned out to be where agents do the most damage —
not by breaking a rule, but by answering a question nobody asked them.

```text
information missing              information missing
       ↓                                ↓
reasonable assumption      →       PENDING — recorded, owned, in every context
       ↓                                ↓
implementation                human decision OR bounded delegation
       ↓                                ↓
a policy nobody chose              implementation
```

The purple-gradient landing page is the visible case. The expensive ones are quiet: a framework
major inherited from whatever scaffolded the repository, an indexing policy inherited from a
template, a rounding rule that was load-bearing by the time anyone noticed. In all of them the
failure is the same — a missing answer was read as a free choice.

### The decision register

`.devia/decisions.yaml`, seeded by `devia init` from the project profile. The two older
registries are reactive: a gap is a question somebody tripped over, a debt line is a rule
somebody noticed the code breaking. Neither says anything *before* the work starts.

```text
decisions.yaml   the questions this kind of project always has   — known unknowns
11_GAPS.md       a question somebody hit while working           — unknown unknowns
12_DEBT.md       decided, not built
```

Four statuses, not three, because absence of information and absence of need are different
facts. `not_required` is a ruling — "this product ships no photography" — and folding it into
`pending` would leave a permanent false alarm on a project that has already answered.

| | Means | What an agent may do |
|---|---|---|
| `decided` | A human ruled. | Implement it. |
| `pending` | Nobody has ruled. | **Build around it. Never answer it.** |
| `delegated` | The agent may choose, inside `bounded_by`. | Choose — inside those bounds only. |
| `not_required` | Deliberately not needed here. | Do not add one. |

A delegation with no bounds is not delegation; it is absence wearing the word "explicit", and
`devia validate` fails it. Likewise a ruling with no reason and no date: `devia decide set`
refuses it rather than recording folklore.

```bash
devia decide                     # every slot, grouped, with its status
devia decide pending             # only what nobody has ruled on
devia decide set stack.framework "16.x" --package next --because "latest stable at init"
devia decide delegate testing.framework --bounded-by "runs in CI with no network"
devia decide drop content.imagery --because "this product ships no imagery"
devia decide open design.direction --owner "design lead" --blocks app/marketing
```

There is no verb that deletes a slot. A question this kind of project has does not stop existing
because the answer is inconvenient — `drop` records that it is deliberately not needed, with a
reason and a diff somebody can read.

### It travels with the work

A doctrine an agent has to remember is a doctrine an agent forgets. A pending decision the task
touches is admitted to the **blocking** tier of `devia context`, before the budget is consulted,
and is never evicted — in `strict` mode it shrinks to its own name rather than disappearing.

```text
$ devia context "style the marketing hero" --files app/marketing/page.tsx

## Blocking — these stop the change
- decision design.direction · pending
  The visual direction this product commits to — owed by design lead.
  Do not encode an answer: record the consequence or ask (DEC-001).
- decision brand.colors · pending
- decision content.imagery · pending
```

The agent is told not to invent a brand at the moment it would have.

### Three checks against the repository, not against good intentions

```text
brand.logo      decided → assets/brand/logo.svg   the file is not there       FAIL  DEC-005
stack.framework decided → 16.x, package next      the manifest says ^15.2.0   FAIL  DEC-003
design.direction pending, blocks app/marketing    app/marketing exists   P0   FAIL  DEC-001
```

Only the third blocks, and only because the project itself declared what that decision blocks.
A gate that failed on every open question would be switched off inside a week, and devia would
have traded a real stop for a warning nobody reads.

`DEC-STACK` compares the decision with the **manifest**, never with a registry. devia has no
network, and "latest" rots in a file the day after it is written. "Is 16 still the newest" is
`npm outdated`'s question; "did we decide 16 and ship 15" is devia's, and it is the one that is
actually a defect. Staying on an old major on purpose is a decision devia records rather than
punishes — it asks only that the reason be written down.

### Discovery is a surface, not a task at the end

Fourteen new rules: seven `DEC-*` for how decisions are made, seven `DISC-*` for how a project is
found. `08_DISCOVERY.md` appears for the `web-app` and `docs` profiles only.

Search and machine access share one set of mechanisms and differ only in policy, so they are one
file with two sections rather than two files of overlapping technique. The policy question —
*may AI crawlers fetch this, and may it train on it* — is recorded as a decision with an owner,
and implemented where the mechanism is actually honoured.

`DISC-006` is the counterweight, and it was written deliberately: a discovery mechanism is never
adopted on the strength of its name. An unratified convention is recorded as a convention, with
what actually honours it, and is never described to anyone as protection. `DISC-004` (P0) is the
one that blocks: a staging host is kept out of the index by authentication, not by a robots
directive — that is a request, and a public list of what exists.

### Required memory files now depend on the profile

`08_DISCOVERY.md` is owed by projects that have something to be discovered. A required file a
project has no use for is a file it fills with `TODO(devia)`, and placeholders are how a memory
stops being read. `devia validate`, `devia doctor` and the impact-map check all resolve the
required set from `devia.json`.

### Staying current is now devia's job to *say*, and yours to decide

A tool that tells agents never to decide for the project cannot quietly upgrade itself. So
`devia update` answers three questions in order — is there a newer version, what does it bring,
do you want it — and stops at the third.

```text
devia update — 0.9.0
  INFO  devia 1.1.0 est disponible. Vous êtes en 0.9.0.
  ...
  Mettez à jour quand vous le décidez :
    npm install -D @schneiderjoseph/devia@1.1.0
    npx devia update --yes

  devia n'installe rien de lui-même — cette commande vous appartient.
```

The summary is in the reader's language — `en`, `fr`, `es`, `de`, `it`, `pt`, falling back to
English key by key. Only the lines addressed to a **person** are translated; the standard, the
rules and every memory file stay in English, because they are read by agents, cited by
identifier, and a translated obligation is a second wording of the same rule.

devia can describe a version it does not have because every release publishes its own summary in
its `devia.release` manifest field, which `npm view` serves from the registry. The alternative
was to summarise a release devia had never seen, which is inventing (`AGT-004`). That text is
remote, so it is treated as data: control characters stripped, strings and bullet counts capped
(`AI-001`).

- Nothing is installed without `--yes`, and `--yes` runs the command it just printed
- The lookup is handed to your own `npm` — your registry, proxy and credentials — because devia
  ships no HTTP client and no runtime dependency, exactly as `contribute` hands publishing to `gh`
- The package name is all that is sent. Nothing about the repository leaves it; that promise
  belongs to `contribute` and is untouched
- One lookup a day, and only inside `update`, `init` and `doctor`. Every other command reads the
  cached answer and shows three lines, or says nothing. No command waits on a registry
- Off with `DEVIA_NO_UPDATE_CHECK=1`, `"update": { "check": false }` in `devia.json`, or CI —
  where it is off by default, because a build that reaches a registry fails when the registry does
- The notice never appears on `--json`, and never changes a command's exit code

### Also in this release

- `devia read` now renders the register. A page called "the memory" that omits what the project
  has ruled on omits the part an agent is least allowed to guess
- A memory created by an older devia is reported, never failed — a missing `08_DISCOVERY.md` or
  register warns and names `devia init` as the remedy, and an impact map pointing at a file devia
  introduced later is one warning rather than one failure per change type. A target devia has
  never heard of is still a failure, because that is a typo
- A pasted multi-line reason can no longer make the register unparseable, and a slot key that is
  not an address is refused before it is written

### Upgrading from 0.8.0

```bash
npx devia init      # adds decisions.yaml and 08_DISCOVERY.md; touches nothing else
npx devia decide    # every slot is pending until you rule on it
```

`init` without `--force` never overwrites a file that holds decisions. A memory with no register
is reported, not failed: `devia validate` warns, and all five `DEC-*` gates report `SKIP` with
the reason. Nothing that passed under 0.8.0 starts failing because 0.9.0 was installed.

Standard 0.2.0 → **0.3.0** (two new rule domains). Memory schema 1 → **2**.

## 0.8.0 — 2026-09-13

A hardening pass. No new features: three limitations 0.7.0 recorded as debt are closed, and the
benchmark grew enough to prove it. The standard is unchanged at 0.2.0.

### A target is not a floor

`Budget 600 → selected 1,380` was a stated design — a mandatory item is never evicted — printed
in a way that read as a broken promise. Three numbers now travel together everywhere:

```text
Target              2400 tokens  (advisory)
Mandatory floor     2001 tokens in 36 items
Selected            2400 tokens in 43 items
Status           WITHIN TARGET
```

And the promise is now explicit per mode:

| | `advisory` (default) | `strict` |
|---|---|---|
| Mandatory items | always whole | compressed toward their identifier, never dropped |
| The target | may be exceeded, and says so | **never** exceeded |
| When it cannot fit | `OVER TARGET`, with the floor | `IMPOSSIBLE` — nothing produced, exit 1 |

Compression is minimal: every mandatory item starts at its smallest form and is bought back
toward full text in relevance order, so a larger target always returns more text. The first
implementation shrank every mandatory rule to a bare identifier and then spent the freed tokens
admitting *optional* rules at full text, which is precisely backwards — that is now a test.

- `context.budget` and `context.mode` in `devia.json`; `context.maxTokens` is still read, so an
  0.7.0 adopter keeps working untouched
- `--strict` / `--mode`, and `devia check` gains `CTX-BUDGET` (P2): it compares the declared
  target with the floor for a task that routes nothing, so a target nobody revisits cannot
  quietly become a permanent overrun. Closes G11
- A compressed rule still names itself and says where to read it (`devia rules --id <ID>`)

### The impact map is a router, not only a checklist

Routing was devia guessing from a keyword table, which a project whose vocabulary differs loses
by. `impact-map.yaml` is the one routing table the *project* wrote: a declared change type now
routes the domains of the memory files it names, and promotes those files.

`permission_change → 04_PERMISSIONS.md` means a permission change routes to security and privacy
without anyone teaching devia this project's word for it — and a project that invents
`new_consent_record` routes exactly as well as a built-in does. `--type` declares it explicitly.
A change type is matched on half its significant parts, so "add an endpoint" reaches
`new_endpoint` while "fix the empty state" does not reach `state_machine_change`. Closes D12.

### Evidence is bound to the experiment that produced it

`fixed` used to mean "the behaviour changed between two runs". It now means the two runs were the
same experiment: every run records a digest of the fixture that ran and of the `bin/` + `src/`
that ran it, and a fix has to agree about the first and disagree about the second.

```text
| Run        | Date       | Fixture | devia source |
| reproduced | 2026-09-12 | 3f2a…   | 9c11…        |
| expected   | 2026-09-13 | 3f2a…   | 4d80…        |
```

Editing the fixture until it passes now reports `the reproduction changed between the two runs`
and stays at `reproduced`. Two runs against the same devia report `nothing in devia changed
between them`. A record written before hashing existed is re-verified rather than trusted. The
table travels in the published report, so a maintainer can check it by running the fixture
against each. Closes D10.

### Benchmark

`npm run benchmark:context` now runs **352 combinations**: 4 corpus shapes (devia's own plus a
small, an ordinary and a large synthetic memory) × 11 task types × 4 targets × 2 modes. It fails
on three promises and reports four measurements.

Measured, not claimed:

```text
Critical-rule recall     100% in 352/352 runs
Routing accuracy         100% in 352/352 runs
Strict budget compliance 176/176 runs never exceeded the target
Advisory over target      68/176 runs, all because the mandatory floor exceeded it
Mean task-generic share  66.9% of selected tokens
Mean supporting filler    2.3% of selected tokens
Mean selection time       <1 ms per run
```

It found two defects on the way in: the strict compression order above, and a "noise ratio" that
read 0.0% in all 352 runs because nothing could ever score above zero. A metric that always
passes measures nothing; it is replaced by two that can move.

Where a target is still exceeded, and exactly why: 68 of the 176 advisory runs, **none** of the
176 strict ones. In all 68, `selected` equals the mandatory floor to the token — the excess is
entirely mandatory items and nothing optional was ever added on top. That is now an invariant the
benchmark and the test suite both enforce, not an observation:

| Corpus | Target | Runs over | Mandatory floor | Excess |
|---|---|---|---|---|
| devia (real) | 600 / 1200 / 2400 | 11 / 11 / 1 | 1511–2686 | 20–2086 |
| small memory | 600 / 1200 | 9 / 2 | 702–1577 | 86–977 |
| ordinary memory | 600 / 1200 | 9 / 2 | 760–1635 | 144–1035 |
| large memory | 600 / 1200 / 2400 | 11 / 11 / 1 | 1384–2420 | 20–1820 |

Every one of them is a repository asking for less than its own blocking rules cost. `strict` is
the answer when the target has to hold.

**Cost per correct decision is not measured.** It needs an agent and a graded task set, which
this benchmark does not have, and the output says so rather than implying otherwise.

### Fixed

- The benchmark rebuilt the corpus for every combination, which made it forty times slower than
  the thing it measures. The corpus is read once per shape and cloned per run: 79s → 1.5s

## 0.7.0 — 2026-09-12 (never published)

This version was prepared but never tagged and never published. No source state for it
survived, and 0.8.0 rewrote the surfaces it introduces below before either reached npm, so
everything in this section shipped in 0.8.0 instead. It is kept because it is the record of
what those two commands were when they were written. An adopter looking for `0.7.0` on npm
will not find it, and wants `0.8.0`.

The standard gains three rules and moves to 0.2.0: `AGT-012`, `AGT-013`, `PRIV-005`.

Nothing changes for a repository that does nothing. Both features are additive, `devia check`,
`validate`, `doctor`, `rules`, `read` and `sync` behave exactly as before, and neither new
command needs GitHub authentication, network access or a dependency to do its local work.

### `devia context` — the smallest sufficient context for one task

More context is not better context. Everything devia knows about this repository is about 16,000
estimated tokens; the part that belongs in the window for one task is a fraction of it, and the
rest pushes out the code the agent is supposed to read.

```text
Raw corpus         16247 tokens (estimated)
Selected            2395 tokens in 45 items
Budget              2400 tokens
Reduction           85.3 %
```

- The corpus is addressable items, not files: a rule, a memory section split at its heading, one
  never/always line, one open gap or debt row, one impact-map duty
- Routing is a keyword table, a changed-path table and an implication table, all data. Every
  selection carries its reason, so `--explain` answers both "why is this here?" and "why is that
  not?"
- Five tiers decide what the context *is*; the budget decides how much of it fits. **A blocking
  constraint is admitted before the budget is consulted and is never evicted** — too small a
  budget reports an overrun and still carries every P0
- `context.maxTokens` in `devia.json`, default 1200. A missing or nonsense value degrades to the
  default rather than failing
- `--files`, `--diff`, `--domain`, `--budget`, `--explain`, `--stats`, `--full`, `--json`

**A rule devia verifies itself is cited, not recited** (`AGT-013`). `SEC-002` arrives as
`checked by devia check → SEC-SECRETS (P0) → blocks the change` instead of its requirement,
because the gate is what stops the change. The exception carries the rule: a `P0` whose only gate
*warns* keeps its full text, since nothing is actually stopping it. `src/lib/gates.mjs` now holds
the gate table as data, so `check` and `context` cannot disagree about which rule is enforced.

`npm run benchmark:context` measures six scenarios at three budgets and **asserts recall before
it reports a reduction**. It found three defects the percentage never would have:

- `add POST /api/orders` routed to `api` alone and dropped `SEC-001` and `SEC-003` — the two
  rules a write endpoint most needs — at every budget. An endpoint is an authorization surface
  whether or not the task says the word
- the word "table" sent a schema change through `components → accessibility` and pulled the whole
  screen corpus into it
- `new_endpoint` never matched its own impact-map key, because the task's words were never split
  on the underscore

### `devia contribute` — a devia problem hit in a real repository

An agent using devia inside somebody's project will sometimes hit a devia problem. This turns
that into an issue or a pull request under two hard constraints.

**Evidence, not opinion** (`AGT-012`). A candidate is eligible because devia re-ran the recorded
invocation inside a minimal fixture and observed the reported behaviour:

```text
observed → reproduced → fixed → issue or pull request
```

`reproduced` is never something the record says about itself. The verdict is bound to a hash of
the claim, so editing the claim drops the state back to `observed` instead of carrying a stale
verdict forward. `fixed` needs both halves — devia saw the problem, then devia saw it gone; the
expected behaviour alone means the fixture never failed, which is the opposite of a fix. A
speculative proposal is possible with `--manual`, and becomes an issue, never a pull request.

**The user's repository stays the user's** (`PRIV-005`). Nothing is uploaded. A payload carries a
standalone fixture, devia's version metadata and the two behaviours. Secrets, credential
assignments, addresses, IP addresses, the home directory, the account name and the repository
path are redacted on the way in and the redactions are reported; an environment file is refused
outright rather than sanitized and copied. The finished payload is re-scanned, and a surviving
secret shape blocks the upload rather than warning about it.

`submit` writes the payload and prints the `gh` command. `submit --yes` is the only path in devia
that can reach the network, and it refuses unless the candidate is eligible, the payload is
clean, an identity is declared in `devia.json`, that identity is not the maintainer's, and `gh`
is authenticated as it. devia stores no token, reads none from the environment, and never
commits, branches or pushes in anyone's checkout. A security defect is routed to the private
advisory path and never becomes an issue or a PR. `"contribution": { "enabled": false }` turns
the whole feature off, local commands included.

### Fixed

- `src/lib/sanitize.mjs` now owns the secret-pattern list that `devia check` scans with, so a
  pattern added for one is immediately true for the other
- The sanitizer re-matched its own `[redacted]` placeholder, inflating the redaction count every
  time text passed through, and dropped the quoting around a redacted value — which could stop a
  fixture file parsing
- `init` now writes `.devia/.gitignore` covering `reader.html` and `contributions/*/payload/`.
  The memory's README already told adopters those were gitignored; nothing was writing it. The
  project's own `.gitignore` is not touched

## 0.6.0 — 2026-09-09

The standard is unchanged: `VERSION` stays at 0.1.0.

### `devia read` — the memory as one page

A memory nobody reads is documentation with extra steps. `devia read` renders `.devia/` into a
single HTML file: a sidebar in reading order — the contract first, then the numbered files — and
links between memory files that jump inside the page instead of asking the filesystem for them.

The page is **self-contained**: content embedded, no fetch, no CDN, no stylesheet to resolve. It
opens by double-click, offline. The reader that prompted this one needed a running local server,
because a page that fetches its own content hits CORS on `file://`.

- `devia read` writes `.devia/reader.html`; `--out` puts it elsewhere
- It is a **snapshot**, never the source: regenerate it after changing the memory. Adopters
  should gitignore it, as this repository now does
- `src/lib/markdown.mjs` renders the subset the memory templates actually use — headings,
  tables, fenced code, lists, quotes, rules, and a few inline marks. Same reasoning as the YAML
  parser: devia writes the files it reads, and `ARC-004` rules out a library. Content is escaped
  before anything else, so memory text cannot inject markup, and a line outside the subset is
  shown as written rather than dropped

Recorded as G9.

### Fixed

- `devia --help` still described `sync` as refreshing a vendored standard, which 0.5.0 made
  opt-in

## 0.5.0 — 2026-09-09

The standard is unchanged: `VERSION` stays at 0.1.0.

### Pinning the standard is now opt-in

`devia init` used to copy the whole standard into `.devia/standard/`. Measured on a real
repository: **391 pinned files against 17 of memory** — a folder whose purpose is to be read by
a human and an agent, in which 96% of the files were a copy nobody wrote. On a 211-file project
it tripled the repository, and every `devia sync` produced a 391-file diff in which a real
memory change was invisible.

- `devia init` writes the memory and the adapters, and pins nothing: **17 files, 57 kB**
- `devia init --vendor` pins the copy for those who want it up front
- `devia sync` pins it on demand and refreshes it afterwards — that is now its first job, not
  only its maintenance one
- `doctor` reports an unpinned standard as `INFO`, not a `WARN` to clear: the default is not a
  defect
- The memory templates, the agent adapters and the skill read the rules with
  `npx devia rules --id <ID>` / `--domain <name>` instead of linking into a copy that may not
  exist. A pinned copy is mentioned as what it is: optional

Nothing to do when upgrading. An existing `.devia/standard/` is left alone, `devia sync` keeps
refreshing it, and only new `devia init` runs behave differently. Recorded as G8.

### A P0 blocker comes from the priority cell, never from prose

`MEM-DEBT-P0` matched `P0` anywhere in a debt row. A P1 line reading "becomes P0 once the
payment module ships" failed the gate, so a project with no P0 debt was told it was blocked by
one. The check now reads the priority cell. Found by writing a real project's debt registry.

## 0.4.0 — 2026-09-09

The standard is unchanged: `VERSION` stays at 0.1.0, no adopter needs `devia sync`.

### A manifest is not always at the root

Running `devia init` on a real project for the first time — a Next.js app whose manifest lives
in `apps/web/` — exposed five gates reporting `SKIP  no package.json` to a repository that has
one, with a lockfile, a lint script and thirteen dependencies. The letter of the rule was kept,
since nothing was rounded up to `PASS`; the reason given was false, which is worse. A reader
believes the tool looked.

- `check` reads every `package.json` in the repository, nearest the root first, and takes the
  union of their dependencies: "does this project use X" is not a question about one directory
- A lockfile is looked for next to each manifest, not only at the root
- A migrations directory is found at any depth
- `SKIP` now says `no package.json anywhere in the repository`, and findings name the file they
  came from — `no npm test script in apps/web/package.json`
- `init` detects the profile from the nearest manifest instead of falling back to a default, and
  records the directories holding manifests in `code.paths`, which is what `doctor` watches for
  staleness

On that project: six SKIPs became two, four gates turned into real findings, and the dependency
lockfile went from invisible to `PASS  apps/web/package-lock.json`.

- G1 closed and reframed: the blind spot was never the ecosystem, it was the root assumption.
  D9 records what is still root-only: `pyproject.toml`, `go.mod`, `Cargo.toml`
- G7 opened: what devia should do when a repository already carries an ad-hoc memory of its own

### Fixed

- Nested directories were not excluded from the scan on Windows when git was unavailable: the
  separator class only matched `/`, so `apps/web/node_modules` was walked. Both separators now.

## 0.3.0 — 2026-09-09

The standard is unchanged: `VERSION` stays at 0.1.0, no adopter needs `devia sync`.

### devia is for every agent

0.2.0 shipped `--global` serving Claude Code alone and reported the other agents as SKIP. Two of
those reasons were wrong: they came from an absence never verified. `~/.cursor/rules/` holds
user-level `.mdc` rules, and `~/.codex/skills/` uses the same `SKILL.md` convention as Claude
Code. The decision is recorded as G6: no agent is privileged.

`devia skills install --global` now writes, each in the format the agent actually reads:

| Agent | Path | File |
|---|---|---|
| Claude Code | `~/.claude/skills/devia/SKILL.md` | skill pack |
| Codex | `~/.codex/skills/devia/SKILL.md` | skill pack |
| Cursor | `~/.cursor/rules/devia.mdc` | rules adapter |
| Gemini | `~/.gemini/GEMINI.md` | universal contract, only when absent or empty |
| Copilot, Windsurf | — | `SKIP`: user-level configuration is editor settings, not a file devia can place (`12_DEBT.md` D8) |

`CLAUDE_CONFIG_DIR` and `CODEX_HOME` are honoured when set. A directory the agent owns is
written to freely; a file the **user** owns is written only when absent or empty, and otherwise
skipped with the reason rather than replaced. `--force` overrides both and names every path.

## 0.2.0 — 2026-09-09

The standard is unchanged: `VERSION` stays at 0.1.0 and no adopter needs `devia sync`. This
release is the CLI only.

### The skill, once for every project

- `devia skills install --global` installs the skill pack in the agent's own configuration
  directory instead of one repository, so the contract applies everywhere. Claude Code is
  supported (`~/.claude/skills/devia/SKILL.md`, or `CLAUDE_CONFIG_DIR` when set); Cursor,
  Copilot and Windsurf report `SKIP` with the reason, because devia will not guess a path
  inside someone's home directory
- It is the only command that writes outside `--root`: off by default, every path printed, an
  edited file kept without `--force` (`04_PERMISSIONS.md`, `10_NEVER_ALWAYS.md`)

### Bootstrap, fixed

- The skill and every agent adapter told an agent to run `npx devia init`. Since the package is
  scoped, that resolves to nothing in a repository that has not installed devia: `404 devia@*`.
  They now say `npm i -D @schneiderjoseph/devia && npx devia init`, which is what a cold start
  actually needs. Found while installing the skill system-wide, where the cold start is the
  normal case rather than the exception

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
- `devia --version` prints both versions: the CLI, and the standard it carries
- `devia init` refuses a root it inferred that is not the current directory — `--root` says
  where, `--yes` accepts the detected one; nothing is written before that is settled
- `devia check` scans what git carries: tracked files plus untracked ones that are not ignored.
  An ignored build artefact can no longer fail a P0 gate. Without git, the tree is walked instead
- `.devia/standard/` is vendored together with everything its files link to (`templates/docs/`,
  `templates/github/`, `MIGRATION.md`, `CHANGELOG.md`), so every relative link resolves in the
  adopter's copy; the test walks the materialised tree to prove it
- `devia.json` records the CLI version in `deviaVersion` and the corpus version in
  `standardVersion` — the two move independently
- Closing a registry line splices the row out instead of blanking it, which used to leave a
  blank line that ended the markdown table and orphaned every row below it
- No runtime dependencies

### Enforcement

- CI runs the whole suite on ubuntu and windows, Node 20 and 22: the CLI writes files on both
- `npm publish` re-runs `npm run validate`, the tests and both self-checks (`prepublishOnly`)

### Adopting

```bash
npm install -D @schneiderjoseph/devia && npx devia init
```

Replace `node scripts/production-check.mjs` in CI with `npx devia check`, and add
`npx devia validate`.

The package is scoped, the command is not: npm refused the bare name `devia` as too similar to
existing packages, so installs read `@schneiderjoseph/devia` while everything you type afterwards
stays `devia`.
