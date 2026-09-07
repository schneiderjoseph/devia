# Backups & restore

> A backup that has never been restored successfully is not a backup.

## P0

1. Automated database backups
2. Defined retention
3. Restore procedure documented
4. Restore tested on a schedule (and after major version upgrades)

## P1

1. Off-site / separate-account storage when risk warrants
2. Backup encryption
3. File/object storage backups if user content exists
4. Explicit RPO / RTO targets (example: RPO 15m, RTO 1h)

See [`checklists/disaster-recovery.md`](../../../checklists/engineering/disaster-recovery.md).
