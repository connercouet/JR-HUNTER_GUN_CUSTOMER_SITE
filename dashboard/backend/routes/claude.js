import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { readData, writeData } from '../server.js';

const router = Router();

function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not configured. Add it to your .env file.');
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

const SYSTEM_PROMPT = `You are the personal business AI assistant for Hunter's Edge, a hunting industry company run by a solo founder.

Hunter's Edge currently has one flagship product: the Junior Hunter Gun — a camera-integrated training shotgun that helps youth hunters ages 8-16 practice safe handling, proper form, and aiming without live ammunition. The business is in pre-launch / customer testing phase.

Your role:
- Help prioritize tasks and cut through overwhelm
- Draft professional, on-brand communications
- Generate marketing content that resonates with hunting families
- Provide clear, actionable business advice
- Summarize information concisely — the founder is busy

Brand voice: Authentic, safety-focused, family-oriented, outdoors lifestyle. Not corporate. Think: experienced hunter mentor, not salesperson.

Always be direct and action-oriented. The founder is building alone and needs clarity, not fluff.`;

// ─── Chat ────────────────────────────────────────────────────
router.post('/chat', async (req, res) => {
  try {
    const client = getClient();
    const { messages, systemAddendum = '' } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array required' });
    }

    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 2048,
      system: SYSTEM_PROMPT + (systemAddendum ? '\n\n' + systemAddendum : ''),
      messages,
    });

    res.json({ content: response.content[0].text, usage: response.usage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Daily Briefing ──────────────────────────────────────────
router.post('/briefing', async (req, res) => {
  try {
    const client = getClient();
    const { calendarEvents = [], unreadEmailCount = 0, githubActivity = {}, tasks = [] } = req.body;

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const pendingTasks = tasks.filter(t => !t.completed);

    const prompt = `Generate today's business briefing for Hunter's Edge. Today is ${today}.

Context:
- Upcoming calendar events today: ${calendarEvents.length > 0 ? JSON.stringify(calendarEvents) : 'None scheduled'}
- Unread emails: ${unreadEmailCount}
- Pending tasks: ${pendingTasks.length > 0 ? pendingTasks.map(t => t.title).join(', ') : 'None'}
- Recent GitHub activity: ${Object.keys(githubActivity).length > 0 ? JSON.stringify(githubActivity) : 'No recent activity'}

Please provide:
1. **Good morning message** (1 sentence, motivational but grounded)
2. **Top 3 priorities for today** (specific, actionable — if no context, suggest high-value pre-launch activities for Junior Hunter Gun)
3. **Quick wins** (2-3 things that can be done in under 15 minutes)
4. **Watch out for** (any flags based on the context above)
5. **Marketing thought of the day** (one content idea or channel to focus on)

Format with clear sections. Be concise — bullet points preferred.`;

    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    const briefing = {
      content: response.content[0].text,
      date: new Date().toISOString(),
      context: { calendarEvents, unreadEmailCount, pendingTaskCount: pendingTasks.length },
    };

    // Save briefing
    const briefings = readData('briefings.json', []);
    briefings.push(briefing);
    if (briefings.length > 30) briefings.splice(0, briefings.length - 30);
    writeData('briefings.json', briefings);

    res.json(briefing);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Email Draft ─────────────────────────────────────────────
router.post('/email-draft', async (req, res) => {
  try {
    const client = getClient();
    const { originalEmail, instruction = 'Reply professionally' } = req.body;

    const prompt = `Draft a reply to this email for Hunter's Edge / Junior Hunter Gun.

Original email:
${originalEmail}

Instruction: ${instruction}

Draft a reply that:
- Matches the Hunter's Edge brand voice (authentic, helpful, not salesy)
- Is appropriately concise
- Addresses all points raised
- Includes a clear next step or call to action if appropriate

Provide ONLY the email body text, no subject line or headers.`;

    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    res.json({ draft: response.content[0].text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Email Summary ───────────────────────────────────────────
router.post('/email-summary', async (req, res) => {
  try {
    const client = getClient();
    const { emails } = req.body;

    if (!emails || emails.length === 0) {
      return res.json({ summary: 'No emails to summarize.' });
    }

    const prompt = `Summarize these emails for a busy founder. Identify: who sent them, what action (if any) is needed, and priority level (high/medium/low).

Emails:
${emails.map((e, i) => `${i + 1}. From: ${e.from} | Subject: ${e.subject} | Snippet: ${e.snippet}`).join('\n')}

Format as a brief bulleted list. Flag anything that looks like a customer inquiry about Junior Hunter Gun as HIGH priority.`;

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    res.json({ summary: response.content[0].text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Marketing Content Generator ─────────────────────────────
router.post('/content', async (req, res) => {
  try {
    const client = getClient();
    const { type, prompt: userPrompt, platform, topic } = req.body;

    let prompt = '';

    const contentPrompts = {
      social_post: `Write a social media post for Junior Hunter Gun for ${platform || 'Instagram/Facebook'}.
Topic/angle: ${topic || 'youth hunting safety and the Junior Hunter Gun product'}
Requirements: Engaging, authentic hunting voice, 1-3 sentences + relevant hashtags. Include a subtle call to action.`,

      email_campaign: `Write a marketing email for Junior Hunter Gun's customer testing program.
Topic: ${topic || 'Join our testing program'}
Requirements: Subject line + 150-200 word email body. Conversational, not salesy. Target audience: parents of youth hunters ages 8-16.`,

      blog_post: `Write a blog post outline for Hunter's Edge.
Topic: ${topic || 'Teaching kids proper gun safety through training tools'}
Requirements: SEO-friendly title, intro paragraph, 4-5 main sections with bullet points, conclusion with CTA.`,

      ad_copy: `Write ad copy for Junior Hunter Gun.
Platform: ${platform || 'Facebook/Instagram'}
Topic: ${topic || 'Youth hunter training safety'}
Requirements: Headline (5-7 words) + primary text (2-3 sentences) + description (1 sentence). Focus on the benefit to parents.`,

      weekly_plan: `Generate a week of marketing content for Junior Hunter Gun.
Create: 5 social posts (one per weekday), 2 email subject line options, 1 blog post idea.`,
    };

    prompt = contentPrompts[type] || userPrompt || contentPrompts.social_post;

    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    const result = {
      content: response.content[0].text,
      type,
      platform,
      topic,
      generatedAt: new Date().toISOString(),
    };

    // Save to marketing queue
    const queue = readData('marketing_queue.json', []);
    queue.unshift(result);
    if (queue.length > 100) queue.splice(100);
    writeData('marketing_queue.json', queue);

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Task Prioritization ──────────────────────────────────────
router.post('/prioritize', async (req, res) => {
  try {
    const client = getClient();
    const { tasks, context = '' } = req.body;

    if (!tasks || tasks.length === 0) {
      return res.json({ prioritized: [], reasoning: 'No tasks to prioritize.' });
    }

    const prompt = `Prioritize these tasks for a solo founder of Hunter's Edge (pre-launch hunting product company).
${context ? `Additional context: ${context}` : ''}

Tasks:
${tasks.map((t, i) => `${i + 1}. ${t.title}${t.description ? ' — ' + t.description : ''}`).join('\n')}

Return the tasks in priority order (1 = most important). For each, give a one-sentence reason WHY it's that priority.
Format as JSON array: [{"id": "...", "title": "...", "priority": 1, "reason": "..."}]
Respond with ONLY the JSON array, no other text.`;

    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    let prioritized = [];
    try {
      const jsonText = response.content[0].text.trim();
      prioritized = JSON.parse(jsonText);
    } catch {
      prioritized = tasks.map((t, i) => ({ ...t, priority: i + 1, reason: 'Prioritization parse error — manual review needed.' }));
    }

    res.json({ prioritized });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Marketing Queue (saved content) ─────────────────────────
router.get('/content/queue', (req, res) => {
  res.json(readData('marketing_queue.json', []));
});

router.delete('/content/queue/:index', (req, res) => {
  const queue = readData('marketing_queue.json', []);
  const idx = parseInt(req.params.index);
  if (idx >= 0 && idx < queue.length) {
    queue.splice(idx, 1);
    writeData('marketing_queue.json', queue);
  }
  res.json({ success: true });
});

export default router;
