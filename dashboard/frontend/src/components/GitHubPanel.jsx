import React, { useState, useEffect } from 'react';
import api from '../utils/api.js';

export default function GitHubPanel() {
  const [repos, setRepos] = useState([]);
  const [issues, setIssues] = useState([]);
  const [pulls, setPulls] = useState([]);
  const [commits, setCommits] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [newIssue, setNewIssue] = useState({ title: '', body: '' });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    setError('');
    try {
      const results = await Promise.allSettled([
        api.github.getRepos(),
        api.github.getIssues(),
        api.github.getPulls(),
        api.github.getCommits(),
        api.github.getActivity(),
      ]);
      if (results[0].status === 'fulfilled') setRepos(results[0].value.repos || []);
      if (results[1].status === 'fulfilled') setIssues(results[1].value.issues || []);
      if (results[2].status === 'fulfilled') setPulls(results[2].value.pulls || []);
      if (results[3].status === 'fulfilled') setCommits(results[3].value.commits || []);
      if (results[4].status === 'fulfilled') setActivity(results[4].value.activity || []);

      if (results[0].status === 'rejected') {
        setError(results[0].reason.message.includes('not configured')
          ? 'Add your GITHUB_TOKEN to .env to connect GitHub.'
          : results[0].reason.message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function createIssue() {
    if (!newIssue.title) return;
    setSaving(true);
    try {
      const result = await api.github.createIssue(newIssue);
      setSuccess(`Issue #${result.issue.number} created!`);
      setCreating(false);
      setNewIssue({ title: '', body: '' });
      loadAll();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const juniorHunterRepo = repos.find(r => r.name.toLowerCase().includes('hunter'));

  return (
    <div className="space-y-4 pb-20 lg:pb-0">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="section-title">💻 GitHub</h2>
          <p className="text-xs text-slate-500 mt-0.5">connercouet — JR-HUNTER_GUN_CUSTOMER_SITE</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary text-xs px-3 py-1.5" onClick={loadAll}>Refresh</button>
          <button className="btn-primary text-xs px-3 py-1.5" onClick={() => setCreating(c => !c)}>+ Issue</button>
        </div>
      </div>

      {error && (
        <div className="card p-4 border-amber-800 bg-amber-900/10 text-amber-300 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="card p-3 border-green-800 bg-green-900/20 text-green-300 text-sm">{success}</div>
      )}

      {/* Create Issue */}
      {creating && (
        <div className="card p-4 border-brand-700 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-200 text-sm">New Issue</span>
            <button className="text-slate-500" onClick={() => setCreating(false)}>✕</button>
          </div>
          <input className="input text-sm" placeholder="Issue title *" value={newIssue.title} onChange={e => setNewIssue(n => ({ ...n, title: e.target.value }))} />
          <textarea className="input text-sm" placeholder="Description (optional)" rows={3} value={newIssue.body} onChange={e => setNewIssue(n => ({ ...n, body: e.target.value }))} />
          <div className="flex gap-2">
            <button className="btn-secondary text-sm flex-1" onClick={() => setCreating(false)}>Cancel</button>
            <button className="btn-primary text-sm flex-1" onClick={createIssue} disabled={saving}>{saving ? 'Creating...' : 'Create Issue'}</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="card p-4 h-16 animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* JR-HUNTER Repo highlight */}
          {juniorHunterRepo && (
            <div className="card p-4 border-brand-700">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">💻</span>
                    <span className="font-medium text-slate-100 text-sm">{juniorHunterRepo.name}</span>
                    {juniorHunterRepo.private && <span className="badge badge-gray text-xs">private</span>}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{juniorHunterRepo.description || 'JR-HUNTER Gun Customer Site'}</p>
                </div>
                <a href={juniorHunterRepo.url} target="_blank" rel="noopener noreferrer" className="badge badge-green text-xs hover:opacity-80">View →</a>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="bg-slate-800 rounded-lg p-2 text-center">
                  <div className="text-base font-bold text-red-400">{juniorHunterRepo.openIssues}</div>
                  <div className="text-xs text-slate-500">Open Issues</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-2 text-center">
                  <div className="text-base font-bold text-yellow-400">{pulls.length}</div>
                  <div className="text-xs text-slate-500">Open PRs</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-2 text-center">
                  <div className="text-xs font-semibold text-brand-400 leading-tight">{juniorHunterRepo.defaultBranch}</div>
                  <div className="text-xs text-slate-500">Branch</div>
                </div>
              </div>
            </div>
          )}

          {/* Issues */}
          <div>
            <h3 className="section-title mb-2 text-sm">Open Issues</h3>
            {issues.length === 0 ? (
              <div className="card p-3 text-xs text-slate-500 text-center">No open issues. 🎉</div>
            ) : (
              <div className="space-y-1.5">
                {issues.map(issue => (
                  <a
                    key={issue.id}
                    href={issue.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="card-hover p-3 flex items-start gap-2 block"
                  >
                    <span className="text-red-400 text-xs mt-0.5">⬤</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-slate-200 font-medium">#{issue.number} {issue.title}</div>
                      <div className="flex gap-1.5 mt-1 flex-wrap">
                        {issue.labels.map(l => (
                          <span key={l.name} className="badge badge-gray text-xs" style={{ borderColor: `#${l.color}40`, color: `#${l.color}` }}>
                            {l.name}
                          </span>
                        ))}
                        <span className="text-xs text-slate-600">
                          {new Date(issue.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Recent Commits */}
          {commits.length > 0 && (
            <div>
              <h3 className="section-title mb-2 text-sm">Recent Commits</h3>
              <div className="space-y-1.5">
                {commits.slice(0, 7).map(c => (
                  <a
                    key={c.sha}
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="card-hover p-3 flex items-start gap-2 block"
                  >
                    <span className="font-mono text-xs text-brand-400 mt-0.5 flex-shrink-0">{c.sha}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-slate-300 truncate">{c.message}</div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        {c.author} · {new Date(c.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Recent Activity */}
          {activity.length > 0 && (
            <div>
              <h3 className="section-title mb-2 text-sm">Activity Feed</h3>
              <div className="space-y-1.5">
                {activity.slice(0, 8).map(evt => (
                  <div key={evt.id} className="card p-3 flex items-start gap-2">
                    <span className="text-xs text-slate-600 mt-0.5 flex-shrink-0 w-14 text-right">
                      {new Date(evt.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-slate-400">{evt.payload}</div>
                      <div className="text-xs text-slate-600 mt-0.5">{evt.repo}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
