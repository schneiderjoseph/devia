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
- The project template shipping insecure defaults
- Rule content that would make an adopting project less safe if followed

Out of scope:

- Vulnerabilities in a project that adopted devia — those belong to that project
- Disagreement with a rule's severity or priority: open a rule-change issue instead

## What this tool does with your code

`devia` runs locally, makes no network requests, and has no runtime dependencies. `devia check`
reads files in the target repository to produce evidence; it does not transmit them anywhere.

The secret scanner is a coarse pattern match. A clean result means those patterns were not found
— it is not proof that no secret is committed (`SEC-002` still applies, and a dedicated scanner
belongs in CI).
