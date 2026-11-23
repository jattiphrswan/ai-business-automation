import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import crypto from 'node:crypto';
import { z } from 'zod';
import { readStore, writeStore, logAudit } from './services/store.js';
import { analyzeAndDraft } from './services/ai.js';

const app = express();
const port = Number(process.env.PORT || 4000);
const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

app.use(helmet());
app.use(cors({ origin: frontendOrigin, credentials: true }));
app.use(express.json({ limit: '64kb' }));

// Input validation schemas
const inquirySchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(120),
  email: z.string().trim().email('Invalid email address').max(255),
  subject: z.string().trim().min(3, 'Subject must be at least 3 characters').max(200),
  message: z.string().trim().min(10, 'Message must be at least 10 characters').max(5000),
  channel: z.enum(['web_form', 'email', 'whatsapp', 'stripe_webhook']).default('web_form'),
});

const draftEditSchema = z.object({
  draft: z.string().trim().min(5, 'Draft must be at least 5 characters').max(10000),
});

// System & Metrics
app.get('/api/health', (_req, res) => res.json({
  ok: true,
  mode: process.env.GEMINI_API_KEY ? 'gemini-ai' : process.env.OPENAI_API_KEY ? 'openai' : 'smart-rules',
  timestamp: new Date().toISOString(),
}));

app.get('/api/dashboard', (_req, res) => {
  const store = readStore();
  const pending = store.inquiries.filter((item) => item.status === 'pending_approval').length;
  const approved = store.inquiries.filter((item) => item.status === 'approved').length;
  const sent = store.inquiries.filter((item) => item.status === 'sent').length;
  res.json({
    total: store.inquiries.length,
    pending,
    approved,
    sent,
    contacts: store.contacts.length,
  });
});

// Inquiries & Contacts & Audit
app.get('/api/inquiries', (_req, res) => res.json(readStore().inquiries));
app.get('/api/contacts', (_req, res) => res.json(readStore().contacts));
app.get('/api/approvals', (_req, res) => {
  const store = readStore();
  res.json(store.inquiries.filter((item) => item.status === 'pending_approval'));
});
app.get('/api/audit', (_req, res) => res.json(readStore().audit));

// Create Inquiry (Intake -> AI Analyze & Draft -> Local CRM Upsert)
app.post('/api/inquiries', async (req, res, next) => {
  try {
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

    // AI Analysis & Response Drafting
    const aiResult = await analyzeAndDraft(data.name, data.subject, data.message);
    const status = aiResult.requiresApproval ? 'pending_approval' : 'draft_ready';

    const inquiry = {
      id: crypto.randomUUID(),
      ...data,
      contactId: contact.id,
      classification: {
        category: aiResult.category,
        priority: aiResult.priority,
        requiresApproval: aiResult.requiresApproval,
        sentiment: aiResult.sentiment,
        confidence: aiResult.confidence,
        method: aiResult.method,
      },
      draft: aiResult.draft,
      status,
      createdAt: now,
      updatedAt: now,
    };

    store.inquiries.unshift(inquiry);

    logAudit(store, 'inquiry_created', inquiry.id, {
      category: aiResult.category,
      priority: aiResult.priority,
      channel: inquiry.channel,
      method: aiResult.method,
      status: inquiry.status,
    });

    writeStore(store);
    res.status(201).json(inquiry);
  } catch (err) {
    next(err);
  }
});

// Edit Draft Before Approval
app.patch('/api/inquiries/:id/draft', (req, res) => {
  const parsed = draftEditSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid draft content', issues: parsed.error.flatten() });
  }

  const store = readStore();
  const inquiry = store.inquiries.find((item) => item.id === req.params.id);

  if (!inquiry) return res.status(404).json({ error: 'Inquiry not found' });
  if (inquiry.status === 'approved' || inquiry.status === 'sent') {
    return res.status(400).json({ error: 'Cannot edit an already approved or sent response' });
  }

  inquiry.draft = parsed.data.draft;
  inquiry.updatedAt = new Date().toISOString();
  inquiry.isEdited = true;

  logAudit(store, 'draft_edited', inquiry.id, { actor: 'human-editor' });
  writeStore(store);
  res.json(inquiry);
});

// Human Decisions (Approve / Reject)
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

// Send Approved Draft to Customer
app.post('/api/inquiries/:id/send', (req, res) => {
  const store = readStore();
  const inquiry = store.inquiries.find((item) => item.id === req.params.id);

  if (!inquiry) return res.status(404).json({ error: 'Inquiry not found' });
  if (inquiry.status !== 'approved') {
    return res.status(400).json({ error: 'Only approved drafts can be delivered to customer' });
  }

  inquiry.status = 'sent';
  inquiry.sentAt = new Date().toISOString();
  inquiry.updatedAt = inquiry.sentAt;

  logAudit(store, 'response_sent', inquiry.id, {
    recipient: inquiry.email,
    actor: 'system-dispatcher',
  });

  writeStore(store);
  res.json(inquiry);
});

// Error handling
app.use((err, _req, res, _next) => {
  console.error('API Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
  console.log(`FlowPilot API active at http://localhost:${port}`);
});
