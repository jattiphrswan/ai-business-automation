# Product Requirements Document (PRD)
## Vision
Reduce response time and manual CRM entry while preserving human control of consequential actions.
## Users
Customer, support agent, sales representative, supervisor/admin.
## Core functional requirements
FR-01 Intake inquiries from web form; later email, WhatsApp and website chat.
FR-02 Validate and normalize customer identity, subject and message.
FR-03 Categorize into sales, support, billing, account, general; set priority and confidence.
FR-04 Find or create CRM contact using normalized email and link inquiry.
FR-05 Generate a draft response without inventing prices, guarantees or policies.
FR-06 Route sensitive/high-priority requests to approval queue.
FR-07 Approver can inspect original inquiry and draft, approve or reject with reason.
FR-08 Record state changes in an audit trail.
FR-09 Show status, queue size and basic metrics.
FR-10 Never send external communication without an explicitly configured delivery workflow.
## Non-functional requirements
Accessible keyboard-friendly UI; responsive design; request validation; idempotency for external events; encryption and access control in production; target p95 API response <500ms excluding LLM calls.
## Success measures
Classification precision, median response drafting time, CRM match rate, human approval turnaround, zero unauthorized sends.
## Out of scope for MVP
Production email delivery, live AI model, multi-tenant accounts, external CRM synchronization, SSO, billing.
## Acceptance
High-risk inquiries require approval; a contact is created once per normalized email; every decision is auditable; drafts are not sent.
