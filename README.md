# AI Business Automation — React + Node.js

An end-to-end **human-in-the-loop customer inquiry automation** starter project, designed for development in Google Antigravity or any VS Code-compatible IDE.

## Features
- Customer inquiry intake (web form + REST API)
- Request classification (category, priority, sentiment)
- Local CRM contact upsert and inquiry timeline
- Response drafting (safe, deterministic demo engine)
- Human approval queue for important/high-priority actions
- Audit trail of decisions
- Dashboard with inquiry status and metrics

> **Demo/MVP:** Uses a local JSON datastore and a rules-based draft engine. It does **not** send email or call a paid AI provider. Replace with PostgreSQL, real auth, provider integrations and an LLM before production. The API is not authenticated; do not expose it publicly.

## Quick start
Prerequisites: Node.js 20.19+ or 22+, npm.

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

In a second terminal:
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```
Open http://localhost:5173. API runs on http://localhost:4000.

## Demo workflow
1. Submit an inquiry with name, email, subject and message.
2. The server classifies it, upserts the CRM contact and drafts a response.
3. High-priority or sensitive requests enter `pending_approval`; others become `draft_ready`.
4. Open the dashboard; approve or reject pending drafts.
5. Approved drafts become `approved`, **not sent**. Actual outbound delivery is a future integration.

## API
- `GET /api/health`
- `GET /api/dashboard`
- `GET /api/inquiries`
- `POST /api/inquiries`
- `GET /api/contacts`
- `GET /api/approvals`
- `POST /api/approvals/:id/approve`
- `POST /api/approvals/:id/reject`
- `GET /api/audit`

See `docs/API.md` for request/response details.

## Documentation index
- `docs/PRD.md` — product requirements
- `docs/ARCHITECTURE.md` — components and data flow
- `docs/WORKFLOWS.md` — business workflows and state machine
- `docs/DATABASE.md` — schema and production migration
- `docs/API.md` — REST contracts
- `docs/AI_DESIGN.md` — prompts, classification, safeguards
- `docs/APPROVAL_POLICY.md` — human approval rules
- `docs/SECURITY.md` — security and privacy checklist
- `docs/UI_UX.md` — pages and interface requirements
- `docs/TEST_PLAN.md` — testing and acceptance criteria
- `docs/ROADMAP.md` — milestones
- `docs/DEPLOYMENT.md` — deployment plan
- `docs/ANTIGRAVITY.md` — build instructions for Antigravity
- `docs/AGENTS.md` — agent roles and guardrails
- `docs/TASKS.md` — implementation checklist
- `docs/ENVIRONMENT.md` — environment variables

## Suggested production stack
React + TypeScript + Vite, Node.js + TypeScript + Express, PostgreSQL + Prisma, Redis + BullMQ, OpenAI or another provider behind an abstraction, Gmail/Outlook/WhatsApp connectors, CRM adapter (HubSpot/GoHighLevel/Salesforce), RBAC and audit logs.
