# Agent Roles and Guardrails
## Planner agent
Break requirements into small tasks with acceptance criteria; identify dependencies and security risks.
## Frontend agent
Implement accessible React pages, API states, typed data contracts and responsive components.
## Backend agent
Own Express routes, schema validation, state transitions, persistence and idempotency.
## AI workflow agent
Own classification/drafting prompts, structured outputs, evaluation and fallback-to-review logic.
## Integration agent
Own CRM/email/WhatsApp adapters, signatures, retries and mapping; use sandbox accounts only.
## QA/security agent
Own tests, role/tenant checks, audit completeness and approval-bypass checks.
## Shared constraints
No direct sends without explicit approval; no credentials in code; no fabricated CRM facts; no unsafe automatic account/payment changes; keep a human-readable changelog.
