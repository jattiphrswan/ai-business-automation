import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import crypto from 'node:crypto';
import { z } from 'zod';
import { readStore, writeStore, logAudit } from './services/store.js';
import { classify, draftResponse } from './services/automation.js';

const app = express();
const port = Number(process.env.PORT || 4000);
const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

app.use(helmet());
app.use(cors({ origin: frontendOrigin, credentials: true }));
app.use(express.json({ limit: '64kb' }));

// Input validation schema
const inquirySchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(120),
  email: z.string().trim().email('Invalid email address').max(255),
  subject: z.string().trim().min(3, 'Subject must be at least 3 characters').max(200),
  message: z.string().trim().min(10, 'Message must be at least 10 characters').max(5000),
});

// System & Metrics
app.get('/api/health', (_req, res) => res.json({ ok: true, mode: 'demo', timestamp: new Date().toISOString() }));

app.get('/api/dashboard', (_req, res) => {
  const store = readStore();
  const pending = store.inquiries.filter((item) => item.status === 'pending_approval').length;
  const approved = store.inquiries.filter((item) => item.status === 'approved').length;
  res.json({
    total: store.inquiries.length,
    pending,
    approved,
    contacts: store.contacts.length,
  });
});

// Inquiries & Contacts
app.get('/api/inquiries', (_req, res) => res.json(readStore().inquiries));
app.get('/api/contacts', (_req, res) => res.json(readStore().contacts));
app.get('/api/approvals', (_req, res) => {
  const store = readStore();
  res.json(store.inquiries.filter((item) => item.status === 'pending_approval'));
});
app.get('/api/audit', (_req, res) => res.json(readStore().audit));

// Create Inquiry (Intake -> Classify -> Local CRM Upsert -> Draft Response)
app.post('/api/inquiries', (req, res) => {
  const parsed = inquirySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', issues: parsed.error.flatten() });
  }

  const store = readStore();
  const data = parsed.data;
  const now = new Date().toISOString();

  // Upsert CRM contact
  let contact = store.contacts.find((c) => c.email.toLowerCase() === data.email.toLowerCase());
  if (!contact) {
    contact = { id: crypto.randomUUID(), name: data.name, email: data.email, createdAt: now, updatedAt: now };
    store.contacts.unshift(contact);
  } else {
    contact.name = data.name;
    contact.updatedAt = now;
  }

  // Classify inquiry & draft response
  const classification = classify(data.subject, data.message);
  const status = classification.requiresApproval ? 'pending_approval' : 'draft_ready';

  const inquiry = {
    id: crypto.randomUUID(),
    ...data,
    contactId: contact.id,
    classification,
    draft: '',
    status,
    createdAt: now,
    updatedAt: now,
  };

  inquiry.draft = draftResponse(inquiry, classification);
  store.inquiries.unshift(inquiry);

  logAudit(store, 'inquiry_created', inquiry.id, {
    category: classification.category,
    priority: classification.priority,
    status: inquiry.status,
  });

  writeStore(store);
  res.status(201).json(inquiry);
});

// Human-in-the-loop decisions (Approve / Reject)
function handleDecision(req, res, decision) {
  const store = readStore();
  const inquiry = store.inquiries.find((item) => item.id === req.params.id);

  if (!inquiry) return res.status(404).json({ error: 'Inquiry not found' });
  if (inquiry.status !== 'pending_approval') {
    return res.status(409).json({ error: 'Inquiry is not pending approval' });
  }

  const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim().slice(0, 500) : '';
  if (decision === 'rejected' && !reason) {
    return res.status(400).json({ error: 'Rejection reason is required' });
  }

  inquiry.status = decision;
  inquiry.updatedAt = new Date().toISOString();
  if (reason) inquiry.decisionReason = reason;

  logAudit(store, `draft_${decision}`, inquiry.id, { reason, actor: 'human-reviewer' });
  writeStore(store);
  res.json(inquiry);
}

app.post('/api/approvals/:id/approve', (req, res) => handleDecision(req, res, 'approved'));
app.post('/api/approvals/:id/reject', (req, res) => handleDecision(req, res, 'rejected'));

// Error handler
app.use((err, _req, res, _next) => {
  console.error('API Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
  console.log(`FlowPilot API active at http://localhost:${port}`);
});
