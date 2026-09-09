# 13 — Recipes

> How to do the routine things **in this repository**, in the order that actually works.

## Add a rule

```text
1. Pick the domain directory: rules/<domain>/
2. Pick the next free id in that family — never reuse a retired one
3. Create rules/<domain>/<ID>.md with the frontmatter block from CONTRIBUTING.md
4. Write Requirement, Bad, Good, Validation, Lifecycle
5. npm run build:index          # regenerates the index, coverage and traceability
6. npm run validate             # ids, schema, links, generated files current
7. If the rule is P0, check whether devia check can gate it — if not, say so in validation
8. Update CHANGELOG.md
```

## Change an existing rule

```text
1. Editorial change (clearer wording, better example)  -> edit in place
2. Change of obligation (severity, priority, scope)    -> PR with rationale
3. Replacement                                          -> new id, old one status: superseded,
                                                          superseded_by: <new id>
4. npm run build:index && npm run validate
5. CHANGELOG.md: say whether adopters need devia sync
```

## Add a CLI command

```text
1. src/commands/<name>.mjs exporting default async (ctx, command) => exit code
2. Register it in the COMMANDS table and the help text in src/cli.mjs
3. Support --help and --root; use ctx.json for machine output
4. Add a test in tests/cli.test.mjs that drives it through bin/devia.mjs
5. Update .devia/02_SURFACES.md in the same change
```

## Change what `devia init` writes

```text
1. Edit templates/project/ (or templates/agents/)
2. Placeholders: {{PROJECT_NAME}}, {{DEVIA_VERSION}}, {{DATE}}; unfilled content is marked with
   the token that `validate` counts (see REQUIRED_MEMORY and PLACEHOLDER there)
3. If a new memory file is required, add it to REQUIRED_MEMORY in src/commands/validate.mjs
4. npm test   # the materialised-link test covers template links
5. CHANGELOG.md: does an existing adopter need to act, or is devia sync enough?
```

## Run the checks

```bash
npm run validate                  # rules, links, generated files
npm test                          # unit + CLI behaviour
node bin/devia.mjs check --root . # the standard passes its own gates
node bin/devia.mjs validate       # this repository's own memory
```

## Release

The two versions move independently: `package.json` is the CLI, `VERSION` is the standard. Bump
only the one that actually changed — an adopter pins the standard and reports the CLI.

```text
1. Bump package.json version, and standard_version in VERSION if the corpus moved
2. Update CHANGELOG.md: what changed, and whether `devia sync` is enough for an adopter
3. npm run validate && npm test && node bin/devia.mjs check --root . && node bin/devia.mjs validate
4. npm pack --dry-run          # read the file list: what is missing here is missing for everyone
5. npm login                   # once per machine
6. npm publish                 # prepublishOnly re-runs validate + test
7. git tag v<version> && git push --tags
8. Smoke test the published tarball, not the working tree:
     cd $(mktemp -d) && npm init -y && npm i devia@<version>
     npx devia init && npx devia validate && npx devia doctor
```

Step 8 is the one that catches a `files` entry left out of `package.json`: the working tree has
the file, the tarball does not, and only a real install tells them apart.

Every recipe ends with the memory update it implies. That is what makes `MEM-009` mechanical
rather than virtuous.
