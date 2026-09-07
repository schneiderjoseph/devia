# Migrations

## Rules

- Every schema change is a migration committed to git
- Migrations are reviewed like code
- Avoid destructive changes without a expand → backfill → contract plan
- Seed data is separate from migrations

## Agent rule

If you need a new column/table/index: create a migration. Do not “just alter prod”.
