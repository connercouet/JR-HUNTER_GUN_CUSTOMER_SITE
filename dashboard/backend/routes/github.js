import { Router } from 'express';
import { Octokit } from '@octokit/rest';

const router = Router();

function getOctokit() {
  if (!process.env.GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN not configured. Add it to your .env file.');
  }
  return new Octokit({ auth: process.env.GITHUB_TOKEN });
}

const OWNER = process.env.GITHUB_USERNAME || 'connercouet';

// ─── Status ──────────────────────────────────────────────────
router.get('/status', (req, res) => {
  res.json({ connected: !!process.env.GITHUB_TOKEN, owner: OWNER });
});

// ─── Repos ───────────────────────────────────────────────────
router.get('/repos', async (req, res) => {
  try {
    const octokit = getOctokit();
    const { data } = await octokit.repos.listForUser({
      username: OWNER,
      sort: 'updated',
      per_page: 20,
    });

    res.json({
      repos: data.map(r => ({
        id: r.id,
        name: r.name,
        fullName: r.full_name,
        description: r.description,
        url: r.html_url,
        defaultBranch: r.default_branch,
        updatedAt: r.updated_at,
        openIssues: r.open_issues_count,
        stars: r.stargazers_count,
        private: r.private,
      })),
    });
  } catch (err) {
    res.status(err.message.includes('not configured') ? 401 : 500).json({ error: err.message });
  }
});

// ─── Issues for JR-HUNTER repo ───────────────────────────────
router.get('/issues', async (req, res) => {
  try {
    const octokit = getOctokit();
    const repo = req.query.repo || 'jr-hunter_gun_customer_site';
    const state = req.query.state || 'open';

    const { data } = await octokit.issues.listForRepo({
      owner: OWNER,
      repo,
      state,
      per_page: 30,
    });

    res.json({
      issues: data.filter(i => !i.pull_request).map(i => ({
        id: i.id,
        number: i.number,
        title: i.title,
        body: i.body,
        state: i.state,
        labels: i.labels.map(l => ({ name: l.name, color: l.color })),
        createdAt: i.created_at,
        updatedAt: i.updated_at,
        url: i.html_url,
        user: i.user.login,
      })),
    });
  } catch (err) {
    res.status(err.message.includes('not configured') ? 401 : 500).json({ error: err.message });
  }
});

// ─── Pull Requests ────────────────────────────────────────────
router.get('/pulls', async (req, res) => {
  try {
    const octokit = getOctokit();
    const repo = req.query.repo || 'jr-hunter_gun_customer_site';
    const state = req.query.state || 'open';

    const { data } = await octokit.pulls.list({
      owner: OWNER,
      repo,
      state,
      per_page: 20,
    });

    res.json({
      pulls: data.map(p => ({
        id: p.id,
        number: p.number,
        title: p.title,
        state: p.state,
        branch: p.head.ref,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        url: p.html_url,
        user: p.user.login,
        draft: p.draft,
      })),
    });
  } catch (err) {
    res.status(err.message.includes('not configured') ? 401 : 500).json({ error: err.message });
  }
});

// ─── Recent Activity (all repos) ─────────────────────────────
router.get('/activity', async (req, res) => {
  try {
    const octokit = getOctokit();

    const { data } = await octokit.activity.listPublicEventsForUser({
      username: OWNER,
      per_page: 30,
    });

    const activity = data.map(e => ({
      id: e.id,
      type: e.type,
      repo: e.repo.name,
      createdAt: e.created_at,
      payload: summarizePayload(e.type, e.payload),
    }));

    res.json({ activity, capturedAt: new Date().toISOString() });
  } catch (err) {
    res.status(err.message.includes('not configured') ? 401 : 500).json({ error: err.message });
  }
});

// ─── Commits for JR-HUNTER repo ──────────────────────────────
router.get('/commits', async (req, res) => {
  try {
    const octokit = getOctokit();
    const repo = req.query.repo || 'jr-hunter_gun_customer_site';

    const { data } = await octokit.repos.listCommits({
      owner: OWNER,
      repo,
      per_page: 15,
    });

    res.json({
      commits: data.map(c => ({
        sha: c.sha.slice(0, 7),
        message: c.commit.message.split('\n')[0],
        author: c.commit.author.name,
        date: c.commit.author.date,
        url: c.html_url,
      })),
    });
  } catch (err) {
    res.status(err.message.includes('not configured') ? 401 : 500).json({ error: err.message });
  }
});

// ─── Create Issue ─────────────────────────────────────────────
router.post('/issues', async (req, res) => {
  try {
    const octokit = getOctokit();
    const { repo = 'jr-hunter_gun_customer_site', title, body, labels = [] } = req.body;

    if (!title) return res.status(400).json({ error: 'title required' });

    const { data } = await octokit.issues.create({
      owner: OWNER,
      repo,
      title,
      body,
      labels,
    });

    res.json({ success: true, issue: { number: data.number, url: data.html_url, title: data.title } });
  } catch (err) {
    res.status(err.message.includes('not configured') ? 401 : 500).json({ error: err.message });
  }
});

// ─── Helper ──────────────────────────────────────────────────
function summarizePayload(type, payload) {
  switch (type) {
    case 'PushEvent':
      return `Pushed ${payload.commits?.length || 0} commit(s): ${payload.commits?.[0]?.message?.slice(0, 60) || ''}`;
    case 'IssuesEvent':
      return `${payload.action} issue: ${payload.issue?.title?.slice(0, 60) || ''}`;
    case 'PullRequestEvent':
      return `${payload.action} PR: ${payload.pull_request?.title?.slice(0, 60) || ''}`;
    case 'CreateEvent':
      return `Created ${payload.ref_type}: ${payload.ref || ''}`;
    case 'WatchEvent':
      return `Starred a repo`;
    default:
      return type.replace('Event', '');
  }
}

export default router;
