# 06 — Integrations

> External services this project depends on. Secret **names** only — never values (`SEC-002`).

| Service | Used for | Credential | Failure behaviour |
|---|---|---|---|
| npm registry | Publishing the `devia` package | npm token, held by the maintainer, never in the repository | Publish fails; nothing else is affected |
| GitHub Actions | CI on every pull request | `GITHUB_TOKEN`, provided by the platform | The merge is blocked, which is the point |
| gitleaks action | Secret scanning in the adopter CI template | `GITHUB_TOKEN` | The template job fails; adopters may substitute a scanner |

## Runtime

The CLI makes **no network requests** and has **no runtime dependencies**. It reads and writes
the local filesystem and shells out to `git` only in `doctor`, where a missing or failing `git`
degrades to `SKIP` rather than an error.

## Webhooks in

None.

## When one is down

| Service | Effect |
|---|---|
| npm | Existing installs keep working from `node_modules`; nothing new can be fetched. `npx devia` with nothing installed never resolves anyway — the published name is scoped |
| GitHub Actions | No merges until it returns — gates are not bypassed to unblock work (`OPS-003`) |
| git absent | `devia doctor` reports staleness as `SKIP`, every other command is unaffected |
