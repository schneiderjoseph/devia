# Checklist — Production readiness

You may call it production only if you can honestly check these:

- [ ] Security reviewed (authn/authz/secrets/headers)
- [ ] Authentication tested
- [ ] Authorization tested (incl. cross-user/tenant)
- [ ] Database migrations tested
- [ ] Backup tested
- [ ] Restore tested
- [ ] Monitoring active
- [ ] Alerts active
- [ ] Error tracking active
- [ ] Logging active
- [ ] CI green
- [ ] Critical E2E/smoke green
- [ ] Dependencies audited
- [ ] Secrets secured
- [ ] HTTPS active
- [ ] Rate limiting active on abuse surfaces
- [ ] Rollback tested or feature-flag kill switch ready
- [ ] Documentation sufficient for operation
- [ ] Environment variables documented
- [ ] Privacy requirements reviewed for this product
- [ ] Disaster recovery notes exist
- [ ] Critical business workflows tested
