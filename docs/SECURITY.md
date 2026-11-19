# Security and Privacy
## Required before production
- Authentication (OIDC/SSO) and server-enforced RBAC.
- Tenant isolation; per-record authorization.
- Rate limiting, CAPTCHA/abuse prevention for public intake.
- Encrypt data in transit and at rest; secrets manager; key rotation.
- Signed webhook verification and replay protection.
- Input validation and output encoding; CSP and secure cookies.
- PII minimization, retention/deletion workflow, consent and privacy notice.
- Audit logs protected from modification; no secrets/PII in operational logs.
- Prompt-injection defenses and tool permission boundaries.
- CRM/provider scopes restricted to least privilege.
- Backups, incident response, dependency scanning and regular security tests.
## MVP warning
This starter has no authentication and stores customer data in plaintext JSON. Use synthetic data only. Do not expose the API on the internet or connect real customer channels until security controls are implemented.
