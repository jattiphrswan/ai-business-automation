# Human Approval Policy
## Always require review
Refunds, payment changes, legal threats, privacy/data deletion, account access, security incidents, contract cancellation, financial commitments, sensitive complaints, and any low-confidence classification.
## Roles
Agent: view and draft. Approver: approve/reject. Admin: configure policy. Production API must enforce roles server-side.
## Approval process
Show original inquiry, customer CRM context, proposed reply, risk flags, model/prompt version and edit history. Approver may edit, approve or reject with reason. Log actor, timestamp, decision and exact draft version.
## Hard rules
No self-approval for high-impact actions where separation of duties is required. Never auto-send when a human review is pending. An approval for a draft does not authorize unrelated CRM edits, payments or data deletion. Expire stale approvals and re-review material edits.
## MVP behavior
Approve/reject is a demo action without login; approved drafts are not sent. Replace before production.
