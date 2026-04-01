import { Router } from 'express';
import { google } from 'googleapis';
import { readData, writeData } from '../server.js';

const router = Router();

// ─── OAuth2 Client Factory ────────────────────────────────────
function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/google/callback'
  );
}

function getAuthenticatedClient() {
  const tokens = readData('tokens.json', null);
  if (!tokens) throw new Error('Google account not connected. Please authenticate first.');
  const auth = createOAuth2Client();
  auth.setCredentials(tokens);
  return auth;
}

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
];

// ─── Auth Routes ─────────────────────────────────────────────
router.get('/auth', (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(400).json({ error: 'Google OAuth not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env' });
  }
  const auth = createOAuth2Client();
  const url = auth.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });
  res.redirect(url);
});

router.get('/callback', async (req, res) => {
  const { code, error } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  if (error) {
    return res.redirect(`${frontendUrl}?google_error=${encodeURIComponent(error)}`);
  }

  try {
    const auth = createOAuth2Client();
    const { tokens } = await auth.getToken(code);
    writeData('tokens.json', tokens);
    res.redirect(`${frontendUrl}?google_connected=true`);
  } catch (err) {
    res.redirect(`${frontendUrl}?google_error=${encodeURIComponent(err.message)}`);
  }
});

router.get('/status', (req, res) => {
  const tokens = readData('tokens.json', null);
  res.json({ connected: !!tokens });
});

router.delete('/auth', (req, res) => {
  writeData('tokens.json', null);
  res.json({ success: true, message: 'Google account disconnected.' });
});

// ─── Gmail Routes ─────────────────────────────────────────────
router.get('/gmail/inbox', async (req, res) => {
  try {
    const auth = getAuthenticatedClient();
    const gmail = google.gmail({ version: 'v1', auth });
    const maxResults = parseInt(req.query.limit) || 20;

    const listRes = await gmail.users.messages.list({
      userId: 'me',
      maxResults,
      labelIds: ['INBOX'],
      q: req.query.q || '',
    });

    if (!listRes.data.messages) return res.json({ messages: [], total: 0 });

    const messages = await Promise.all(
      listRes.data.messages.slice(0, maxResults).map(async (msg) => {
        const detail = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'metadata',
          metadataHeaders: ['From', 'Subject', 'Date', 'To'],
        });
        const headers = detail.data.payload.headers;
        const getHeader = (name) => headers.find(h => h.name === name)?.value || '';
        return {
          id: msg.id,
          threadId: detail.data.threadId,
          from: getHeader('From'),
          to: getHeader('To'),
          subject: getHeader('Subject'),
          date: getHeader('Date'),
          snippet: detail.data.snippet,
          labelIds: detail.data.labelIds || [],
          isUnread: (detail.data.labelIds || []).includes('UNREAD'),
        };
      })
    );

    res.json({ messages, total: listRes.data.resultSizeEstimate || messages.length });
  } catch (err) {
    res.status(err.message.includes('not connected') ? 401 : 500).json({ error: err.message });
  }
});

router.get('/gmail/message/:id', async (req, res) => {
  try {
    const auth = getAuthenticatedClient();
    const gmail = google.gmail({ version: 'v1', auth });

    const detail = await gmail.users.messages.get({
      userId: 'me',
      id: req.params.id,
      format: 'full',
    });

    const headers = detail.data.payload.headers;
    const getHeader = (name) => headers.find(h => h.name === name)?.value || '';

    // Extract body
    let body = '';
    const extractBody = (parts) => {
      if (!parts) return;
      for (const part of parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          body = Buffer.from(part.body.data, 'base64').toString('utf-8');
        }
        if (part.parts) extractBody(part.parts);
      }
    };
    if (detail.data.payload.body?.data) {
      body = Buffer.from(detail.data.payload.body.data, 'base64').toString('utf-8');
    } else {
      extractBody(detail.data.payload.parts);
    }

    res.json({
      id: detail.data.id,
      threadId: detail.data.threadId,
      from: getHeader('From'),
      to: getHeader('To'),
      subject: getHeader('Subject'),
      date: getHeader('Date'),
      body,
      snippet: detail.data.snippet,
      labelIds: detail.data.labelIds || [],
    });
  } catch (err) {
    res.status(err.message.includes('not connected') ? 401 : 500).json({ error: err.message });
  }
});

router.post('/gmail/send', async (req, res) => {
  try {
    const auth = getAuthenticatedClient();
    const gmail = google.gmail({ version: 'v1', auth });
    const { to, subject, body, threadId } = req.body;

    if (!to || !subject || !body) {
      return res.status(400).json({ error: 'to, subject, and body are required' });
    }

    const rawMessage = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/plain; charset=utf-8',
      '',
      body,
    ].join('\n');

    const encoded = Buffer.from(rawMessage).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const sendRes = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encoded,
        ...(threadId ? { threadId } : {}),
      },
    });

    res.json({ success: true, messageId: sendRes.data.id });
  } catch (err) {
    res.status(err.message.includes('not connected') ? 401 : 500).json({ error: err.message });
  }
});

router.get('/gmail/unread-count', async (req, res) => {
  try {
    const auth = getAuthenticatedClient();
    const gmail = google.gmail({ version: 'v1', auth });
    const result = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread in:inbox',
      maxResults: 1,
    });
    res.json({ count: result.data.resultSizeEstimate || 0 });
  } catch (err) {
    res.status(err.message.includes('not connected') ? 401 : 500).json({ error: err.message });
  }
});

// ─── Calendar Routes ──────────────────────────────────────────
router.get('/calendar/events', async (req, res) => {
  try {
    const auth = getAuthenticatedClient();
    const calendar = google.calendar({ version: 'v3', auth });

    const timeMin = req.query.timeMin || new Date().toISOString();
    const timeMax = req.query.timeMax || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const result = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: parseInt(req.query.limit) || 50,
    });

    res.json({ events: result.data.items || [] });
  } catch (err) {
    res.status(err.message.includes('not connected') ? 401 : 500).json({ error: err.message });
  }
});

router.get('/calendar/today', async (req, res) => {
  try {
    const auth = getAuthenticatedClient();
    const calendar = google.calendar({ version: 'v3', auth });

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const result = await calendar.events.list({
      calendarId: 'primary',
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    res.json({ events: result.data.items || [] });
  } catch (err) {
    res.status(err.message.includes('not connected') ? 401 : 500).json({ error: err.message });
  }
});

router.post('/calendar/events', async (req, res) => {
  try {
    const auth = getAuthenticatedClient();
    const calendar = google.calendar({ version: 'v3', auth });
    const { summary, description, start, end, attendees = [] } = req.body;

    if (!summary || !start || !end) {
      return res.status(400).json({ error: 'summary, start, and end are required' });
    }

    const event = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary,
        description,
        start: { dateTime: start, timeZone: 'America/Chicago' },
        end: { dateTime: end, timeZone: 'America/Chicago' },
        attendees: attendees.map(email => ({ email })),
      },
    });

    res.json({ success: true, event: event.data });
  } catch (err) {
    res.status(err.message.includes('not connected') ? 401 : 500).json({ error: err.message });
  }
});

// ─── Drive Routes ─────────────────────────────────────────────
router.get('/drive/files', async (req, res) => {
  try {
    const auth = getAuthenticatedClient();
    const drive = google.drive({ version: 'v3', auth });

    const result = await drive.files.list({
      pageSize: parseInt(req.query.limit) || 20,
      fields: 'files(id, name, mimeType, modifiedTime, webViewLink, iconLink)',
      q: req.query.q || "trashed = false",
      orderBy: 'modifiedTime desc',
    });

    res.json({ files: result.data.files || [] });
  } catch (err) {
    res.status(err.message.includes('not connected') ? 401 : 500).json({ error: err.message });
  }
});

router.post('/drive/create', async (req, res) => {
  try {
    const auth = getAuthenticatedClient();
    const drive = google.drive({ version: 'v3', auth });
    const { name, type = 'doc', content = '' } = req.body;

    const mimeTypes = {
      doc: 'application/vnd.google-apps.document',
      sheet: 'application/vnd.google-apps.spreadsheet',
      slide: 'application/vnd.google-apps.presentation',
      folder: 'application/vnd.google-apps.folder',
    };

    const result = await drive.files.create({
      requestBody: {
        name: name || `Hunter's Edge — ${new Date().toLocaleDateString()}`,
        mimeType: mimeTypes[type] || mimeTypes.doc,
      },
      fields: 'id, name, webViewLink',
    });

    res.json({ success: true, file: result.data });
  } catch (err) {
    res.status(err.message.includes('not connected') ? 401 : 500).json({ error: err.message });
  }
});

export default router;
