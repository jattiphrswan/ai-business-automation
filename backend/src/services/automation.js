const groups = [
  { category: 'billing', terms: ['invoice', 'refund', 'payment', 'charged', 'billing'] },
  { category: 'sales', terms: ['pricing', 'quote', 'demo', 'purchase', 'buy'] },
  { category: 'support', terms: ['broken', 'error', 'bug', 'not working', 'help'] },
  { category: 'account', terms: ['password', 'login', 'access', 'account'] }
];
export function classify(subject, message) {
  const text = `${subject} ${message}`.toLowerCase();
  const category = groups.find(group => group.terms.some(term => text.includes(term)))?.category || 'general';
  const sensitive = ['refund', 'legal', 'lawsuit', 'delete my data', 'security breach', 'chargeback', 'cancel contract'].some(term => text.includes(term));
  const urgent = ['urgent', 'asap', 'outage', 'critical', 'security breach'].some(term => text.includes(term));
  return { category, priority: urgent || sensitive ? 'high' : 'normal', requiresApproval: urgent || sensitive, confidence: 0.65, method: 'rules-demo' };
}
export function draftResponse(inquiry, classification) {
  const categoryLine = {
    billing: 'Our billing team will review the details and follow up.',
    sales: 'Our team can share the relevant options and next steps.',
    support: 'Our support team will investigate the issue and contact you.',
    account: 'Our team will help you with the account request after verification.',
    general: 'Our team will review your request and follow up.'
  }[classification.category];
  return `Hi ${inquiry.name},\n\nThanks for contacting us about "${inquiry.subject}". ${categoryLine}\n\nBest,\nCustomer Support Team`;
}
