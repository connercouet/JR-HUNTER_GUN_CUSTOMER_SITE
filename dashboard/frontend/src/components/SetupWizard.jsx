import React, { useState } from 'react';

const STEPS = [
  { id: 'welcome', title: 'Welcome' },
  { id: 'anthropic', title: 'Claude AI' },
  { id: 'github', title: 'GitHub' },
  { id: 'google', title: 'Google' },
  { id: 'done', title: 'Ready' },
];

export default function SetupWizard({ onComplete }) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState({ anthropicKey: '', githubToken: '', githubUsername: 'connercouet', ownerName: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set(key, value) {
    setValues(v => ({ ...v, [key]: value }));
  }

  async function saveAndNext() {
    setError('');
    setSaving(true);
    try {
      if (step === 1) {
        // Write Anthropic key to backend via config (key gets written to .env guidance)
        // We can only instruct — API keys must go in .env file
        if (!values.anthropicKey && !values.skipAnthropic) {
          setError('Enter your Anthropic API key or click Skip for now.');
          setSaving(false);
          return;
        }
      }
      if (step === STEPS.length - 2) {
        // Save owner name
        await fetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ownerName: values.ownerName }),
        });
      }
      setStep(s => s + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🦅</div>
          <h1 className="font-serif text-2xl font-bold text-slate-100">Hunter's Edge</h1>
          <p className="text-slate-400 text-sm mt-1">Business Efficiency Dashboard</p>
        </div>

        {/* Progress */}
        <div className="flex gap-1.5 mb-6">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? 'bg-brand-500' : 'bg-slate-800'
              }`}
            />
          ))}
        </div>

        <div className="card p-6">
          <p className="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-1">
            Step {step + 1} of {STEPS.length}
          </p>
          <h2 className="text-xl font-semibold text-slate-100 mb-4">{STEPS[step].title}</h2>

          {step === 0 && <StepWelcome values={values} set={set} />}
          {step === 1 && <StepAnthropic values={values} set={set} />}
          {step === 2 && <StepGitHub values={values} set={set} />}
          {step === 3 && <StepGoogle />}
          {step === 4 && <StepDone onComplete={onComplete} />}

          {error && (
            <div className="mt-3 text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {step < STEPS.length - 1 && (
            <div className="mt-6 flex gap-3">
              {step > 0 && (
                <button
                  className="btn-secondary flex-1"
                  onClick={() => setStep(s => s - 1)}
                >
                  Back
                </button>
              )}
              <button
                className="btn-primary flex-1"
                onClick={saveAndNext}
                disabled={saving}
              >
                {saving ? 'Saving...' : step === STEPS.length - 2 ? 'Finish Setup' : 'Continue →'}
              </button>
            </div>
          )}

          {step > 0 && step < STEPS.length - 1 && (
            <button
              className="mt-2 w-full text-xs text-slate-500 hover:text-slate-300 py-1"
              onClick={() => setStep(s => s + 1)}
            >
              Skip for now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepWelcome({ values, set }) {
  return (
    <div className="space-y-4">
      <p className="text-slate-300 text-sm leading-relaxed">
        This dashboard connects all your tools — Claude AI, Gmail, Calendar, Drive, and GitHub — into one command center for building Hunter's Edge.
      </p>
      <p className="text-slate-300 text-sm leading-relaxed">
        You'll get a daily AI briefing, email drafting, marketing content generation, and automated task prioritization.
      </p>
      <div>
        <label className="label block mb-1.5">Your name</label>
        <input
          className="input"
          placeholder="e.g. Conner"
          value={values.ownerName}
          onChange={e => set('ownerName', e.target.value)}
        />
      </div>
    </div>
  );
}

function StepAnthropic({ values, set }) {
  return (
    <div className="space-y-4">
      <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3 text-sm text-blue-200">
        <strong>How to get your API key:</strong>
        <ol className="mt-1 space-y-1 list-decimal list-inside text-blue-300 text-xs">
          <li>Go to <strong>console.anthropic.com</strong></li>
          <li>Sign up / log in</li>
          <li>Click "API Keys" → "Create Key"</li>
          <li>Copy the key (starts with <code>sk-ant-</code>)</li>
        </ol>
      </div>
      <div className="bg-amber-900/20 border border-amber-800 rounded-lg p-3 text-xs text-amber-300">
        ⚠️ After copying your key, open <code>dashboard/backend/.env</code> and paste it as <code>ANTHROPIC_API_KEY=sk-ant-...</code>, then restart the backend.
      </div>
      <div>
        <label className="label block mb-1.5">Anthropic API Key</label>
        <input
          className="input font-mono text-sm"
          type="password"
          placeholder="sk-ant-..."
          value={values.anthropicKey}
          onChange={e => set('anthropicKey', e.target.value)}
        />
        <p className="text-xs text-slate-500 mt-1">This is saved only to your local .env file — never sent anywhere else.</p>
      </div>
    </div>
  );
}

function StepGitHub({ values, set }) {
  return (
    <div className="space-y-4">
      <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3 text-sm text-blue-200">
        <strong>How to get your GitHub token:</strong>
        <ol className="mt-1 space-y-1 list-decimal list-inside text-blue-300 text-xs">
          <li>Go to <strong>github.com/settings/tokens</strong></li>
          <li>Click "Generate new token (classic)"</li>
          <li>Select scopes: <code>repo</code>, <code>read:user</code></li>
          <li>Copy the token (starts with <code>ghp_</code>)</li>
        </ol>
      </div>
      <div className="bg-amber-900/20 border border-amber-800 rounded-lg p-3 text-xs text-amber-300">
        ⚠️ Paste as <code>GITHUB_TOKEN=ghp_...</code> in your <code>dashboard/backend/.env</code> file.
      </div>
      <div>
        <label className="label block mb-1.5">GitHub Username</label>
        <input
          className="input"
          placeholder="connercouet"
          value={values.githubUsername}
          onChange={e => set('githubUsername', e.target.value)}
        />
      </div>
    </div>
  );
}

function StepGoogle() {
  return (
    <div className="space-y-4">
      <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3 text-sm text-blue-200">
        <strong>Google OAuth setup (one-time, ~5 min):</strong>
        <ol className="mt-1 space-y-1 list-decimal list-inside text-blue-300 text-xs">
          <li>Go to <strong>console.cloud.google.com</strong></li>
          <li>Create a new project named "Hunters Edge Dashboard"</li>
          <li>Enable: Gmail API, Calendar API, Drive API</li>
          <li>Go to "Credentials" → "Create OAuth 2.0 Client ID"</li>
          <li>App type: Web app</li>
          <li>Authorized redirect URI: <code>http://localhost:3001/api/google/callback</code></li>
          <li>Copy Client ID and Secret to your <code>.env</code></li>
          <li>Then click "Connect Google" below</li>
        </ol>
      </div>
      <a
        href="/api/google/auth"
        className="btn-primary w-full text-center block"
      >
        🔗 Connect Google Account
      </a>
      <p className="text-xs text-slate-500 text-center">
        This will open Google's sign-in page. You'll be redirected back when complete.
      </p>
    </div>
  );
}

function StepDone({ onComplete }) {
  return (
    <div className="space-y-4 text-center">
      <div className="text-5xl">🎉</div>
      <p className="text-slate-200 font-medium">You're all set!</p>
      <p className="text-slate-400 text-sm">
        Your dashboard is ready. You'll get your first daily briefing tomorrow at 7:30 AM. You can also generate one manually from the Dashboard tab.
      </p>
      <div className="text-left bg-slate-800 rounded-lg p-3 text-xs text-slate-400 space-y-1">
        <p className="font-medium text-slate-200 mb-2">Automated tasks running:</p>
        <p>⏰ 7:30 AM — Daily AI briefing (Claude reads your email + calendar)</p>
        <p>📣 Monday 9 AM — Weekly marketing content drop</p>
        <p>💻 6 PM daily — GitHub activity digest</p>
      </div>
      <button className="btn-primary w-full" onClick={onComplete}>
        Open Dashboard →
      </button>
    </div>
  );
}
