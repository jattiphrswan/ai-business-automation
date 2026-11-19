# Deployment Guide
## Local development
Follow root README. Use synthetic data only.
## Recommended production topology
Frontend on Vercel/Netlify or CDN; backend on managed Node service; PostgreSQL managed database; Redis worker; secrets manager; managed logging and alerts.
## Release checklist
1. Replace JSON store with PostgreSQL.
2. Add auth, RBAC, tenant scoping, rate limiting and abuse prevention.
3. Add HTTPS, domain, CORS allowlist and secure headers.
4. Configure environment variables in secret manager.
5. Add migrations, backups and rollback plan.
6. Set up CI test/build/dependency scans.
7. Configure provider credentials with least privilege.
8. Verify approval policy and end-to-end tests.
9. Add uptime, queue, failure and cost alerts.
10. Launch to staging with synthetic data before production.
## Health endpoint
`GET /api/health`; add DB/queue readiness checks for production.
