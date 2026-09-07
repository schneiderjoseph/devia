# CI/CD — Level 3 Enforcement

## Goal

GitHub must be able to say **NO** to a PR that violates a critical rule.

```text
PR #N
├── Lint / Typecheck / Unit     ✅/❌
├── Integration                 ✅/❌
├── Dependency audit            ✅/❌
├── Secret scan                 ✅/❌
├── Production check (P0)       ✅/❌
├── E2E / smoke                 ✅/❌
└── MERGE BLOCKED on required ❌
```

## Recommended PR pipeline

```text
Format → Lint → Typecheck → Unit → Integration → Dependency audit
 → Secret scan → SAST (as available) → Build → (Docker build/scan)
 → Staging deploy → Smoke/E2E → Production (protected)
```

## P0

1. `main` protected: PR + **required** status checks
2. CI must pass before merge
3. No laptop-copy deploy as the normal path
4. Secret scan + dependency audit required
5. `production-check` required once adopted (FAIL blocks)

## P1

1. Separate staging and production
2. Rollback strategy documented and exercised
3. Migrations gated; expand/contract for destructive changes
4. SAST / container scan as available

## Adopting this standard

1. Copy [`templates/github/workflows/app-ci.yml`](../../../templates/github/workflows/app-ci.yml) → `.github/workflows/ci.yml`
2. Copy `scripts/production-check.mjs` (and optional config)
3. In GitHub → Settings → Branches → require the job names you care about
4. Map maturity target in `MATURITY.md` terms (Silver vs Gold)

Critical control failures **block deployment**, not just “file a ticket”.
