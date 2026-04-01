import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api.js';

function renderMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-100">$1</strong>')
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold text-brand-300 mt-3 mb-0.5">$1</h3>')
    .replace(/^## (.+)$/gm, '<h3 class="text-sm font-semibold text-brand-300 mt-3 mb-0.5">$1</h3>')
    .replace(/^# (.+)$/gm, '<h3 class="text-sm font-semibold text-brand-300 mt-3 mb-0.5">$1</h3>')
    .replace(/^- (.+)$/gm, '<li class="text-slate-300">$1</li>')
    .replace(/(<li.*<\/li>)/s, '<ul class="list-disc pl-4 space-y-0.5 my-1">$1</ul>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

export default function DashboardHome() {
  const [briefing, setBriefing] = useState(null);
  const [stats, setStats] = useState({ emails: null, events: null, tasks: null, customers: null });
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      const [latestBriefing, tasks, customers] = await Promise.allSettled([
        api.briefings.getLatest(),
        api.tasks.getAll(),
        api.customers.getAll(),
      ]);

      if (latestBriefing.status === 'fulfilled') setBriefing(latestBriefing.value);

      const taskList = tasks.status === 'fulfilled' ? tasks.value : [];
      const customerList = customers.status === 'fulfilled' ? customers.value : [];

      setStats(s => ({
        ...s,
        tasks: taskList.filter(t => !t.completed).length,
        customers: customerList.length,
      }));

      // Try to get email/calendar counts
      try {
        const unread = await api.google.gmail.getUnreadCount();
        setStats(s => ({ ...s, emails: unread.count }));
      } catch {}

      try {
        const todayEvents = await api.google.calendar.getToday();
        setStats(s => ({ ...s, events: todayEvents.events?.length || 0 }));
      } catch {}
    } catch (err) {
      console.error(err);
    }
  }

  async function generateBriefing() {
    setGenerating(true);
    setError('');
    try {
      const [tasks, todayEvents] = await Promise.allSettled([
        api.tasks.getAll(),
        api.google.calendar.getToday(),
      ]);

      const taskList = tasks.status === 'fulfilled' ? tasks.value : [];
      let calendarEvents = [];
      try { calendarEvents = todayEvents.value?.events || []; } catch {}

      let unreadEmailCount = 0;
      try {
        const u = await api.google.gmail.getUnreadCount();
        unreadEmailCount = u.count;
      } catch {}

      const result = await api.claude.briefing({
        calendarEvents: calendarEvents.map(e => ({ summary: e.summary, start: e.start })),
        unreadEmailCount,
        tasks: taskList,
      });
      setBriefing(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  const statCards = [
    { label: 'Unread Emails', value: stats.emails, icon: '📧', to: '/email', color: 'text-blue-400' },
    { label: 'Events Today', value: stats.events, icon: '📅', to: '/calendar', color: 'text-purple-400' },
    { label: 'Open Tasks', value: stats.tasks, icon: '✅', to: '/tasks', color: 'text-brand-400' },
    { label: 'Customers', value: stats.customers, icon: '👥', to: '/customers', color: 'text-accent-500' },
  ];

  const quickActions = [
    { label: 'Draft Marketing Post', icon: '📣', to: '/marketing', color: 'bg-accent-500/10 text-accent-400 border-accent-500/20' },
    { label: 'Add Customer Lead', icon: '👤', to: '/customers', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    { label: 'Ask Claude', icon: '🤖', to: '/ai', color: 'bg-brand-500/10 text-brand-400 border-brand-500/20' },
    { label: 'Add Task', icon: '➕', to: '/tasks', color: 'bg-slate-700 text-slate-300 border-slate-600' },
  ];

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Greeting */}
      <div>
        <h2 className="font-serif text-2xl font-semibold text-slate-100">
          Good {getTimeOfDay()} 🦅
        </h2>
        <p className="text-slate-400 text-sm mt-0.5">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map(({ label, value, icon, to, color }) => (
          <Link key={label} to={to} className="card-hover p-4 block">
            <div className="flex items-start justify-between">
              <span className="text-xl">{icon}</span>
              <span className={`text-2xl font-bold font-serif ${color}`}>
                {value === null ? '—' : value}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2">{label}</p>
          </Link>
        ))}
      </div>

      {/* Daily Briefing */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title">🌅 Daily Briefing</h3>
          <button
            className={`btn-primary text-xs px-3 py-1.5 ${generating ? 'opacity-70' : ''}`}
            onClick={generateBriefing}
            disabled={generating}
          >
            {generating ? (
              <span className="flex items-center gap-1.5">
                <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
              </span>
            ) : briefing ? 'Regenerate' : 'Generate Briefing'}
          </button>
        </div>

        {error && (
          <div className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2 mb-3">
            {error}
          </div>
        )}

        {briefing ? (
          <div>
            <div
              className="ai-content text-sm"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(briefing.content) }}
            />
            <p className="text-xs text-slate-600 mt-3">
              Generated {new Date(briefing.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              {briefing.automated && ' (automated)'}
            </p>
          </div>
        ) : (
          <div className="text-center py-6 text-slate-500">
            <p className="text-sm">Click "Generate Briefing" to get your AI-powered daily plan.</p>
            <p className="text-xs mt-1 text-slate-600">Automatically generated each morning at 7:30 AM.</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="section-title mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-2">
          {quickActions.map(({ label, icon, to, color }) => (
            <Link
              key={label}
              to={to}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium transition-opacity hover:opacity-80 ${color}`}
            >
              <span className="text-base">{icon}</span>
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* Junior Hunter Gun Status */}
      <div className="card p-5">
        <h3 className="section-title mb-3">🔫 Junior Hunter Gun — Pre-Launch Status</h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-slate-800 rounded-lg p-3">
            <div className="text-lg font-bold text-brand-400 font-serif">8–16</div>
            <div className="text-xs text-slate-500 mt-0.5">Target Age</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-3">
            <div className="text-lg font-bold text-accent-500 font-serif">Testing</div>
            <div className="text-xs text-slate-500 mt-0.5">Phase</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-3">
            <div className="text-lg font-bold text-blue-400 font-serif">Pre</div>
            <div className="text-xs text-slate-500 mt-0.5">Launch</div>
          </div>
        </div>
        <div className="mt-3 flex gap-2 flex-wrap">
          <Link to="/marketing" className="badge badge-green text-xs">📣 Create marketing content</Link>
          <Link to="/customers" className="badge badge-blue text-xs">👥 View leads</Link>
          <Link to="/github" className="badge badge-gray text-xs">💻 Website status</Link>
        </div>
      </div>
    </div>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
