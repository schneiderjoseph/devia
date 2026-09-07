# 07 — Design

> This project has no graphical interface. Its interface is a terminal and a set of markdown
> files, and both are designed on purpose.

## Terminal output

| Element | Rule |
|---|---|
| Status tags | `PASS` · `WARN` · `FAIL` · `SKIP` · `INFO`, always in that vocabulary |
| Colour | Never the only carrier of meaning — the tag word says it too (`UI-004` applies here) |
| No colour | Honoured: `NO_COLOR`, a non-TTY stream, `TERM=dumb` |
| Detail | Every non-PASS line names the reason and, where one exists, the rule id |
| Default verbosity | Failures and warnings; passes only with `--all` or `--verbose` |
| Machine output | `--json` on `validate`, `check`, `rules` — the same data, no styling |

Implementation: `src/lib/ui.mjs`. Commands print their own report and return an exit code; they
never call `process.exit` themselves.

## Documents

| Convention | Value |
|---|---|
| Tone | Direct, second person for the agent, no marketing |
| Structure | A table wherever the content is a list of things with the same shape |
| Rule body | Requirement, then a **Bad** and a **Good** example a reader can picture |
| Code blocks | `text` for diagrams and flows, `bash` for commands, `yaml`/`json` for shapes |
| Line width | Wrapped around 100 characters so diffs stay readable |
| Emoji | None |
| Attribution | No tool or model names anywhere in the repository |

## Patterns fixed for this project

- Every command supports `--help` and prints the same shape of help.
- Every command accepts `--root` so it can be pointed at another repository.
- A check that cannot determine an answer is `SKIP` with the reason, never `PASS`.
- Reports end by naming what was not verified, in the tool as in the contract.
