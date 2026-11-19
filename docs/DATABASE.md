# Data Model
## MVP JSON collections
`contacts`: id, name, email, createdAt, updatedAt.
`inquiries`: id, contactId, name, email, subject, message, classification {category,priority,requiresApproval,confidence,method}, draft, status, createdAt, updatedAt.
`audit`: id, type, entityId, detail, at.
## Production PostgreSQL tables
`users(id, email, password_hash/identity_provider, role, created_at)`
`organizations(id, name, created_at)`
`contacts(id, organization_id, external_crm_id, name, email_normalized, phone, created_at, updated_at)`
`inquiries(id, organization_id, contact_id, source, external_event_id, subject, body, category, priority, status, created_at, updated_at)`
`drafts(id, inquiry_id, body, model, prompt_version, version, created_at)`
`approvals(id, inquiry_id, draft_id, reviewer_id, decision, reason, decided_at)`
`audit_events(id, organization_id, actor_id, action, entity_type, entity_id, metadata_json, created_at)`
`outbound_messages(id, inquiry_id, provider, provider_message_id, status, approved_by, sent_at)`
## Constraints
Unique `(organization_id, email_normalized)` for contacts where appropriate; unique `(organization_id, source, external_event_id)` for webhook dedupe; FK constraints; indexes on status, priority, created_at; tenant scoping on every query.
## Migration
Replace readStore/writeStore with Prisma repository interfaces, add transactions, backfills, migration tests and retention policies.
