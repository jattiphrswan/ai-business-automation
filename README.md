# AI Business Automation — React + Node.js

An end-to-end **human-in-the-loop customer inquiry automation** project with a modern React UI and Node.js Express API.

## Features
- **Customer Inquiry Intake:** Form submission + REST API with schema validation.
- **AI Classification & Triage:** Automatic category routing, priority level, and sensitivity detection.
- **Local CRM Sync:** Contact upsert and inquiry timeline tracking.
- **Automated Response Drafting:** Safe, deterministic response generation.
- **Human Approval Safeguard:** Escalation queue for high-priority/sensitive requests before delivery.
- **Audit Logging:** Traceable log of decisions and inquiries.
- **Modern Responsive Dashboard:** Built with React, TypeScript, and Lucide icons.

## Quick Start

### 1. Backend API Server
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```
API runs on `http://localhost:4000`.

### 2. Frontend Client
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```
Client runs on `http://localhost:5173`.

## API Endpoints
- `GET /api/health` — Service health check
- `GET /api/dashboard` — Summary metrics (total, pending, approved, contacts)
- `GET /api/inquiries` — List all inquiries
- `POST /api/inquiries` — Submit new inquiry (triggers classification & draft)
- `GET /api/contacts` — List CRM contacts
- `GET /api/approvals` — Inquiries awaiting human approval
- `POST /api/approvals/:id/approve` — Approve response draft
- `POST /api/approvals/:id/reject` — Reject response draft (requires reason)
- `GET /api/audit` — Audit event trail
