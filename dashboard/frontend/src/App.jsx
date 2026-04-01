import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import api from './utils/api.js';
import Layout from './components/Layout.jsx';
import SetupWizard from './components/SetupWizard.jsx';
import DashboardHome from './components/DashboardHome.jsx';
import CommandCenter from './components/CommandCenter.jsx';
import GmailPanel from './components/GmailPanel.jsx';
import CalendarPanel from './components/CalendarPanel.jsx';
import TaskManager from './components/TaskManager.jsx';
import MarketingHub from './components/MarketingHub.jsx';
import GitHubPanel from './components/GitHubPanel.jsx';
import CustomerPipeline from './components/CustomerPipeline.jsx';

// ─── App Context ──────────────────────────────────────────────
export const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

export default function App() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    // Check for Google OAuth callback
    const params = new URLSearchParams(window.location.search);
    if (params.get('google_connected') === 'true') {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    if (params.get('google_error')) {
      console.error('Google OAuth error:', params.get('google_error'));
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    loadConfig();
  }, []);

  async function loadConfig() {
    try {
      const cfg = await api.getConfig();
      setConfig(cfg);
      // Need setup if no Anthropic key configured
      setNeedsSetup(!cfg.hasAnthropicKey);
    } catch (err) {
      console.error('Backend not reachable:', err);
      setNeedsSetup(true);
    } finally {
      setLoading(false);
    }
  }

  function onSetupComplete() {
    setNeedsSetup(false);
    loadConfig();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🦅</div>
          <p className="text-slate-400 text-sm">Loading Hunter's Edge...</p>
        </div>
      </div>
    );
  }

  if (needsSetup) {
    return <SetupWizard onComplete={onSetupComplete} />;
  }

  return (
    <AppContext.Provider value={{ config, reloadConfig: loadConfig }}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<DashboardHome />} />
            <Route path="ai" element={<CommandCenter />} />
            <Route path="email" element={<GmailPanel />} />
            <Route path="calendar" element={<CalendarPanel />} />
            <Route path="tasks" element={<TaskManager />} />
            <Route path="marketing" element={<MarketingHub />} />
            <Route path="github" element={<GitHubPanel />} />
            <Route path="customers" element={<CustomerPipeline />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppContext.Provider>
  );
}
