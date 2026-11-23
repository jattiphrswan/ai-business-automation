import React, { useEffect, useState, useMemo } from 'react';
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
  ShieldCheck,
  FileText,
  MailCheck,
  Search,
  Download,
  BookOpen,
  Mail,
  BarChart3,
  TrendingUp,
  Percent,
  Activity,
  AlertOctagon,
  MessageSquare,
  Zap,
  Globe,
  Radio,
  UserCheck,
  Lock,
} from 'lucide-react';
import './styles/app.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

type ChannelType = 'web_form' | 'email' | 'whatsapp' | 'stripe_webhook';
type OperatorRole = 'supervisor' | 'agent' | 'auditor';

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
  channel?: ChannelType;
  status: 'draft_ready' | 'pending_approval' | 'approved' | 'rejected' | 'sent';
  classification: Classification;
  decisionReason?: string;
  isEdited?: boolean;
  sentAt?: string;
  createdAt: string;
}

interface Contact {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

interface AuditLog {
  id: string;
  type: string;
  entityId: string;
  detail: Record<string, unknown>;
  at: string;
}

interface Metrics {
  total: number;
  pending: number;
  approved: number;
  sent: number;
  contacts: number;
}

const initialForm = { name: '', email: '', subject: '', message: '', channel: 'web_form' as ChannelType };

// Preset Inbound Channel Simulations
const SIMULATED_EVENTS = [
  {
    channel: 'email' as ChannelType,
    name: 'Sarah Connor',
    email: 'sarah.connor@cyberdyne.ai',
    subject: 'Enterprise SLA & Multi-Region failover quote',
    message: 'Hello, our engineering leadership is evaluating FlowPilot for 500+ agents. Could you provide enterprise pricing and your SLA agreement for multi-region active-active deployments?',
    badge: '📧 Gmail Inbound Sync',
  },
  {
    channel: 'whatsapp' as ChannelType,
    name: 'Carlos Mendez',
    email: 'carlos.m@whatsapp-user.com',
    subject: 'WhatsApp Chat: Locked out after 2FA reset',
    message: 'Hey support! I reset my phone and now I am completely locked out of my corporate workspace. Can someone help reset my authenticator app please?',
    badge: '💬 WhatsApp Chat',
  },
  {
    channel: 'stripe_webhook' as ChannelType,
    name: 'Stripe Dispute System',
    email: 'disputes@stripe.com',
    subject: 'CRITICAL: Chargeback dispute filed for Invoice #INV-8821 ($499.00)',
    message: 'Customer has initiated a formal chargeback with their issuing bank claiming fraudulent transaction for charge ch_3M5q8899. Immediate response and evidence submission required within 48 hours.',
    badge: '⚡ Stripe Chargeback',
  },
];

// Quick Response Templates
const RESPONSE_TEMPLATES = [
  {
    id: 'refund',
    name: '💳 Refund Approved',
    text: 'We have processed your request and approved a full refund. The funds will reflect in your account within 3–5 business days.',
  },
  {
    id: 'more_info',
    name: '🔍 Request Details',
    text: 'Could you please reply with your account number, transaction ID, or a screenshot so we can investigate this thoroughly?',
  },
  {
    id: 'escalate',
    name: '🛠️ Senior Escalation',
    text: 'Your request has been escalated to our senior operations team. We are actively investigating and will follow up shortly.',
  },
  {
    id: 'meeting',
    name: '📅 Schedule Call',
    text: "We'd be glad to discuss tailored options with you directly. You can pick a 15-minute slot that fits your schedule here: https://cal.example.com/flowpilot",
  },
  {
    id: 'resolved',
    name: '✅ Issue Resolved',
    text: 'Everything has now been resolved on our end. Please verify when convenient and feel free to reach out if you have any other questions!',
  },
];

function App() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({ total: 0, pending: 0, approved: 0, sent: 0, contacts: 0 });
  const [form, setForm] = useState(initialForm);
  const [activeTab, setActiveTab] = useState<'inquiries' | 'approvals' | 'contacts' | 'audit' | 'analytics'>('inquiries');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedContactEmail, setSelectedContactEmail] = useState<string | null>(null);

  // RBAC State
  const [currentRole, setCurrentRole] = useState<OperatorRole>('supervisor');

  // Email Dispatch Modal State
  const [sendModalInquiry, setSendModalInquiry] = useState<Inquiry | null>(null);
  const [sendSuccessReceipt, setSendSuccessReceipt] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Draft editing state
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [draftEditText, setDraftEditText] = useState<string>('');
  const [savingDraft, setSavingDraft] = useState(false);

  // Fetch all data
  async function fetchData() {
    setLoading(true);
    try {
      const [resInquiries, resMetrics, resContacts, resAudit] = await Promise.all([
        fetch(`${API}/api/inquiries`),
        fetch(`${API}/api/dashboard`),
        fetch(`${API}/api/contacts`),
        fetch(`${API}/api/audit`),
      ]);

      if (!resInquiries.ok || !resMetrics.ok) throw new Error('API unreachable. Is backend server running?');

      setInquiries(await resInquiries.json());
      setMetrics(await resMetrics.json());
      if (resContacts.ok) setContacts(await resContacts.json());
      if (resAudit.ok) setAuditLogs(await resAudit.json());
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

  // Submit inquiry
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (currentRole === 'auditor') {
      setFeedback({ text: 'Auditor role is read-only and cannot submit inquiries.', type: 'error' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch(`${API}/api/inquiries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Actor-Role': currentRole,
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to submit inquiry.');
      }

      setForm(initialForm);
      setFeedback({ text: 'Inquiry analyzed and draft response generated!', type: 'success' });
      await fetchData();
    } catch (err) {
      setFeedback({ text: (err as Error).message, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  // Simulate an inbound channel event with 1-click
  async function triggerSimulation(eventData: (typeof SIMULATED_EVENTS)[number]) {
    if (currentRole === 'auditor') {
      setFeedback({ text: 'Auditor role is read-only and cannot trigger simulations.', type: 'error' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch(`${API}/api/inquiries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Actor-Role': currentRole,
        },
        body: JSON.stringify({
          name: eventData.name,
          email: eventData.email,
          subject: eventData.subject,
          message: eventData.message,
          channel: eventData.channel,
        }),
      });

      if (!res.ok) throw new Error('Simulation failed to dispatch event.');
      const inq = await res.json();

      setFeedback({
        text: `Inbound event captured from [${eventData.badge}]: Categorized as ${inq.classification.category} (${inq.classification.priority} priority).`,
        type: 'success',
      });
      await fetchData();
    } catch (err) {
      setFeedback({ text: (err as Error).message, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  // Handle Approve or Reject
  async function handleDecision(id: string, action: 'approve' | 'reject') {
    if (currentRole !== 'supervisor') {
      setFeedback({ text: 'Supervisor authority is required to approve or reject drafts.', type: 'error' });
      return;
    }

    let reason = '';
    if (action === 'reject') {
      const input = window.prompt('Please provide a reason for rejecting this draft:');
      if (!input?.trim()) return;
      reason = input.trim();
    }

    try {
      const res = await fetch(`${API}/api/approvals/${id}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Actor-Role': currentRole,
        },
        body: JSON.stringify({ reason }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to process approval decision.');
      }

      setFeedback({ text: `Draft successfully ${action}d.`, type: 'success' });
      await fetchData();
    } catch (err) {
      setFeedback({ text: (err as Error).message, type: 'error' });
    }
  }

  // Confirm and Send Response to customer
  async function handleConfirmSend(id: string) {
    if (currentRole !== 'supervisor') {
      setFeedback({ text: 'Supervisor authority is required to dispatch customer responses.', type: 'error' });
      return;
    }

    setSendingId(id);
    setSendSuccessReceipt(null);

    try {
      const res = await fetch(`${API}/api/inquiries/${id}/send`, {
        method: 'POST',
        headers: { 'X-Actor-Role': currentRole },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to dispatch response to customer.');
      }
      const data = await res.json();

      setSendSuccessReceipt(`Delivered to ${data.email} at ${new Date(data.sentAt).toLocaleTimeString()}`);
      setFeedback({ text: `Response successfully delivered to ${data.email}!`, type: 'success' });
      await fetchData();

      setTimeout(() => {
        setSendModalInquiry(null);
        setSendSuccessReceipt(null);
      }, 1800);
    } catch (err) {
      setFeedback({ text: (err as Error).message, type: 'error' });
    } finally {
      setSendingId(null);
    }
  }

  // Draft editing
  function startEditingDraft(item: Inquiry) {
    if (currentRole === 'auditor') {
      setFeedback({ text: 'Auditor role is read-only and cannot edit response drafts.', type: 'error' });
      return;
    }
    setEditingDraftId(item.id);
    setDraftEditText(item.draft);
  }

  function insertTemplate(templateText: string, inquiryName: string) {
    const greeting = `Hi ${inquiryName},\n\n`;
    const closing = `\n\nBest regards,\nCustomer Operations Team`;
    setDraftEditText(`${greeting}${templateText}${closing}`);
  }

  async function handleSaveDraft(id: string) {
    if (!draftEditText.trim()) return;
    setSavingDraft(true);

    try {
      const res = await fetch(`${API}/api/inquiries/${id}/draft`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Actor-Role': currentRole,
        },
        body: JSON.stringify({ draft: draftEditText }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to save draft edits.');
      }

      setEditingDraftId(null);
      setFeedback({ text: 'Draft updated successfully by human editor!', type: 'success' });
      await fetchData();
    } catch (err) {
      setFeedback({ text: (err as Error).message, type: 'error' });
    } finally {
      setSavingDraft(false);
    }
  }

  // Export to CSV
  function handleExportCSV() {
    if (currentRole === 'agent') {
      setFeedback({ text: 'Data export is restricted to Supervisors and Compliance Auditors.', type: 'error' });
      return;
    }
    if (displayedList.length === 0) return;

    const headers = ['ID', 'Name', 'Email', 'Subject', 'Category', 'Priority', 'Channel', 'Status', 'Created At', 'Sent At'];
    const rows = displayedList.map((item) => [
      item.id,
      `"${item.name.replace(/"/g, '""')}"`,
      `"${item.email.replace(/"/g, '""')}"`,
      `"${item.subject.replace(/"/g, '""')}"`,
      item.classification.category,
      item.classification.priority,
      item.channel || 'web_form',
      item.status,
      item.createdAt,
      item.sentAt || '',
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `flowpilot_inquiries_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Filter & Search Logic
  const displayedList = useMemo(() => {
    let list = inquiries;

    if (activeTab === 'approvals') {
      list = list.filter((item) => item.status === 'pending_approval');
    } else if (selectedContactEmail) {
      list = list.filter((item) => item.email.toLowerCase() === selectedContactEmail.toLowerCase());
    }

    if (selectedStatus !== 'all' && activeTab !== 'approvals') {
      list = list.filter((item) => item.status === selectedStatus);
    }

    if (selectedCategory !== 'all') {
      list = list.filter((item) => item.classification.category.toLowerCase() === selectedCategory.toLowerCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.email.toLowerCase().includes(q) ||
          item.subject.toLowerCase().includes(q) ||
          item.message.toLowerCase().includes(q)
      );
    }

    return list;
  }, [inquiries, activeTab, selectedContactEmail, selectedStatus, selectedCategory, searchQuery]);

  // Analytics Computation
  const analyticsData = useMemo(() => {
    const total = inquiries.length;
    if (total === 0) {
      return {
        categories: [],
        highPriorityPct: 0,
        escalationRate: 0,
        approvedTotal: 0,
        sentTotal: 0,
        rejectionCount: 0,
        avgConfidence: 0,
        channels: [],
      };
    }

    const categoriesCount: Record<string, number> = {};
    const channelCount: Record<string, number> = {};
    let highPriorityCount = 0;
    let escalationCount = 0;
    let confidenceSum = 0;

    inquiries.forEach((item) => {
      const cat = item.classification.category.toLowerCase();
      const ch = item.channel || 'web_form';
      categoriesCount[cat] = (categoriesCount[cat] || 0) + 1;
      channelCount[ch] = (channelCount[ch] || 0) + 1;

      if (item.classification.priority === 'high') highPriorityCount++;
      if (item.classification.requiresApproval) escalationCount++;
      confidenceSum += item.classification.confidence || 0.75;
    });

    const categories = Object.entries(categoriesCount).map(([name, count]) => ({
      name,
      count,
      pct: Math.round((count / total) * 100),
    }));

    const channels = Object.entries(channelCount).map(([name, count]) => ({
      name,
      count,
      pct: Math.round((count / total) * 100),
    }));

    const rejectedCount = inquiries.filter((x) => x.status === 'rejected').length;
    const approvedTotal = inquiries.filter((x) => x.status === 'approved' || x.status === 'sent').length;
    const sentTotal = inquiries.filter((x) => x.status === 'sent').length;

    return {
      categories,
      channels,
      highPriorityPct: Math.round((highPriorityCount / total) * 100),
      escalationRate: Math.round((escalationCount / total) * 100),
      approvedTotal,
      sentTotal,
      rejectedCount,
      avgConfidence: Math.round((confidenceSum / total) * 100),
    };
  }, [inquiries]);

  // Channel Icon helper
  function renderChannelBadge(channel?: ChannelType) {
    switch (channel) {
      case 'email':
        return (
          <span className="channel-badge email">
            <Mail size={12} />
            <span>Gmail Sync</span>
          </span>
        );
      case 'whatsapp':
        return (
          <span className="channel-badge whatsapp">
            <MessageSquare size={12} />
            <span>WhatsApp</span>
          </span>
        );
      case 'stripe_webhook':
        return (
          <span className="channel-badge stripe">
            <Zap size={12} />
            <span>Stripe Webhook</span>
          </span>
        );
      default:
        return (
          <span className="channel-badge web">
            <Globe size={12} />
            <span>Web Form</span>
          </span>
        );
    }
  }

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
            className={`nav-item ${activeTab === 'inquiries' && !selectedContactEmail ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('inquiries');
              setSelectedContactEmail(null);
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
              setSelectedContactEmail(null);
              setMobileMenuOpen(false);
            }}
          >
            <Clock size={18} />
            <span>Approval Queue</span>
            {metrics.pending > 0 && <span className="badge warning">{metrics.pending}</span>}
          </button>

          <button
            className={`nav-item ${activeTab === 'contacts' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('contacts');
              setMobileMenuOpen(false);
            }}
          >
            <Users size={18} />
            <span>CRM Contacts</span>
            <span className="badge">{contacts.length}</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('analytics');
              setSelectedContactEmail(null);
              setMobileMenuOpen(false);
            }}
          >
            <BarChart3 size={18} />
            <span>SLA Analytics</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('audit');
              setSelectedContactEmail(null);
              setMobileMenuOpen(false);
            }}
          >
            <ShieldCheck size={18} />
            <span>Audit Trail</span>
            <span className="badge">{auditLogs.length}</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="safety-note">
            <div className="safety-tag">HUMAN-IN-THE-LOOP</div>
            <p>Role-based review active. Supervisors gate final delivery.</p>
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
              <p>Autonomous customer intake, AI response triage, and verified delivery.</p>
            </div>
          </div>
          <div className="header-actions">
            {/* RBAC Operator Role Switcher */}
            <div className="role-switcher">
              <UserCheck size={14} className="role-icon" />
              <label htmlFor="role-select">Active Role:</label>
              <select
                id="role-select"
                value={currentRole}
                onChange={(e) => {
                  const newRole = e.target.value as OperatorRole;
                  setCurrentRole(newRole);
                  setFeedback({
                    text: `Switched active role to: ${newRole.toUpperCase()} (Permissions updated live)`,
                    type: 'success',
                  });
                }}
              >
                <option value="supervisor">🛡️ Supervisor (Full Authority)</option>
                <option value="agent">🧑‍💻 Tier-1 Agent (Draft & Edit)</option>
                <option value="auditor">🔍 Compliance Auditor (Read-Only)</option>
              </select>
            </div>

            <button
              className="btn-secondary"
              onClick={handleExportCSV}
              title="Export current list to CSV"
              disabled={currentRole === 'agent'}
            >
              <Download size={15} />
              <span>Export CSV</span>
            </button>
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

        {/* Role Permission Alert Notice */}
        {currentRole !== 'supervisor' && (
          <div className="role-notice">
            <Lock size={15} />
            <span>
              {currentRole === 'agent'
                ? 'Logged in as Tier-1 Agent: You can draft, edit, and categorize inquiries. Approval of high-risk items requires Supervisor sign-off.'
                : 'Logged in as Compliance Auditor: Read-only observation mode. Modifying drafts, approvals, and dispatch actions are restricted.'}
            </span>
          </div>
        )}

        {/* Key Metrics */}
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
              <span className="label">Approved</span>
              <h2>{metrics.approved}</h2>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon purple">
              <MailCheck size={20} />
            </div>
            <div className="metric-data">
              <span className="label">Sent to Customer</span>
              <h2>{metrics.sent || 0}</h2>
            </div>
          </div>
        </section>

        {/* VIEW 1: CONTACTS DIRECTORY */}
        {activeTab === 'contacts' ? (
          <section className="card full-width">
            <div className="card-header space-between">
              <div>
                <h2>CRM Customer Directory</h2>
                <p>Contacts automatically synchronized and deduplicated from customer inquiries.</p>
              </div>
            </div>

            <div className="contacts-grid">
              {contacts.map((c) => {
                const count = inquiries.filter((inq) => inq.email.toLowerCase() === c.email.toLowerCase()).length;
                return (
                  <div className="contact-card" key={c.id}>
                    <div className="contact-avatar">{c.name.slice(0, 2).toUpperCase()}</div>
                    <div className="contact-details">
                      <h4>{c.name}</h4>
                      <span className="contact-email">{c.email}</span>
                      <div className="contact-meta">
                        <span>{count} {count === 1 ? 'inquiry' : 'inquiries'}</span>
                        <span>Added {new Date(c.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button
                      className="btn-view-history"
                      onClick={() => {
                        setSelectedContactEmail(c.email);
                        setActiveTab('inquiries');
                      }}
                    >
                      View Inquiries →
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        ) : activeTab === 'analytics' ? (
          /* VIEW 2: OPERATIONS & SLA ANALYTICS */
          <div className="analytics-container">
            <div className="analytics-kpi-row">
              <div className="kpi-card">
                <div className="kpi-header">
                  <span>Human Escalation Rate</span>
                  <AlertOctagon size={16} className="text-amber" />
                </div>
                <h3>{analyticsData.escalationRate}%</h3>
                <p>Requests requiring manual supervisor sign-off</p>
              </div>

              <div className="kpi-card">
                <div className="kpi-header">
                  <span>High-Priority Volume</span>
                  <Activity size={16} className="text-danger" />
                </div>
                <h3>{analyticsData.highPriorityPct}%</h3>
                <p>Flagged as urgent, billing issues, or sensitive</p>
              </div>

              <div className="kpi-card">
                <div className="kpi-header">
                  <span>AI Confidence Score</span>
                  <TrendingUp size={16} className="text-primary" />
                </div>
                <h3>{analyticsData.avgConfidence}%</h3>
                <p>Average categorization certainty rating</p>
              </div>

              <div className="kpi-card">
                <div className="kpi-header">
                  <span>Delivery Success Rate</span>
                  <Percent size={16} className="text-success" />
                </div>
                <h3>{analyticsData.approvedTotal > 0 ? Math.round((analyticsData.sentTotal / analyticsData.approvedTotal) * 100) : 100}%</h3>
                <p>Approved responses dispatched to customers</p>
              </div>
            </div>

            <div className="analytics-charts-grid">
              {/* Category Breakdown */}
              <div className="card">
                <div className="card-header">
                  <h2>Inquiries by Category</h2>
                  <p>Distribution of incoming requests triaged by the engine.</p>
                </div>
                <div className="category-bars">
                  {analyticsData.categories.map((cat) => (
                    <div className="bar-row" key={cat.name}>
                      <div className="bar-meta">
                        <span className="bar-label">{cat.name.toUpperCase()}</span>
                        <span className="bar-count">{cat.count} ({cat.pct}%)</span>
                      </div>
                      <div className="bar-track">
                        <div className={`bar-fill cat-${cat.name}`} style={{ width: `${cat.pct}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Inbound Channels Breakdown */}
              <div className="card">
                <div className="card-header">
                  <h2>Inbound Channels</h2>
                  <p>Traffic distribution across connected ingestion pipelines.</p>
                </div>
                <div className="category-bars">
                  {analyticsData.channels.map((ch) => (
                    <div className="bar-row" key={ch.name}>
                      <div className="bar-meta">
                        <span className="bar-label">{ch.name.replaceAll('_', ' ').toUpperCase()}</span>
                        <span className="bar-count">{ch.count} ({ch.pct}%)</span>
                      </div>
                      <div className="bar-track">
                        <div className="bar-fill cat-general" style={{ width: `${ch.pct}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'audit' ? (
          /* VIEW 3: AUDIT TRAIL */
          <section className="card full-width">
            <div className="card-header space-between">
              <div>
                <h2>Security & Compliance Audit Trail</h2>
                <p>Immutable log of automated decisions, human approvals, and customer dispatch actions.</p>
              </div>
            </div>

            <div className="audit-timeline">
              {auditLogs.map((log) => (
                <div className="audit-item" key={log.id}>
                  <div className={`audit-badge ${log.type}`}>
                    {log.type.includes('approve') ? <Check size={14} /> : log.type.includes('send') ? <Send size={14} /> : <FileText size={14} />}
                  </div>
                  <div className="audit-content">
                    <div className="audit-header">
                      <strong>{log.type.replaceAll('_', ' ').toUpperCase()}</strong>
                      <span className="audit-time">{new Date(log.at).toLocaleString()}</span>
                    </div>
                    <p className="audit-detail">{JSON.stringify(log.detail)}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          /* VIEW 4: INQUIRIES & APPROVALS (DUAL COLUMN WITH RBAC CONTROLS) */
          <div className="content-columns">
            {/* Customer Intake & Simulator Panel */}
            <section className="card form-panel">
              <div className="card-header">
                <div>
                  <h2>Customer Intake</h2>
                  <p>Submit inquiries manually or test automated inbound channel ingestion.</p>
                </div>
              </div>

              {/* 1-Click Inbound Channel Simulator Strip */}
              <div className="simulator-banner">
                <div className="simulator-label">
                  <Radio size={14} className="pulse-icon" />
                  <span>Test Inbound Channels (1-Click):</span>
                </div>
                <div className="simulator-buttons">
                  {SIMULATED_EVENTS.map((sim) => (
                    <button
                      key={sim.channel}
                      type="button"
                      className={`sim-btn ${sim.channel}`}
                      disabled={submitting || currentRole === 'auditor'}
                      onClick={() => void triggerSimulation(sim)}
                      title={`Simulate instant intake via ${sim.badge}`}
                    >
                      {sim.channel === 'email' ? <Mail size={13} /> : sim.channel === 'whatsapp' ? <MessageSquare size={13} /> : <Zap size={13} />}
                      <span>{sim.badge}</span>
                    </button>
                  ))}
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
                      disabled={currentRole === 'auditor'}
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
                      disabled={currentRole === 'auditor'}
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
                    disabled={currentRole === 'auditor'}
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
                    disabled={currentRole === 'auditor'}
                    placeholder="Provide message details. (Tip: terms like 'urgent', 'refund', or 'lawsuit' escalate to human approval)."
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                  />
                </div>

                <button type="submit" className="btn-primary" disabled={submitting || currentRole === 'auditor'}>
                  <Send size={16} />
                  <span>
                    {currentRole === 'auditor'
                      ? 'Intake Disabled (Auditor Mode)'
                      : submitting
                      ? 'Analyzing with AI...'
                      : 'Process Inquiry'}
                  </span>
                </button>
              </form>
            </section>

            {/* Inquiries / Approvals List */}
            <section className="card list-panel">
              <div className="card-header space-between">
                <div>
                  <h2>
                    {activeTab === 'approvals'
                      ? 'Human Approval Queue'
                      : selectedContactEmail
                      ? `Inquiries for ${selectedContactEmail}`
                      : 'Activity Stream'}
                  </h2>
                  <p>
                    Showing {displayedList.length} of {inquiries.length} {inquiries.length === 1 ? 'item' : 'items'}
                  </p>
                </div>
                {selectedContactEmail && (
                  <button className="btn-secondary" onClick={() => setSelectedContactEmail(null)}>
                    Clear Filter
                  </button>
                )}
              </div>

              {/* Search Bar & Filter Controls */}
              <div className="filter-toolbar">
                <div className="search-box">
                  <Search size={15} />
                  <input
                    type="text"
                    placeholder="Search by name, email, subject, or message..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button className="search-clear" onClick={() => setSearchQuery('')}>
                      <X size={13} />
                    </button>
                  )}
                </div>

                {activeTab !== 'approvals' && (
                  <div className="filter-chips">
                    <div className="chip-group">
                      <span className="chip-label">Category:</span>
                      {['all', 'billing', 'sales', 'support', 'account', 'general'].map((cat) => (
                        <button
                          key={cat}
                          className={`chip ${selectedCategory === cat ? 'active' : ''}`}
                          onClick={() => setSelectedCategory(cat)}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    <div className="chip-group">
                      <span className="chip-label">Status:</span>
                      {['all', 'draft_ready', 'pending_approval', 'approved', 'sent'].map((st) => (
                        <button
                          key={st}
                          className={`chip ${selectedStatus === st ? 'active' : ''}`}
                          onClick={() => setSelectedStatus(st)}
                        >
                          {st.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="items-list">
                {displayedList.length === 0 ? (
                  <div className="empty-state">
                    <Inbox size={36} />
                    <p>
                      {searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all'
                        ? 'No inquiries match your current search/filter criteria.'
                        : activeTab === 'approvals'
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
                          {renderChannelBadge(item.channel)}
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

                        {/* Accordion Preview */}
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
                                  {item.status !== 'approved' &&
                                    item.status !== 'sent' &&
                                    !isEditingThisDraft &&
                                    currentRole !== 'auditor' && (
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
                                    {/* Quick Templates Selector */}
                                    <div className="template-picker">
                                      <div className="template-picker-label">
                                        <BookOpen size={13} />
                                        <span>Quick Templates:</span>
                                      </div>
                                      <div className="template-chips">
                                        {RESPONSE_TEMPLATES.map((tmpl) => (
                                          <button
                                            key={tmpl.id}
                                            type="button"
                                            className="template-chip"
                                            onClick={() => insertTemplate(tmpl.text, item.name)}
                                            title="Click to apply this template"
                                          >
                                            {tmpl.name}
                                          </button>
                                        ))}
                                      </div>
                                    </div>

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

                        {/* Approval Queue Controls with RBAC protection */}
                        {item.status === 'pending_approval' && (
                          <div className="decision-actions">
                            {currentRole === 'supervisor' ? (
                              <>
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
                              </>
                            ) : (
                              <div className="locked-approval-badge">
                                <Lock size={13} />
                                <span>Supervisor Approval Required</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Outbound Delivery Action Trigger (Supervisor Only) */}
                        {item.status === 'approved' && (
                          <div className="decision-actions">
                            {currentRole === 'supervisor' ? (
                              <button
                                type="button"
                                className="btn-send-customer"
                                onClick={() => setSendModalInquiry(item)}
                              >
                                <Mail size={15} />
                                <span>Preview & Send Email</span>
                              </button>
                            ) : (
                              <div className="locked-approval-badge">
                                <Lock size={13} />
                                <span>Supervisor Dispatch Required</span>
                              </div>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  })
                )}
              </div>
            </section>
          </div>
        )}

        {/* OUTBOUND EMAIL DISPATCH MODAL */}
        {sendModalInquiry && (
          <div className="modal-overlay" onClick={() => !sendingId && setSendModalInquiry(null)}>
            <div className="modal-container email-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title">
                  <Mail size={18} />
                  <h3>Outbound Email Dispatch Preview</h3>
                </div>
                <button
                  className="modal-close"
                  onClick={() => !sendingId && setSendModalInquiry(null)}
                  disabled={Boolean(sendingId)}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="modal-body">
                {sendSuccessReceipt ? (
                  <div className="dispatch-success">
                    <CheckCircle2 size={44} />
                    <h4>Response Delivered!</h4>
                    <p>{sendSuccessReceipt}</p>
                    <span className="dispatch-badge">SMTP Status: 250 OK (Queued for Delivery)</span>
                  </div>
                ) : (
                  <>
                    <div className="email-meta-card">
                      <div className="email-meta-row">
                        <span className="email-meta-label">From:</span>
                        <span className="email-meta-value">FlowPilot Support &lt;support@flowpilot.ai&gt;</span>
                      </div>
                      <div className="email-meta-row">
                        <span className="email-meta-label">To:</span>
                        <span className="email-meta-value">
                          {sendModalInquiry.name} &lt;{sendModalInquiry.email}&gt;
                        </span>
                      </div>
                      <div className="email-meta-row">
                        <span className="email-meta-label">Subject:</span>
                        <span className="email-meta-value font-medium">
                          Re: {sendModalInquiry.subject} [Ref #{sendModalInquiry.id.slice(0, 8)}]
                        </span>
                      </div>
                    </div>

                    <div className="email-preview-envelope">
                      <div className="email-preview-header">
                        <div className="email-logo">FlowPilot</div>
                        <span className="email-secure-badge">Verified TLS Encryption</span>
                      </div>

                      <div className="email-preview-content">
                        <pre>{sendModalInquiry.draft}</pre>
                      </div>

                      <div className="email-preview-footer">
                        <p>© 2026 FlowPilot AI Operations · 100% Human-Approved Dispatch</p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {!sendSuccessReceipt && (
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => setSendModalInquiry(null)}
                    disabled={Boolean(sendingId)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-confirm-send"
                    disabled={Boolean(sendingId)}
                    onClick={() => void handleConfirmSend(sendModalInquiry.id)}
                  >
                    <Send size={15} />
                    <span>{sendingId ? 'Connecting to Mail Server...' : 'Confirm & Send to Customer'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

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
