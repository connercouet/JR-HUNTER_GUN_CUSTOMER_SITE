import React, { useState, useRef, useEffect } from 'react';
import api from '../utils/api.js';

const QUICK_PROMPTS = [
  { label: 'What should I focus on today?', icon: '⚡' },
  { label: "Give me 5 Instagram post ideas for Junior Hunter Gun", icon: '📸' },
  { label: 'Draft a cold outreach email to hunting retailers', icon: '📧' },
  { label: "What's the best way to get my first 100 customers?", icon: '🎯' },
  { label: 'Help me write a pitch for Junior Hunter Gun investors', icon: '💼' },
  { label: 'Create a 30-day marketing calendar for pre-launch', icon: '📅' },
];

function renderContent(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-100">$1</strong>')
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-bold text-brand-300 mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h3 class="text-base font-bold text-brand-300 mt-4 mb-1">$1</h3>')
    .replace(/^# (.+)$/gm, '<h3 class="text-base font-bold text-brand-200 mt-4 mb-1">$1</h3>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*?<\/li>(\n<li>.*?<\/li>)*)/gs, '<ul class="list-disc pl-4 space-y-0.5 my-1.5">$1</ul>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

export default function CommandCenter() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hey! I'm your Hunter's Edge AI assistant. I know your business, your product (Junior Hunter Gun), and your goal: building the most efficient pre-launch pipeline possible. What do you need?",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(text) {
    const userText = text || input.trim();
    if (!userText || loading) return;

    setInput('');
    setError('');
    const newMessages = [...messages, { role: 'user', content: userText }];
    setMessages(newMessages);
    setLoading(true);

    try {
      // Only send the actual conversation (not the initial assistant greeting)
      const apiMessages = newMessages.filter((_, i) => i > 0 || newMessages[0].role === 'user');
      const { content } = await api.claude.chat(apiMessages);
      setMessages([...newMessages, { role: 'assistant', content }]);
    } catch (err) {
      setError(err.message);
      setMessages(newMessages); // revert
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  function clearChat() {
    setMessages([{
      role: 'assistant',
      content: "Fresh start! What's on your mind?",
    }]);
    setError('');
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] lg:h-[calc(100vh-6rem)] pb-16 lg:pb-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="section-title">🤖 AI Assistant</h2>
          <p className="text-xs text-slate-500">Powered by Claude — knows your business inside out</p>
        </div>
        <button className="btn-secondary text-xs px-3 py-1.5" onClick={clearChat}>
          Clear chat
        </button>
      </div>

      {/* Quick prompts */}
      {messages.length <= 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
          {QUICK_PROMPTS.map(({ label, icon }) => (
            <button
              key={label}
              className="text-left text-xs px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 hover:border-brand-600 text-slate-300 hover:text-slate-100 transition-colors flex items-start gap-2"
              onClick={() => sendMessage(label)}
            >
              <span>{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-brand-800 flex items-center justify-center text-sm mr-2 flex-shrink-0 mt-1">
                🤖
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === 'user'
                  ? 'bg-brand-600 text-white rounded-tr-sm'
                  : 'bg-slate-800 text-slate-200 rounded-tl-sm border border-slate-700'
              }`}
            >
              {msg.role === 'assistant' ? (
                <div
                  className="ai-content"
                  dangerouslySetInnerHTML={{ __html: renderContent(msg.content) }}
                />
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-full bg-brand-800 flex items-center justify-center text-sm mr-2 mt-1">
              🤖
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-sm px-4 py-3">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}

        {error && (
          <div className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
            {error} — Check your Anthropic API key in .env
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-4 flex gap-2">
        <textarea
          ref={inputRef}
          className="input flex-1 resize-none min-h-[44px] max-h-32"
          placeholder="Ask anything about your business..."
          value={input}
          rows={1}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
        />
        <button
          className="btn-primary px-4 self-end"
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
        >
          ↑
        </button>
      </div>
      <p className="text-xs text-slate-600 mt-1.5 text-center">Enter to send · Shift+Enter for new line</p>
    </div>
  );
}
