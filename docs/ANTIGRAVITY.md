# Google Antigravity — Project Instructions
## Open project
Unzip this project, open the root folder in Antigravity, read README and docs before changing code. Start backend and frontend in separate terminals.
## Recommended agent prompt
"You are the lead full-stack engineer for AI Business Automation. Read README.md and every file in docs/. Preserve the human-approval gate and never send a customer response automatically. Build production-ready improvements incrementally using React + TypeScript + Vite and Node.js + TypeScript + Express. First implement PostgreSQL/Prisma, auth/RBAC and tests; then real AI provider and CRM adapters. Keep secrets server-side, validate every API input, add audit logs and write tests for each workflow. Provide changed files, commands run, test results and outstanding risks. Ask before performing any external send or destructive migration."
## Suggested agent execution order
1. Inspect existing code and run the MVP.
2. Create a branch and document baseline.
3. Convert backend to TypeScript.
4. Add PostgreSQL/Prisma with migration and repository layer.
5. Add login and RBAC.
6. Add Vitest/Supertest and Playwright tests.
7. Implement configurable approval policy.
8. Implement LLM provider abstraction with mock fallback.
9. Add CRM and channel adapters behind feature flags.
10. Add production deployment pipeline.
## Agent completion criteria
Show tests, build output, migration plan, updated docs and security implications. Never report external delivery unless independently verified.
