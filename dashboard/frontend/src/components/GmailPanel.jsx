import React, { useState, useEffect } from 'react';
import api from '../utils/api.js';

export default function GmailPanel() {
  const [emails, setEmails] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [summarizing, setSummarizing] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [draft, setDraft] = useState('');
  const [draftInstruction, setDraftInstruction] = useState('Reply professionally and helpfully');
  const [composing, setComposing] = useState(false);
  const [composeData, setComposeData] = useState({ to: '', subject: '', body: '' });
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState('');

  useEffect(() => {
    loadInbox();
  }, []);

  async function loadInbox() {
    setLoading(true);
    setError('');
    try {
      const { messages } = await api.google.gmail.getInbox({ limit: 25 });
      setEmails(messages);
    } catch (err) {
      setError(err.message.includes('not connected') ? 'Connect your Google account in the setup wizard to use email.' : err.message);
    } finally {
      setLoading(false);
    }
  }

  async function openEmail(email) {
    setSelected(null);
    setDraft('');
    setAiSummary('');
    try {
      const full = await api.google.gmail.getMessage(email.id);
      setSelected(full);
    } catch {
      setSelected(email);
    }
  }

  async function summarizeInbox() {
    setSummarizing(true);
    setAiSummary('');
    try {
      const { summary } = await api.claude.emailSummary(
        emails.slice(0, 15).map(e => ({ from: e.from, subject: e.subject, snippet: e.snippet }))
      );
      setAiSummary(summary);
    } catch (err) {
      setAiSummary('Error: ' + err.message);
    } finally {
      setSummarizing(false);
    }
  }

  async function generateDraft() {
    if (!selected) return;
    setDrafting(true);
    setDraft('');
    try {
      const emailText = `From: ${selected.from}\nSubject: ${selected.subject}\n\n${selected.body || selected.snippet}`;
      const { draft: d } = await api.claude.emailDraft(emailText, draftInstruction);
      setDraft(d);
    } catch (err) {
      setDraft('Error generating draft: ' + err.message);
    } finally {
      setDrafting(false);
    }
  }

  async function sendEmail() {
    setSending(true);
    setSendSuccess('');
    try {
      await api.google.gmail.send(composeData);
      setSendSuccess('Email sent!');
      setComposing(false);
      setComposeData({ to: '', subject: '', body: '' });
      setTimeout(() => setSendSuccess(''), 3000);
    } catch (err) {
      setSendSuccess('Error: ' + err.message);
    } finally {
      setSending(false);
    }
  }

  async function sendDraft() {
    if (!selected || !draft) return;
    setComposing(true);
    setComposeData({
      to: selected.from,
      subject: `Re: ${selected.subject}`,
      body: draft,
    });
  }

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-4 pb-20 lg:pb-0">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="section-title">📧 Inbox</h2>
        <div className="flex gap-2">
          <button className="btn-secondary text-xs px-3 py-1.5" onClick={loadInbox}>Refresh</button>
          <button className="btn-accent text-xs px-3 py-1.5" onClick={() => setComposing(true)}>✏️ Compose</button>
          <button
            className="btn-primary text-xs px-3 py-1.5"
            onClick={summarizeInbox}
            disabled={summarizing || emails.length === 0}
          >
            {summarizing ? '...' : '🤖 AI Summary'}
          </button>
        </div>
      </div>

      {error && (
        <div className="card p-4 border-amber-800 bg-amber-900/10 text-amber-300 text-sm">
          {error}
          <a href="/api/google/auth" className="ml-2 underline">Connect Google →</a>
        </div>
      )}

      {/* AI Summary */}
      {aiSummary && (
        <div className="card p-4 border-brand-700 bg-brand-900/20">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm">🤖</span>
            <span className="text-xs font-semibold text-brand-300">AI Inbox Summary</span>
          </div>
          <p className="text-sm text-slate-300 whitespace-pre-wrap">{aiSummary}</p>
        </div>
      )}

      {sendSuccess && (
        <div className="card p-3 border-green-800 bg-green-900/20 text-green-300 text-sm">
          {sendSuccess}
        </div>
      )}

      {/* Compose Modal */}
      {composing && (
        <div className="card p-4 border-brand-700 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-200">New Email</span>
            <button className="text-slate-500 hover:text-slate-300" onClick={() => setComposing(false)}>✕</button>
          </div>
          <input
            className="input text-sm"
            placeholder="To"
            value={composeData.to}
            onChange={e => setComposeData(d => ({ ...d, to: e.target.value }))}
          />
          <input
            className="input text-sm"
            placeholder="Subject"
            value={composeData.subject}
            onChange={e => setComposeData(d => ({ ...d, subject: e.target.value }))}
          />
          <textarea
            className="input text-sm min-h-[120px] resize-y"
            placeholder="Message..."
            value={composeData.body}
            onChange={e => setComposeData(d => ({ ...d, body: e.target.value }))}
          />
          <div className="flex gap-2">
            <button className="btn-secondary text-sm flex-1" onClick={() => setComposing(false)}>Cancel</button>
            <button className="btn-primary text-sm flex-1" onClick={sendEmail} disabled={sending}>
              {sending ? 'Sending...' : 'Send Email'}
            </button>
          </div>
        </div>
      )}

      {/* Email list + detail */}
      <div className={`grid gap-4 ${selected ? 'lg:grid-cols-2' : ''}`}>
        {/* List */}
        <div className="card overflow-hidden">
          {emails.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-sm">No emails found.</div>
          ) : (
            <div className="divide-y divide-slate-800">
              {emails.map(email => (
                <button
                  key={email.id}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-800/50 transition-colors ${
                    selected?.id === email.id ? 'bg-slate-800 border-l-2 border-brand-500' : ''
                  }`}
                  onClick={() => openEmail(email)}
                >
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className={`text-sm truncate ${email.isUnread ? 'font-semibold text-slate-100' : 'text-slate-300'}`}>
                      {formatFrom(email.from)}
                    </span>
                    <span className="text-xs text-slate-600 flex-shrink-0">{formatDate(email.date)}</span>
                  </div>
                  <div className={`text-xs truncate ${email.isUnread ? 'text-slate-200' : 'text-slate-400'}`}>
                    {email.subject}
                  </div>
                  <div className="text-xs text-slate-600 truncate mt-0.5">{email.snippet}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail */}
        {selected && (
          <div className="card p-4 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-100 text-sm leading-tight">{selected.subject}</h3>
                <p className="text-xs text-slate-500 mt-0.5">From: {selected.from}</p>
                <p className="text-xs text-slate-600">{formatDate(selected.date)}</p>
              </div>
              <button className="text-slate-500 hover:text-slate-300 flex-shrink-0" onClick={() => setSelected(null)}>✕</button>
            </div>

            <div className="divider" />

            <div className="text-sm text-slate-300 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
              {selected.body || selected.snippet}
            </div>

            <div className="divider" />

            {/* AI Draft */}
            <div>
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <span className="text-xs font-semibold text-slate-400">AI Draft Reply</span>
                <input
                  className="input text-xs px-2 py-1 w-auto flex-1 min-w-0 max-w-[200px]"
                  placeholder="Instruction..."
                  value={draftInstruction}
                  onChange={e => setDraftInstruction(e.target.value)}
                />
              </div>
              <button
                className="btn-primary text-xs px-3 py-1.5 w-full"
                onClick={generateDraft}
                disabled={drafting}
              >
                {drafting ? 'Drafting...' : '🤖 Generate Draft Reply'}
              </button>

              {draft && (
                <div className="mt-3">
                  <textarea
                    className="input text-xs min-h-[100px] resize-y"
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                  />
                  <button className="btn-accent text-xs px-3 py-1.5 mt-2 w-full" onClick={sendDraft}>
                    Use This Draft & Compose →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatFrom(from) {
  const match = from?.match(/^([^<]+)/);
  return match ? match[1].trim().replace(/"/g, '') : from || '—';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function LoadingState() {
  return (
    <div className="space-y-2">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="card p-4 animate-pulse">
          <div className="h-3 bg-slate-800 rounded w-3/4 mb-2" />
          <div className="h-2 bg-slate-800 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}
