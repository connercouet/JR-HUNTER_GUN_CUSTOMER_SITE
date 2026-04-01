import React, { useState, useEffect } from 'react';
import api from '../utils/api.js';

const CONTENT_TYPES = [
  { value: 'social_post', label: '📱 Social Post', platforms: ['Instagram', 'Facebook', 'X (Twitter)', 'TikTok'] },
  { value: 'email_campaign', label: '📧 Email Campaign', platforms: [] },
  { value: 'blog_post', label: '✍️ Blog Post', platforms: [] },
  { value: 'ad_copy', label: '📣 Ad Copy', platforms: ['Facebook', 'Instagram', 'Google'] },
  { value: 'weekly_plan', label: '📆 Weekly Plan', platforms: [] },
];

const TOPIC_SUGGESTIONS = [
  'Youth hunting safety and the Junior Hunter Gun',
  'Getting kids started in hunting',
  'Why camera-integrated training guns are safer',
  'Hunter's Edge testing program launch',
  'Parent testimonial about youth hunting',
  'Proper gun handling techniques for youth',
  'Hunting traditions and passing them down',
  'The importance of starting young in hunting',
];

function renderContent(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-100">$1</strong>')
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-bold text-accent-400 mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h3 class="text-sm font-bold text-accent-400 mt-3 mb-1">$1</h3>')
    .replace(/^# (.+)$/gm, '<h3 class="text-base font-bold text-accent-400 mt-4 mb-1">$1</h3>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*?<\/li>(\n<li>.*?<\/li>)*)/gs, '<ul class="list-disc pl-4 space-y-0.5 my-1.5 text-slate-300">$1</ul>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

export default function MarketingHub() {
  const [type, setType] = useState('social_post');
  const [platform, setPlatform] = useState('Instagram');
  const [topic, setTopic] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [queue, setQueue] = useState([]);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(null);
  const [tab, setTab] = useState('generator');

  const selectedType = CONTENT_TYPES.find(t => t.value === type);

  useEffect(() => { loadQueue(); }, []);

  async function loadQueue() {
    try {
      const q = await api.claude.getContentQueue();
      setQueue(q);
    } catch {}
  }

  async function generate() {
    if (!topic && !customPrompt) return;
    setGenerating(true);
    setError('');
    try {
      const result = await api.claude.generateContent({
        type,
        platform: selectedType?.platforms?.length ? platform : undefined,
        topic: customPrompt || topic,
      });
      setQueue(prev => [result, ...prev]);
      setTab('saved');
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  async function deleteItem(index) {
    try {
      await api.claude.deleteContentItem(index);
      setQueue(prev => prev.filter((_, i) => i !== index));
    } catch {}
  }

  function copy(text, id) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <div className="space-y-4 pb-20 lg:pb-0">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="section-title">📣 Marketing Hub</h2>
          <p className="text-xs text-slate-500 mt-0.5">AI-powered content for Hunter's Edge</p>
        </div>
        <div className="flex gap-1 bg-slate-900 rounded-lg p-1 border border-slate-800">
          <button
            className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${tab === 'generator' ? 'bg-brand-600 text-white' : 'text-slate-400'}`}
            onClick={() => setTab('generator')}
          >Generator</button>
          <button
            className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${tab === 'saved' ? 'bg-brand-600 text-white' : 'text-slate-400'}`}
            onClick={() => setTab('saved')}
          >
            Saved {queue.length > 0 && <span className="ml-1 badge badge-green">{queue.length}</span>}
          </button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">{error}</div>
      )}

      {tab === 'generator' && (
        <div className="space-y-4">
          {/* Content type selector */}
          <div>
            <label className="label block mb-2">Content Type</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CONTENT_TYPES.map(t => (
                <button
                  key={t.value}
                  className={`text-left text-xs px-3 py-2.5 rounded-lg border font-medium transition-colors ${
                    type === t.value
                      ? 'bg-accent-500/20 border-accent-500 text-accent-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                  onClick={() => { setType(t.value); setPlatform(t.platforms[0] || ''); }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Platform selector */}
          {selectedType?.platforms?.length > 0 && (
            <div>
              <label className="label block mb-2">Platform</label>
              <div className="flex gap-2 flex-wrap">
                {selectedType.platforms.map(p => (
                  <button
                    key={p}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                      platform === p
                        ? 'bg-brand-500/20 border-brand-500 text-brand-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                    onClick={() => setPlatform(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Topic */}
          <div>
            <label className="label block mb-2">Topic / Angle</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-2">
              {TOPIC_SUGGESTIONS.map(t => (
                <button
                  key={t}
                  className={`text-left text-xs px-3 py-2 rounded-lg border transition-colors ${
                    topic === t
                      ? 'bg-brand-500/20 border-brand-600 text-brand-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                  onClick={() => { setTopic(t === topic ? '' : t); setCustomPrompt(''); }}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="mt-2">
              <input
                className="input text-sm"
                placeholder="Or type a custom topic / full prompt..."
                value={customPrompt}
                onChange={e => { setCustomPrompt(e.target.value); setTopic(''); }}
              />
            </div>
          </div>

          <button
            className="btn-accent w-full py-3 text-sm font-semibold"
            onClick={generate}
            disabled={generating || (!topic && !customPrompt)}
          >
            {generating ? (
              <span className="flex items-center justify-center gap-2">
                <span className="typing-dot"/><span className="typing-dot"/><span className="typing-dot"/>
                <span>Generating...</span>
              </span>
            ) : `✨ Generate ${selectedType?.label || 'Content'}`}
          </button>

          {/* Pro tip */}
          <div className="card p-3 border-brand-800 bg-brand-900/10 text-xs text-brand-400">
            💡 <strong>Pro tip:</strong> Generate your weekly plan every Monday morning — the cron job does this automatically, but you can also do it on demand here.
          </div>
        </div>
      )}

      {tab === 'saved' && (
        <div className="space-y-3">
          {queue.length === 0 ? (
            <div className="card p-8 text-center text-slate-500 text-sm">
              <div className="text-3xl mb-2">📝</div>
              <p>No saved content yet. Generate some!</p>
              <p className="text-xs mt-1 text-slate-600">Your weekly plan auto-generates every Monday at 9 AM.</p>
            </div>
          ) : (
            queue.map((item, i) => (
              <div key={i} className="card p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex gap-2 flex-wrap">
                    <span className="badge badge-green text-xs">
                      {CONTENT_TYPES.find(t => t.value === item.type)?.label || item.type}
                    </span>
                    {item.platform && <span className="badge badge-blue text-xs">{item.platform}</span>}
                    {item.automated && <span className="badge badge-orange text-xs">Auto</span>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="text-xs text-slate-500 hover:text-slate-200 px-2 py-1 rounded bg-slate-800"
                      onClick={() => copy(item.content, i)}
                    >
                      {copied === i ? '✓ Copied!' : 'Copy'}
                    </button>
                    <button
                      className="text-xs text-slate-600 hover:text-red-400 px-2 py-1"
                      onClick={() => deleteItem(i)}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div
                  className="ai-content text-sm"
                  dangerouslySetInnerHTML={{ __html: renderContent(item.content) }}
                />

                {item.generatedAt && (
                  <p className="text-xs text-slate-600">
                    {new Date(item.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
