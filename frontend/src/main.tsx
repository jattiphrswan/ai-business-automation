import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Inbox,
  CheckCircle2,
  Clock,
  Users,
  Sparkles,
  Send,
  RefreshCw,
  Check,
  X,
  AlertTriangle,
  Menu,
  ChevronDown,
  ChevronUp,
  Edit3,
  Save,
  RotateCcw,
} from 'lucide-react';
import './styles/app.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

interface Classification {
  category: string;
  priority: 'high' | 'normal';
  requiresApproval: boolean;
  confidence: number;
  method?: string;
  sentiment?: string;
}

interface Inquiry {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  draft: string;
  status: 'draft_ready' | 'pending_approval' | 'approved' | 'rejected';
  classification: Classification;
  decisionReason?: string;
  isEdited?: boolean;
  createdAt: string;
}

interface Metrics {
  total: number;
  pending: number;
  approved: number;
  contacts: number;
}

const initialForm = { name: '', email: '', subject: '', message: '' };

function App() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({ total: 0, pending: 0, approved: 0, contacts: 0 });
  const [form, setForm] = useState(initialForm);
  const [activeTab, setActiveTab] = useState<'inquiries' | 'approvals'>('inquiries');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Draft editing state
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [draftEditText, setDraftEditText] = useState<string>('');
  const [savingDraft, setSavingDraft] = useState(false);

  // Fetch all inquiries and metrics
  async function fetchData() {
    setLoading(true);
    try {
      const [resInquiries, resMetrics] = await Promise.all([
        fetch(`${API}/api/inquiries`),
        fetch(`${API}/api/dashboard`),
      ]);
      if (!resInquiries.ok || !resMetrics.ok) throw new Error('API unreachable. Is the backend server running?');

      setInquiries(await resInquiries.json());
      setMetrics(await resMetrics.json());
      setFeedback(null);
    } catch (err) {
      setFeedback({ text: (err as Error).message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchData();
  }, []);

  // Submit new customer inquiry
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch(`${API}/api/inquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to submit inquiry.');
      }

      setForm(initialForm);
      setFeedback({ text: 'Inquiry analyzed and draft created successfully!', type: 'success' });
      await fetchData();
    } catch (err) {
      setFeedback({ text: (err as Error).message, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  // Handle human review decision
  async function handleDecision(id: string, action: 'approve' | 'reject') {
    let reason = '';
    if (action === 'reject') {
      const input = window.prompt('Please provide a reason for rejecting this draft:');
      if (!input?.trim()) return;
      reason = input.trim();
    }

    try {
      const res = await fetch(`${API}/api/approvals/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      if (!res.ok) throw new Error('Failed to process approval decision.');
      setFeedback({ text: `Draft successfully ${action}d.`, type: 'success' });
      await fetchData();
    } catch (err) {
      setFeedback({ text: (err as Error).message, type: 'error' });
    }
  }

  // Start editing a draft
  function startEditingDraft(item: Inquiry) {
    setEditingDraftId(item.id);
    setDraftEditText(item.draft);
  }

  // Save edited draft
  async function handleSaveDraft(id: string) {
    if (!draftEditText.trim()) return;
    setSavingDraft(true);

    try {
      const res = await fetch(`${API}/api/inquiries/${id}/draft`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft: draftEditText }),
      });

      if (!res.ok) throw new Error('Failed to save draft edits.');
      setEditingDraftId(null);
      setFeedback({ text: 'Draft updated successfully by human editor!', type: 'success' });
      await fetchData();
    } catch (err) {
      setFeedback({ text: (err as Error).message, type: 'error' });
    } finally {
      setSavingDraft(false);
    }
  }

  const displayedList =
    activeTab === 'approvals'
      ? inquiries.filter((item) => item.status === 'pending_approval')
      : inquiries;

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-badge">
            <Sparkles size={18} />
          </div>
          <div>
            <h3>FlowPilot</h3>
            <span>AI AUTOMATION</span>
          </div>
        </div>

        <nav className="nav-links">
          <span className="nav-heading">WORKSPACE</span>
          <button
            className={`nav-item ${activeTab === 'inquiries' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('inquiries');
              setMobileMenuOpen(false);
            }}
          >
            <Inbox size={18} />
            <span>All Inquiries</span>
            <span className="badge">{metrics.total}</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'approvals' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('approvals');
              setMobileMenuOpen(false);
            }}
          >
            <Clock size={18} />
            <span>Approval Queue</span>
            {metrics.pending > 0 && <span className="badge warning">{metrics.pending}</span>}
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="safety-note">
            <div className="safety-tag">HUMAN-IN-THE-LOOP</div>
            <p>Smart AI drafts with human edit & approval safeguards before delivery.</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Top Header */}
        <header className="top-header">
          <div className="header-left">
            <button className="mobile-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              <Menu size={20} />
            </button>
            <div>
              <h1>Operations Command</h1>
              <p>Autonomous triage, AI response drafts, and human-in-the-loop review.</p>
            </div>
          </div>
          <div className="header-actions">
            <button className="btn-secondary" onClick={() => void fetchData()} disabled={loading}>
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
              <span>Refresh</span>
            </button>
            <div className="system-pill">
              <span className="dot"></span> System Live
            </div>
          </div>
        </header>

        {/* Global Feedback Banner */}
        {feedback && (
          <div className={`alert-banner ${feedback.type}`}>
            {feedback.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
            <span>{feedback.text}</span>
            <button onClick={() => setFeedback(null)} className="alert-close">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Key Operational Metrics */}
        <section className="metrics-grid">
          <div className="metric-card">
            <div className="metric-icon blue">
              <Inbox size={20} />
            </div>
            <div className="metric-data">
              <span className="label">Total Inquiries</span>
              <h2>{metrics.total}</h2>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon amber">
              <Clock size={20} />
            </div>
            <div className="metric-data">
              <span className="label">Pending Approval</span>
              <h2>{metrics.pending}</h2>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon green">
              <CheckCircle2 size={20} />
            </div>
            <div className="metric-data">
              <span className="label">Approved Drafts</span>
              <h2>{metrics.approved}</h2>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon purple">
              <Users size={20} />
            </div>
            <div className="metric-data">
              <span className="label">CRM Contacts</span>
              <h2>{metrics.contacts}</h2>
            </div>
          </div>
        </section>

        {/* Dashboard Dual Column */}
        <div className="content-columns">
          {/* Inquiry Intake Form */}
          <section className="card form-panel">
            <div className="card-header">
              <div>
                <h2>Customer Intake</h2>
                <p>Submit inquiries to trigger AI classification & contextual response drafting.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="inquiry-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="name">Full Name</label>
                  <input
                    id="name"
                    required
                    minLength={2}
                    maxLength={120}
                    placeholder="Alex Morgan"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <input
                    id="email"
                    type="email"
                    required
                    placeholder="alex@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="subject">Subject</label>
                <input
                  id="subject"
                  required
                  minLength={3}
                  maxLength={200}
                  placeholder="e.g. Urgent refund requested / Enterprise Pricing"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="message">Message Details</label>
                <textarea
                  id="message"
                  required
                  minLength={10}
                  rows={4}
                  placeholder="Provide message details. (Tip: terms like 'urgent', 'refund', or 'lawsuit' escalate to human approval)."
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                />
              </div>

              <button type="submit" className="btn-primary" disabled={submitting}>
                <Send size={16} />
                <span>{submitting ? 'Analyzing with AI...' : 'Process Inquiry'}</span>
              </button>
            </form>
          </section>

          {/* Inquiries / Approvals List */}
          <section className="card list-panel">
            <div className="card-header space-between">
              <div>
                <h2>{activeTab === 'approvals' ? 'Human Approval Queue' : 'Activity Stream'}</h2>
                <p>
                  Showing {displayedList.length} {displayedList.length === 1 ? 'item' : 'items'}
                </p>
              </div>
            </div>

            <div className="items-list">
              {displayedList.length === 0 ? (
                <div className="empty-state">
                  <Inbox size={36} />
                  <p>
                    {activeTab === 'approvals'
                      ? 'No inquiries pending approval. All caught up!'
                      : 'No inquiries recorded yet. Submit your first inquiry to test.'}
                  </p>
                </div>
              ) : (
                displayedList.map((item) => {
                  const isExpanded = expandedId === item.id;
                  const isEditingThisDraft = editingDraftId === item.id;

                  return (
                    <article className="inquiry-card" key={item.id}>
                      <div className="inquiry-header">
                        <div>
                          <h4>{item.subject}</h4>
                          <span className="contact-info">
                            {item.name} · {item.email}
                          </span>
                        </div>
                        <span className={`status-badge ${item.status}`}>
                          {item.status.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="tag-row">
                        <span className="tag category">{item.classification.category}</span>
                        <span className={`tag priority ${item.classification.priority}`}>
                          {item.classification.priority} priority
                        </span>
                        {item.classification.method && (
                          <span className="tag engine">{item.classification.method}</span>
                        )}
                        {item.isEdited && <span className="tag edited">Human Edited</span>}
                        <span className="time-ago">
                          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Expandable Preview Section */}
                      <div className="preview-container">
                        <button
                          type="button"
                          className="accordion-toggle"
                          onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        >
                          <span>{isExpanded ? 'Hide details & draft' : 'View customer message & AI draft'}</span>
                          {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </button>

                        {isExpanded && (
                          <div className="expanded-body">
                            <div className="message-box">
                              <strong>Customer Message:</strong>
                              <p>{item.message}</p>
                            </div>

                            <div className="draft-box">
                              <div className="draft-header">
                                <div className="draft-title">
                                  <Sparkles size={14} />
                                  <span>AI Generated Response Draft</span>
                                </div>
                                {item.status !== 'approved' && !isEditingThisDraft && (
                                  <button
                                    type="button"
                                    className="btn-edit-draft"
                                    onClick={() => startEditingDraft(item)}
                                  >
                                    <Edit3 size={13} />
                                    <span>Edit Draft</span>
                                  </button>
                                )}
                              </div>

                              {isEditingThisDraft ? (
                                <div className="draft-editor">
                                  <textarea
                                    className="draft-textarea"
                                    rows={6}
                                    value={draftEditText}
                                    onChange={(e) => setDraftEditText(e.target.value)}
                                  />
                                  <div className="editor-actions">
                                    <button
                                      type="button"
                                      className="btn-save-draft"
                                      disabled={savingDraft}
                                      onClick={() => void handleSaveDraft(item.id)}
                                    >
                                      <Save size={13} />
                                      <span>{savingDraft ? 'Saving...' : 'Save Draft'}</span>
                                    </button>
                                    <button
                                      type="button"
                                      className="btn-cancel-draft"
                                      onClick={() => setEditingDraftId(null)}
                                    >
                                      <RotateCcw size={13} />
                                      <span>Cancel</span>
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <pre>{item.draft}</pre>
                              )}
                            </div>

                            {item.decisionReason && (
                              <div className="rejection-box">
                                <strong>Rejection Reason:</strong> {item.decisionReason}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action buttons for pending items */}
                      {item.status === 'pending_approval' && (
                        <div className="decision-actions">
                          <button
                            type="button"
                            className="btn-approve"
                            onClick={() => void handleDecision(item.id, 'approve')}
                          >
                            <Check size={15} />
                            <span>Approve Draft</span>
                          </button>
                          <button
                            type="button"
                            className="btn-reject"
                            onClick={() => void handleDecision(item.id, 'reject')}
                          >
                            <X size={15} />
                            <span>Reject</span>
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })
              )}
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="footer-credits">
          FlowPilot Enterprise Automation · Deterministic Safety Guards Active
        </footer>
      </main>
    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
