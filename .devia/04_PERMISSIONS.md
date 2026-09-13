# 04 — Permissions

> This project has no users, no sessions and no authorization. What it has instead is authority
> over other people's repositories, and that is where the care goes.

## What the CLI is allowed to touch

| Allowed | Never |
|---|---|
| Create and update files under `<root>/.devia/` | Write outside `--root`, except `skills install --global` |
| Write the agent adapters at the repository root | Overwrite a file the user has edited, without `--force` |
| Read files in the target repository to produce evidence | Send anything over the network, except `contribute submit --yes` |
| Replace `.devia/standard/` wholesale on `sync` | Touch the project's own memory content on `sync` |
| Copy a named file into a contribution fixture, sanitized | Copy a file into a fixture that the user did not name |

`init` keeps every existing memory file unless `--force` is passed, because those files hold
decisions the tool did not make.

`skills install --global` is the single exception to the boundary: it installs the contract in
each agent's own configuration directory so it applies to every project. It is off by default,
it prints every path it writes, it keeps an edited file without `--force`, and for agents whose
user-level location cannot be determined it reports `SKIP` with the reason rather than guessing
a path inside someone's home directory.

A file the agent owns and devia adds to (`~/.claude/skills/`, `~/.codex/skills/`,
`~/.cursor/rules/`) is written freely. A file the **user** owns and devia would replace
(`~/.gemini/GEMINI.md`) is written only when absent or empty; otherwise `SKIP` says so and the
content stays. `--force` overrides both, and says which paths it took.

## What may leave the machine

`devia contribute` is the only feature that can publish anything, and it is built so that the
answer to "what did it send" is always a file the user read first.

| Never leaves | Leaves only through `submit --yes` |
|---|---|
| The repository's source, unless a file is named with `--include` | A sanitized minimal fixture the contributor built |
| An environment file — refused outright, never sanitized and copied | The devia version, standard version, node and platform |
| Secrets, tokens, email addresses, IP addresses, the home directory, the account name, the repository path | The gate or rule involved, and the expected and actual behaviour |
| Dependency lists, private filenames, git history | The regression test's path, when there is one |

Four gates stand between a candidate and a request:

```text
eligible          devia itself reproduced it, and there is a minimal case (AGT-012)
clean             the finished payload is re-scanned; a surviving secret shape blocks, not warns
authorised        --yes, given per submission, never remembered
attributed        an identity declared in devia.json, refused if it is the maintainer's,
                  and checked against the account gh is actually authenticated as
```

devia stores no token and reads none from the environment. It does not commit, branch or push in
anyone's checkout: a pull request is opened only against a branch the contributor already pushed.
`"contribution": { "enabled": false }` in `devia.json` turns the whole feature off, local
commands included.

## Destructive operations

| Operation | Where | Guard |
|---|---|---|
| `rm -rf .devia/standard` before re-pinning | `init --vendor`, `sync` | Only that one directory, which the tool owns |
| Overwriting memory files | `init --force` | Off by default, warned about in the output |
| Removing a registry line | `gap`/`debt close` | Moves the line to the closed table, never deletes it |
| `rm -rf` a contribution candidate | `contribute rm` | Only that candidate's directory, which the tool owns |
| Rebuilding a contribution fixture | `contribute repro --force` | Off by default; without it the existing fixture is kept |

## Repository permissions

| Action | Who |
|---|---|
| Merge to `main` | The maintainer, through a pull request (`OPS-002`) |
| Add or change a rule | Anyone, through the rule-change template and review |
| Publish to npm | The maintainer |

## Audited actions

There is no audit log. The equivalent trail is git history plus `CHANGELOG.md`, which is why a
rule change without a changelog entry is a review failure rather than a small omission.
