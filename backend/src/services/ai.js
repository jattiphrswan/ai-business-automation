/**
 * AI Provider Service:
 * Automatically uses Google Gemini or OpenAI when an API key is configured.
 * Seamlessly falls back to local rules-based engine if no keys are present.
 */

// Local fallback rules
const categoryKeywords = [
  { category: 'billing', terms: ['invoice', 'refund', 'payment', 'charged', 'billing', 'chargeback', 'subscription'] },
  { category: 'sales', terms: ['pricing', 'quote', 'demo', 'purchase', 'buy', 'enterprise', 'discount', 'contract'] },
  { category: 'support', terms: ['broken', 'error', 'bug', 'not working', 'help', 'crash', 'down', 'issue'] },
  { category: 'account', terms: ['password', 'login', 'access', 'account', '2fa', 'reset'] },
];

const sensitiveTerms = ['refund', 'legal', 'lawsuit', 'lawyer', 'delete my data', 'security breach', 'chargeback', 'cancel contract'];
const urgentTerms = ['urgent', 'asap', 'emergency', 'outage', 'critical', 'immediately', 'down'];

function localAnalyze(name, subject, message) {
  const text = `${subject} ${message}`.toLowerCase();
  const category = categoryKeywords.find((group) => group.terms.some((term) => text.includes(term)))?.category || 'general';
  const isSensitive = sensitiveTerms.some((term) => text.includes(term));
  const isUrgent = urgentTerms.some((term) => text.includes(term));
  const priority = isUrgent || isSensitive ? 'high' : 'normal';
  const requiresApproval = isUrgent || isSensitive;

  const categoryLines = {
    billing: 'Our billing team is currently reviewing your account and will follow up shortly.',
    sales: 'Our team will review your requirements and share tailored options with you.',
    support: 'Our technical support team is investigating this issue and will be in touch.',
    account: 'Our security and account team will assist you with verifying and restoring access.',
    general: 'We have received your message and our team will follow up as soon as possible.',
  };

  const draft = `Hi ${name},\n\nThank you for reaching out regarding "${subject}".\n\n${categoryLines[category] || categoryLines.general}\n\nBest regards,\nCustomer Operations Team`;

  return {
    category,
    priority,
    requiresApproval,
    sentiment: isSensitive || isUrgent ? 'negative' : 'neutral',
    confidence: 0.75,
    method: 'rules-engine',
    draft,
  };
}

// Call Google Gemini API
async function callGemini(apiKey, name, subject, message) {
  const prompt = `You are an AI customer operations assistant. Analyze the incoming customer inquiry and draft a helpful, professional response.

Customer Name: ${name}
Subject: ${subject}
Message: ${message}

Respond ONLY with valid JSON in this exact structure:
{
  "category": "billing" | "sales" | "support" | "account" | "general",
  "priority": "high" | "normal",
  "requiresApproval": boolean (set true if user asks for refund, mentions legal action, reports severe outage, or expresses extreme urgency),
  "sentiment": "positive" | "neutral" | "negative",
  "confidence": number between 0.8 and 0.99,
  "draft": "polite, personalized email response addressing their specific points directly"
}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  const parsed = JSON.parse(rawText);

  return {
    category: parsed.category || 'general',
    priority: parsed.priority === 'high' ? 'high' : 'normal',
    requiresApproval: Boolean(parsed.requiresApproval),
    sentiment: parsed.sentiment || 'neutral',
    confidence: parsed.confidence || 0.95,
    method: 'gemini-2.0-flash',
    draft: parsed.draft,
  };
}

// Call OpenAI API
async function callOpenAI(apiKey, name, subject, message) {
  const prompt = `Analyze this customer inquiry and return JSON with keys: category (billing|sales|support|account|general), priority (high|normal), requiresApproval (boolean, true for refunds, legal, severe bugs), sentiment (positive|neutral|negative), draft (professional email reply).

Customer: ${name}
Subject: ${subject}
Message: ${message}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const parsed = JSON.parse(data.choices[0].message.content);

  return {
    category: parsed.category || 'general',
    priority: parsed.priority === 'high' ? 'high' : 'normal',
    requiresApproval: Boolean(parsed.requiresApproval),
    sentiment: parsed.sentiment || 'neutral',
    confidence: 0.96,
    method: 'gpt-4o-mini',
    draft: parsed.draft,
  };
}

/**
 * Main export: Analyzes the inquiry and drafts a response.
 */
export async function analyzeAndDraft(name, subject, message) {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (geminiKey) {
    try {
      return await callGemini(geminiKey, name, subject, message);
    } catch (err) {
      console.warn('Gemini call failed, falling back to local engine:', err.message);
    }
  }

  if (openaiKey) {
    try {
      return await callOpenAI(openaiKey, name, subject, message);
    } catch (err) {
      console.warn('OpenAI call failed, falling back to local engine:', err.message);
    }
  }

  return localAnalyze(name, subject, message);
}
