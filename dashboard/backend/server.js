import express from 'express';
import cors from 'cors';
import session from 'express-session';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import claudeRoutes from './routes/claude.js';
import googleRoutes from './routes/google.js';
import githubRoutes from './routes/github.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ───────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'hunters-edge-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 }, // 7 days
}));

// ─── Data Helpers ─────────────────────────────────────────────
export function readData(filename, defaultValue = []) {
  const filepath = join(__dirname, 'data', filename);
  if (!existsSync(filepath)) return defaultValue;
  try {
    return JSON.parse(readFileSync(filepath, 'utf-8'));
  } catch {
    return defaultValue;
  }
}

export function writeData(filename, data) {
  const dir = join(__dirname, 'data');
  if (!existsSync(dir)) {
    import('fs').then(fs => fs.mkdirSync(dir, { recursive: true }));
  }
  writeFileSync(join(dir, filename), JSON.stringify(data, null, 2));
}

// ─── Routes ──────────────────────────────────────────────────
app.use('/api/claude', claudeRoutes);
app.use('/api/google', googleRoutes);
app.use('/api/github', githubRoutes);

// ─── Config / Status ─────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.get('/api/config', (req, res) => {
  const config = readData('config.json', {});
  res.json({
    hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
    hasGoogleCreds: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    hasGitHubToken: !!process.env.GITHUB_TOKEN,
    isGoogleAuthenticated: !!(readData('tokens.json', null)),
    businessName: config.businessName || "Hunter's Edge",
    ownerName: config.ownerName || '',
  });
});

app.post('/api/config', (req, res) => {
  const existing = readData('config.json', {});
  const updated = { ...existing, ...req.body };
  writeData('config.json', updated);
  res.json({ success: true });
});

// ─── Tasks API (local JSON storage) ──────────────────────────
app.get('/api/tasks', (req, res) => {
  res.json(readData('tasks.json', []));
});

app.post('/api/tasks', (req, res) => {
  const tasks = readData('tasks.json', []);
  const task = {
    id: Date.now().toString(),
    ...req.body,
    createdAt: new Date().toISOString(),
    completed: false,
  };
  tasks.push(task);
  writeData('tasks.json', tasks);
  res.json(task);
});

app.put('/api/tasks/:id', (req, res) => {
  const tasks = readData('tasks.json', []);
  const idx = tasks.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Task not found' });
  tasks[idx] = { ...tasks[idx], ...req.body, updatedAt: new Date().toISOString() };
  writeData('tasks.json', tasks);
  res.json(tasks[idx]);
});

app.delete('/api/tasks/:id', (req, res) => {
  let tasks = readData('tasks.json', []);
  tasks = tasks.filter(t => t.id !== req.params.id);
  writeData('tasks.json', tasks);
  res.json({ success: true });
});

// ─── Customers API (local JSON storage) ──────────────────────
app.get('/api/customers', (req, res) => {
  res.json(readData('customers.json', []));
});

app.post('/api/customers', (req, res) => {
  const customers = readData('customers.json', []);
  const customer = {
    id: Date.now().toString(),
    ...req.body,
    createdAt: new Date().toISOString(),
    status: req.body.status || 'lead',
    notes: req.body.notes || '',
  };
  customers.push(customer);
  writeData('customers.json', customers);
  res.json(customer);
});

app.put('/api/customers/:id', (req, res) => {
  const customers = readData('customers.json', []);
  const idx = customers.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Customer not found' });
  customers[idx] = { ...customers[idx], ...req.body, updatedAt: new Date().toISOString() };
  writeData('customers.json', customers);
  res.json(customers[idx]);
});

app.delete('/api/customers/:id', (req, res) => {
  let customers = readData('customers.json', []);
  customers = customers.filter(c => c.id !== req.params.id);
  writeData('customers.json', customers);
  res.json({ success: true });
});

// ─── Briefings (stored results from cron) ────────────────────
app.get('/api/briefings/latest', (req, res) => {
  const briefings = readData('briefings.json', []);
  res.json(briefings[briefings.length - 1] || null);
});

app.get('/api/briefings', (req, res) => {
  res.json(readData('briefings.json', []));
});

// ─── Automated Cron Jobs ──────────────────────────────────────

// Daily briefing — 7:30 AM every day
cron.schedule('30 7 * * *', async () => {
  console.log('[CRON] Generating daily briefing...');
  try {
    const response = await fetch(`http://localhost:${PORT}/api/claude/briefing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ automated: true }),
    });
    const briefing = await response.json();
    const briefings = readData('briefings.json', []);
    briefings.push({ ...briefing, generatedAt: new Date().toISOString(), automated: true });
    if (briefings.length > 30) briefings.splice(0, briefings.length - 30); // keep last 30
    writeData('briefings.json', briefings);
    console.log('[CRON] Daily briefing saved.');
  } catch (err) {
    console.error('[CRON] Briefing failed:', err.message);
  }
});

// Weekly marketing content — Monday 9:00 AM
cron.schedule('0 9 * * 1', async () => {
  console.log('[CRON] Generating weekly marketing content...');
  try {
    const response = await fetch(`http://localhost:${PORT}/api/claude/content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'weekly_plan',
        automated: true,
        prompt: "Generate a full week of marketing content for Junior Hunter Gun — a camera-integrated training shotgun for youth hunters ages 8-16. Include: 5 social media posts (Instagram/Facebook), 2 email subject lines for the testing program, and 1 short blog post idea. Focus on safety, family values, and getting kids into hunting.",
      }),
    });
    const content = await response.json();
    const existing = readData('marketing_queue.json', []);
    existing.push({ ...content, generatedAt: new Date().toISOString(), automated: true, type: 'weekly_plan' });
    writeData('marketing_queue.json', existing);
    console.log('[CRON] Weekly marketing content saved.');
  } catch (err) {
    console.error('[CRON] Marketing content failed:', err.message);
  }
});

// GitHub activity digest — every day at 6:00 PM
cron.schedule('0 18 * * *', async () => {
  console.log('[CRON] Fetching GitHub activity digest...');
  try {
    const response = await fetch(`http://localhost:${PORT}/api/github/activity`);
    const data = await response.json();
    const digests = readData('github_digests.json', []);
    digests.push({ ...data, capturedAt: new Date().toISOString() });
    if (digests.length > 30) digests.splice(0, digests.length - 30);
    writeData('github_digests.json', digests);
    console.log('[CRON] GitHub digest saved.');
  } catch (err) {
    console.error('[CRON] GitHub digest failed:', err.message);
  }
});

// ─── Start ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🦅 Hunter's Edge Dashboard Backend`);
  console.log(`   Running on http://localhost:${PORT}`);
  console.log(`   Anthropic API: ${process.env.ANTHROPIC_API_KEY ? '✓ Connected' : '✗ Not configured'}`);
  console.log(`   Google OAuth:  ${process.env.GOOGLE_CLIENT_ID ? '✓ Configured' : '✗ Not configured'}`);
  console.log(`   GitHub Token:  ${process.env.GITHUB_TOKEN ? '✓ Connected' : '✗ Not configured'}\n`);
});
