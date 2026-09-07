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
5. What is decided but not built?
6. What is not decided at all?
7. How do I do the routine task I am about to do?

A memory file that cannot answer its question in a scan is too long or too vague.

## The two registries

They are different things and must never be merged.

| Registry | Means | Failure it prevents |
|---|---|---|
| `11_GAPS.md` | **Undecided.** Nobody has ruled on it. | The agent quietly picks an answer and encodes it as truth |
| `12_DEBT.md` | **Decided, not built.** The rule exists; the code does not honour it yet. | "We know about it" — knowledge that leaves no trace and never gets scheduled |

Discipline for both:

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
