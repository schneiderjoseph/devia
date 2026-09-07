# Database

Treat the database as a critical production component — not a dumping ground.

## P0

1. Versioned migrations only — **no manual production schema edits**
2. Primary keys, foreign keys, and essential constraints exist
3. Tenant/user ownership enforced in queries (or RLS)
4. Automated backups exist **and restore has been tested**
5. Connection pooling configured before “scale the DB” theater

## P1

1. Indexes justified by real query paths; eliminate obvious N+1
2. Transactions around multi-step critical writes
3. Pagination on large lists
4. Expand/contract compatible migrations for breaking changes

## Detect

- Schema drift between environments
- Missing FKs “for speed”
- Untested backups

## Verify

- Migrate from empty DB to head successfully
- Restore latest backup into staging and boot the app
- Cross-tenant read test fails closed
