# Security

## Reporting a vulnerability

Report privately through GitHub Security Advisories on
[`schneiderjoseph/devia`](https://github.com/schneiderjoseph/devia/security/advisories/new).
Do not open a public issue for an exploitable defect.

Include what the CLI did, what you expected, the version (`npx devia --version`), and the
smallest reproduction you have.

## Scope

In scope:

- The `devia` CLI: path handling, file writes outside the target repository, the secret scanner
  reporting a false clean result
- Anything reaching the network that `--yes` did not authorise, or any content in a contribution
  payload that the sanitizer should have removed
- The project template shipping insecure defaults
- Rule content that would make an adopting project less safe if followed

A security defect found through `devia contribute` is routed to this page and refused as an issue
or a pull request, whatever its evidence. Report it privately.

Out of scope:

- Vulnerabilities in a project that adopted devia — those belong to that project
- Disagreement with a rule's severity or priority: open a rule-change issue instead

## What this tool does with your code

`devia` runs locally and has no runtime dependencies. `devia check` reads files in the target
repository to produce evidence; it does not transmit them anywhere.

**One command can reach the network, and only when you say so.** `devia contribute submit --yes`
asks the GitHub CLI to open an issue or a pull request against the devia repository. Everything
else in the contribution flow — recording, reproducing, verifying, building the payload — is
local, and `submit` without `--yes` writes the payload and prints the `gh` command instead of
running it.

What that payload may contain is deliberately narrow:

- a standalone minimal reproduction the contributor wrote, not a copy of your repository
- devia's version, the standard version, node and platform
- the gate or rule involved, and the expected and actual behaviour

Files you name with `--include` are sanitized on the way into the fixture: secrets, credential
assignments, email addresses, IP addresses, the home directory, the account name and the
repository path are replaced, and the redactions are reported. An environment file is refused
outright rather than sanitized and copied. The finished payload is re-scanned, and a surviving
secret shape blocks the upload rather than warning about it.

devia stores no GitHub token and reads none from the environment. It publishes only under an
identity declared in `.devia/devia.json`, refuses the maintainer's account, and refuses to
proceed when `gh` is authenticated as somebody else. It does not commit, branch or push in your
checkout.

Turn the whole feature off with `"contribution": { "enabled": false }` in `.devia/devia.json`.
Doing nothing also sends nothing: there is no default identity, so `--yes` has nothing to
publish under.

The secret scanner is a coarse pattern match. A clean result means those patterns were not found
— it is not proof that no secret is committed (`SEC-002` still applies, and a dedicated scanner
belongs in CI).
