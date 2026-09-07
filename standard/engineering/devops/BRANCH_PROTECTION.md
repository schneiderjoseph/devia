# Branch protection (enforcement checklist)

On `main` (GitHub → Settings → Branches):

- [ ] Require a pull request before merging
- [ ] Require status checks to pass
- [ ] Require branches to be up to date (recommended)
- [ ] Required checks include at least:
  - [ ] Lint · Typecheck · Unit
  - [ ] Dependency audit
  - [ ] Secret scan
  - [ ] Production check (P0) — when adopted
  - [ ] E2E / smoke — for release-critical repos
- [ ] Restrict who can push / bypass (no casual admin bypass)
- [ ] Do not allow bypassing without break-glass policy

Without required checks, Level 3 does not exist — only theater.
