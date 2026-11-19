# Workflows
## Inquiry lifecycle
`received -> classified -> contact_upserted -> drafted -> pending_approval | draft_ready -> approved | rejected -> [future: sent]`
The MVP processes the first four steps synchronously and stores the resulting state.
## Important-action approval
High priority or sensitive keywords -> `pending_approval`. Reviewer sees original message and draft; approves or rejects. Rejections require a reason. Approved means authorized draft, not delivered.
## Future workflow nodes (n8n/visual workflow)
1. Webhook Trigger (inquiry received)
2. Validate Payload
3. Normalize Email
4. Deduplicate Event (idempotency key)
5. CRM Search Contact
6. IF Found? -> Update Contact / Create Contact
7. AI Classification
8. Structured Output Validation
9. IF Sensitive or Low Confidence? -> Human Approval
10. AI Draft Response
11. Policy/PII Check
12. Save Draft to CRM
13. Approval Trigger (for important actions)
14. Wait for Approval / Rejection
15. IF Approved? -> Send via selected provider / Return for edits
16. Update CRM Activity
17. Append Audit Event
18. Notify Team / Error Handler
## Failure branches
Invalid input -> 400; provider timeout -> retry with backoff; duplicate event -> return existing result; AI invalid JSON -> fallback manual review; failed send -> dead-letter queue and alert.
