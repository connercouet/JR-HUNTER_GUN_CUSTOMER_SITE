const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    credentials: 'include',
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json().catch(() => ({ error: 'Invalid response' }));

  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }

  return data;
}

// ─── Config ──────────────────────────────────────────────────
export const api = {
  getConfig: () => request('/config'),
  saveConfig: (data) => request('/config', { method: 'POST', body: data }),
  health: () => request('/health'),

  // ─── Claude ──────────────────────────────────────────────
  claude: {
    chat: (messages, systemAddendum = '') =>
      request('/claude/chat', { method: 'POST', body: { messages, systemAddendum } }),

    briefing: (context = {}) =>
      request('/claude/briefing', { method: 'POST', body: context }),

    emailDraft: (originalEmail, instruction) =>
      request('/claude/email-draft', { method: 'POST', body: { originalEmail, instruction } }),

    emailSummary: (emails) =>
      request('/claude/email-summary', { method: 'POST', body: { emails } }),

    generateContent: (params) =>
      request('/claude/content', { method: 'POST', body: params }),

    prioritizeTasks: (tasks, context) =>
      request('/claude/prioritize', { method: 'POST', body: { tasks, context } }),

    getContentQueue: () => request('/claude/content/queue'),
    deleteContentItem: (index) => request(`/claude/content/queue/${index}`, { method: 'DELETE' }),
  },

  // ─── Google ──────────────────────────────────────────────
  google: {
    getStatus: () => request('/google/status'),
    getAuthUrl: () => `${BASE}/google/auth`,
    disconnect: () => request('/google/auth', { method: 'DELETE' }),

    gmail: {
      getInbox: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return request(`/google/gmail/inbox${qs ? '?' + qs : ''}`);
      },
      getMessage: (id) => request(`/google/gmail/message/${id}`),
      send: (data) => request('/google/gmail/send', { method: 'POST', body: data }),
      getUnreadCount: () => request('/google/gmail/unread-count'),
    },

    calendar: {
      getEvents: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return request(`/google/calendar/events${qs ? '?' + qs : ''}`);
      },
      getToday: () => request('/google/calendar/today'),
      createEvent: (data) => request('/google/calendar/events', { method: 'POST', body: data }),
    },

    drive: {
      getFiles: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return request(`/google/drive/files${qs ? '?' + qs : ''}`);
      },
      createFile: (data) => request('/google/drive/create', { method: 'POST', body: data }),
    },
  },

  // ─── GitHub ──────────────────────────────────────────────
  github: {
    getStatus: () => request('/github/status'),
    getRepos: () => request('/github/repos'),
    getIssues: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/github/issues${qs ? '?' + qs : ''}`);
    },
    getPulls: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/github/pulls${qs ? '?' + qs : ''}`);
    },
    getActivity: () => request('/github/activity'),
    getCommits: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/github/commits${qs ? '?' + qs : ''}`);
    },
    createIssue: (data) => request('/github/issues', { method: 'POST', body: data }),
  },

  // ─── Tasks ───────────────────────────────────────────────
  tasks: {
    getAll: () => request('/tasks'),
    create: (data) => request('/tasks', { method: 'POST', body: data }),
    update: (id, data) => request(`/tasks/${id}`, { method: 'PUT', body: data }),
    delete: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),
  },

  // ─── Customers ───────────────────────────────────────────
  customers: {
    getAll: () => request('/customers'),
    create: (data) => request('/customers', { method: 'POST', body: data }),
    update: (id, data) => request(`/customers/${id}`, { method: 'PUT', body: data }),
    delete: (id) => request(`/customers/${id}`, { method: 'DELETE' }),
  },

  // ─── Briefings ───────────────────────────────────────────
  briefings: {
    getLatest: () => request('/briefings/latest'),
    getAll: () => request('/briefings'),
  },
};

export default api;
