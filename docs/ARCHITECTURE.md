# Architecture
## MVP diagram
```mermaid
flowchart LR
  C[Customer web form] --> UI[React Vite UI]
  UI --> API[Node Express API]
  API --> V[Zod validation]
  V --> CLASS[Rule classifier]
  CLASS --> CRM[Contact upsert]
  CRM --> DRAFT[Draft generator]
  DRAFT --> GATE{Approval needed?}
  GATE -->|Yes| QUEUE[Pending approval]
  GATE -->|No| READY[Draft ready]
  QUEUE --> REVIEW[Human review]
  REVIEW --> AUDIT[Audit log]
  API --> STORE[(Local JSON store)]
```
## Production reference
React/TypeScript -> API gateway -> Node/TypeScript -> PostgreSQL/Prisma; Redis/BullMQ for asynchronous processing; LLM adapter for classification/drafting; provider adapters for email, WhatsApp and CRM; auth with RBAC; OpenTelemetry logs and metrics.
## Boundaries
UI never holds provider secrets. API validates all payloads. Workflow engine owns transitions. CRM adapter owns deduplication and external IDs. Delivery adapter sends only after policy checks and explicit authorization.
## Important MVP limitations
JSON file storage is single-process only; no concurrency guarantees or migrations. Authentication, rate limiting, retries and outbound integration are not implemented. Do not deploy publicly as-is.
