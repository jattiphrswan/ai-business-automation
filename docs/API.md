# REST API — MVP
Base: `http://localhost:4000/api`. JSON request and response.
## POST /inquiries
```json
{"name":"Jane Smith","email":"jane@example.com","subject":"Urgent refund request","message":"I need help with a refund for my order."}
```
Returns HTTP 201 with inquiry, classification, draft and status. Invalid data returns 400.
## GET /inquiries
Returns all inquiries, newest first.
## GET /contacts
Returns CRM contacts.
## GET /approvals
Returns inquiries with `pending_approval` status.
## POST /approvals/:id/approve
Body `{}`. Returns updated inquiry. Only pending inquiries can transition; otherwise 409.
## POST /approvals/:id/reject
Body `{"reason":"Need billing verification"}`. Reason required. Returns updated inquiry.
## GET /dashboard
Returns `{ "total": 0, "pending": 0, "approved": 0, "contacts": 0 }`.
## GET /audit
Returns audit events.
## GET /health
Returns `{ "ok": true, "mode": "demo" }`.
## Future API design
Use bearer auth, pagination, request IDs, idempotency keys, PATCH draft editing, role-based permissions, OpenAPI schema and webhook signature validation.
