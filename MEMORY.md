# Living memory

The part of devia that is not a rulebook. `.devia/` is what an agent reads to stop being a
stranger to the project.

```text
docs/       long specifications — the source of truth for details
.devia/     short indexed memory — what exists, where it is, what is decided, what is not
code        the only thing that is true by construction
```

`.devia/` points into the other two. It never copies them.

## What memory must answer in under a minute

1. What is this project, and what is it built with?
2. How is it organised, and what boundaries must not be crossed?
3. What surfaces exist (pages, endpoints, jobs), and where do they live?
4. What has this project already banned, and why?
5. What has been **ruled on** — and by whom?
6. What is decided but not built?
7. What is not decided at all?
8. How do I do the routine task I am about to do?

A memory file that cannot answer its question in a scan is too long or too vague.

## An undefined decision is not an implicit permission

This is the whole of it, and everything below is machinery for it.

An agent that meets a hole in the project does the reasonable thing, which is the wrong thing:

```text
information missing
       ↓
reasonable assumption
       ↓
implementation
       ↓
the project now has a policy nobody chose
```

The purple-gradient landing page is the visible case. The invisible ones are worse: a framework
major picked by whatever the scaffolder emitted, an indexing policy inherited from a template, a
rounding rule that became load-bearing in six months. In every one of them the failure is the
same — **a missing answer was read as a free choice.**

So the memory names a fourth state, and the machinery refuses to collapse it into the others:

```text
information missing
       ↓
PENDING — recorded, owned, visible in every context the agent receives
       ↓
human decision  OR  explicit, bounded delegation
       ↓
implementation
```

## The three registries

They are different things and must never be merged.

| Registry | Means | Failure it prevents |
|---|---|---|
| `decisions.yaml` | **The questions this kind of project always has.** Enumerated before the work starts. | The agent answers one of them on the project's behalf, silently |
| `11_GAPS.md` | **Undecided.** A question somebody hit while working; nobody has ruled on it. | The agent quietly picks an answer and encodes it as truth |
| `12_DEBT.md` | **Decided, not built.** The rule exists; the code does not honour it yet. | "We know about it" — knowledge that leaves no trace and never gets scheduled |

The register and the gap registry both mean *undecided*; what separates them is who found the
question. The register holds the **known** unknowns — a brand, a stack version, an indexing
policy — which a project of this kind owes an answer to whether or not anyone has thought about
them yet. The gap registry holds the ones nobody saw coming. Seeding the first from the profile
is what makes an absence visible **before** an agent stands in front of it.

### Four states, not three

| Status | Means | What an agent may do |
|---|---|---|
| `decided` | A human ruled. | Implement it. Never reverse it quietly. |
| `pending` | Nobody has ruled. | Build around it. Never answer it. |
| `delegated` | The agent may choose, inside `bounded_by`. | Choose — inside those bounds and nowhere else. |
| `not_required` | Deliberately not needed here. | Do not add one. |

`not_required` earns its place by being a decision. "This product ships no photography" is a
ruling, and folding it into `pending` would leave a permanent false alarm on a project that has
already answered. **Absence of information and absence of need are not the same fact.**

A delegation with no bounds is not delegation. It is absence wearing the word "explicit", and
`devia validate` fails it (`DEC-002`).

### Discipline for the two line-based registries

- A decided `MUST` that the code violates is a **debt line**, not a shared understanding.
- You **add** the line even when you are not going to fix it.
- You **remove** the line in the same change that discharges it — never before, never later.
- Partly done means you **reduce** the line, not delete it.
- IDs are monotone and never reused. `G12` always means the same thing forever.
- A false line is worse than a missing one. Verify before you record.
- Closing a line requires naming the change that closed it.

## Sweep discipline

A registry fed only by accident gives false confidence: it looks like a map of the problems and
is actually a map of what somebody happened to notice.

So: a change that touches a **shared surface** sweeps that surface.

```text
Touched schema     → sweep the tables you touched for rules they violate
Touched a route    → sweep the routes on that resource
Touched a port     → sweep every implementation of it
Touched a token    → sweep the components consuming it
```

Record what the sweep found. "Found nothing" is a valid, useful result — say it.

## The impact map

`.devia/impact-map.yaml` is the mechanical part: change type → files that must be updated in the
same change. It is what makes "update the memory" a check instead of a virtue.

```yaml
new_table:        ["03_DATA_MODEL.md", "docs/DATABASE.md"]
new_endpoint:     ["02_SURFACES.md"]
permission_change:["04_PERMISSIONS.md", "docs/PERMISSIONS.md"]
new_integration:  ["06_INTEGRATIONS.md"]
design_token:     ["07_DESIGN.md"]
architecture:     ["01_ARCHITECTURE.md"]
stack_change:     ["00_OVERVIEW.md", "01_ARCHITECTURE.md"]
```

Extend it as the project grows a surface. An impact map that never changes is not being used.

## No perishable facts

Overview and index files describe what the project **is**, not where the work happens to be
this week.

```text
Ban:   "42 tests passing", "next we build the invoice screen", "currently on branch feat/x"
Keep:  "payments are escrowed until a release trigger fires (see docs/ESCROW.md §3)"
```

Perishable facts belong to the registries and the tracker, which have owners and lifecycles.
Anything with a countdown in it rots into a lie and takes the credibility of the file with it.

## Never / always grows from incidents

`10_NEVER_ALWAYS.md` is not brainstormed up front. Each line earns its place by being a mistake
that actually happened, or a decision that was actually contested.

```text
Bug or bad agent change happens
        ↓
Fix it
        ↓
Add ONE never/always line naming the trap and the correct move
```

Lines that were never violated by anyone are noise, and noise trains agents to skim.

## Freshness

Memory that lags the code is a trap: it is trusted precisely because it looks maintained.

- `devia validate` checks the structure, the registries, and the placeholders
- `devia doctor` compares the last commit that touched the code with the last commit that
  touched `.devia/`, and reports the drift
- CI runs both; a change that moves a surface without touching the memory fails review

## Ownership

Humans own the decisions. Agents own keeping the record of them true.

An agent may never remove a gap or a debt line to make a report look better, downgrade a `MUST`
without a waiver, or quietly rewrite a decision it disagrees with. It may — and should — flag
that the memory contradicts the code, because that is the single highest-value thing it can
notice.
