# Test Plan
## Manual smoke tests
1. Start both servers; dashboard loads without errors.
2. Submit a sales inquiry; status is `draft_ready`.
3. Submit "urgent refund" inquiry; status is `pending_approval`.
4. Approve pending inquiry; status changes to `approved`.
5. Reject another inquiry with a reason; status changes to `rejected`.
6. Submit twice with same email; CRM contacts count increases only once.
7. Submit invalid email; API responds 400.
8. Attempt to approve an already-approved item; API responds 409.
9. Verify audit log records create/approve/reject events.
10. Refresh page; data persists in JSON store.
11. Verify no outbound messages were sent.
## Automated tests to add
Unit: classifier, approval policy, schema validation. Integration: API status transitions, deduplication, persistence. E2E: Playwright form -> queue -> approve. Security: authorization, tenant boundaries, prompt injection, webhook replay. Performance: concurrent intake and queue processing.
## Release gates
No high-risk bypasses, passing auth tests, backups tested, no plaintext secrets, observability active, signed webhooks verified.
