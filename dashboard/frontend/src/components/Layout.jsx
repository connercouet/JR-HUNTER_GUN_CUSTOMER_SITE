import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useApp } from '../App.jsx';

const NAV = [
  { to: '/',          icon: '⚡', label: 'Dashboard'   },
  { to: '/ai',        icon: '🤖', label: 'AI Assistant' },
  { to: '/email',     icon: '📧', label: 'Inbox'        },
  { to: '/calendar',  icon: '📅', label: 'Calendar'     },
  { to: '/tasks',     icon: '✅', label: 'Tasks'        },
  { to: '/marketing', icon: '📣', label: 'Marketing'    },
  { to: '/customers', icon: '👥', label: 'Customers'    },
  { to: '/github',    icon: '💻', label: 'GitHub'       },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { config } = useApp();
  const location = useLocation();

  const currentPage = NAV.find(n => n.to === location.pathname)?.label || 'Dashboard';

  return (
    <div className="min-h-screen flex bg-slate-950">
      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 border-r border-slate-800
          flex flex-col transition-transform duration-300
          lg:relative lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
          <span className="text-2xl">🦅</span>
          <div>
            <div className="font-serif font-semibold text-slate-100 text-sm leading-tight">Hunter's Edge</div>
            <div className="text-xs text-slate-500">Business Dashboard</div>
          </div>
          <button
            className="ml-auto lg:hidden text-slate-400 hover:text-slate-200"
            onClick={() => setSidebarOpen(false)}
          >
            ✕
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`
              }
            >
              <span className="text-base w-5 text-center">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Status indicators */}
        <div className="px-4 py-4 border-t border-slate-800 space-y-1.5">
          <StatusDot label="Claude AI" active={config?.hasAnthropicKey} />
          <StatusDot label="Google" active={config?.isGoogleAuthenticated} />
          <StatusDot label="GitHub" active={config?.hasGitHubToken} />
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur border-b border-slate-800 flex items-center gap-3 px-4 py-3">
          <button
            className="lg:hidden text-slate-400 hover:text-slate-200 p-1"
            onClick={() => setSidebarOpen(true)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-slate-200 font-medium text-base">{currentPage}</h1>
          <div className="ml-auto text-xs text-slate-500">
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 bg-slate-900 border-t border-slate-800 flex lg:hidden">
        {NAV.slice(0, 5).map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2 text-xs transition-colors ${
                isActive ? 'text-brand-400' : 'text-slate-500'
              }`
            }
          >
            <span className="text-lg">{icon}</span>
            <span className="mt-0.5 leading-none">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function StatusDot({ label, active }) {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-green-400' : 'bg-slate-600'}`} />
      {label}
      <span className={`ml-auto ${active ? 'text-green-400' : 'text-slate-600'}`}>
        {active ? 'on' : 'off'}
      </span>
    </div>
  );
}
