# 04 — Permissions

> This project has no users, no sessions and no authorization. What it has instead is authority
> over other people's repositories, and that is where the care goes.

## What the CLI is allowed to touch

| Allowed | Never |
|---|---|
| Create and update files under `<root>/.devia/` | Write outside `--root` |
| Write the agent adapters at the repository root | Overwrite a file the user has edited, without `--force` |
| Read files in the target repository to produce evidence | Send anything over the network |
| Replace `.devia/standard/` wholesale on `sync` | Touch the project's own memory content on `sync` |

`init` keeps every existing memory file unless `--force` is passed, because those files hold
decisions the tool did not make.

## Destructive operations

| Operation | Where | Guard |
|---|---|---|
| `rm -rf .devia/standard` before re-vendoring | `init`, `sync` | Only that one directory, which the tool owns |
| Overwriting memory files | `init --force` | Off by default, warned about in the output |
| Removing a registry line | `gap`/`debt close` | Moves the line to the closed table, never deletes it |

## Repository permissions

| Action | Who |
|---|---|
| Merge to `main` | The maintainer, through a pull request (`OPS-002`) |
| Add or change a rule | Anyone, through the rule-change template and review |
| Publish to npm | The maintainer |

## Audited actions

There is no audit log. The equivalent trail is git history plus `CHANGELOG.md`, which is why a
rule change without a changelog entry is a review failure rather than a small omission.
