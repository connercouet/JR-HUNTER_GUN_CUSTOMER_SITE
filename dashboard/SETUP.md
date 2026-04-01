# Hunter's Edge Dashboard — Setup Guide

## Quick Start (5 minutes)

### 1. Install Dependencies

```bash
# Backend
cd dashboard/backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Set Up Environment Variables

```bash
cd dashboard/backend
cp .env.example .env
```

Open `.env` and fill in your keys (instructions below for each).

### 3. Start the App

```bash
# Terminal 1 — Backend (port 3001)
cd dashboard/backend
npm run dev

# Terminal 2 — Frontend (port 3000)
cd dashboard/frontend
npm run dev
```

Open http://localhost:3000 in your browser.

---

## Getting Your API Keys

### 🤖 Anthropic (Claude AI) — REQUIRED

1. Go to **https://console.anthropic.com**
2. Sign up / log in
3. Click **"API Keys"** → **"Create Key"**
4. Name it "Hunters Edge Dashboard"
5. Copy the key (starts with `sk-ant-`)
6. Paste into `.env`: `ANTHROPIC_API_KEY=sk-ant-...`

Cost: ~$0.01–0.05 per day for typical usage (very cheap).

---

### 🐙 GitHub — RECOMMENDED

1. Go to **https://github.com/settings/tokens**
2. Click **"Generate new token (classic)"**
3. Name it "Hunters Edge Dashboard"
4. Set expiration: No expiration (or 1 year)
5. Select scopes: ✅ `repo`, ✅ `read:user`
6. Click Generate, copy the token (starts with `ghp_`)
7. Paste into `.env`:
   ```
   GITHUB_TOKEN=ghp_...
   GITHUB_USERNAME=connercouet
   ```

---

### 📧 Google (Gmail + Calendar + Drive) — RECOMMENDED

This takes about 10 minutes but only needs to be done once.

#### Step 1: Create Google Cloud Project
1. Go to **https://console.cloud.google.com**
2. Click the project dropdown → **"New Project"**
3. Name: `Hunters Edge Dashboard`
4. Click **Create**

#### Step 2: Enable APIs
1. Go to **APIs & Services → Library**
2. Search and enable each of these:
   - ✅ Gmail API
   - ✅ Google Calendar API  
   - ✅ Google Drive API

#### Step 3: Create OAuth Credentials
1. Go to **APIs & Services → Credentials**
2. Click **"+ Create Credentials"** → **"OAuth client ID"**
3. If prompted, configure the **OAuth consent screen** first:
   - App name: `Hunters Edge Dashboard`
   - User type: External
   - Add your email as a test user
4. Application type: **Web application**
5. Authorized redirect URIs: `http://localhost:3001/api/google/callback`
6. Click Create
7. Copy the **Client ID** and **Client Secret**
8. Paste into `.env`:
   ```
   GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-your-secret
   GOOGLE_REDIRECT_URI=http://localhost:3001/api/google/callback
   ```

#### Step 4: Connect Your Google Account
1. Start the backend (`npm run dev` in dashboard/backend)
2. Visit: **http://localhost:3001/api/google/auth**
3. Sign in with your Google account
4. You'll be redirected back to the dashboard ✅

---

## Automated Tasks

The backend runs these automatically:

| Time | Task |
|------|------|
| 7:30 AM daily | AI daily briefing (reads email + calendar + GitHub) |
| 9:00 AM Monday | Weekly marketing content generation |
| 6:00 PM daily | GitHub activity digest |

---

## Using on Mobile

While running locally, access the dashboard from your phone on the same WiFi:

1. Find your computer's local IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
2. Open `http://YOUR_IP:3000` on your phone
3. For iPhone: Tap Share → "Add to Home Screen" for a native app feel
4. For Android: Tap menu → "Add to Home Screen"

### Deploy for Anywhere Access (Optional)

To access from anywhere (not just home WiFi), deploy to **Railway** (free tier):
1. Push this repo to GitHub
2. Go to railway.app → New Project → Deploy from GitHub
3. Add your environment variables in Railway's dashboard
4. Your dashboard will be live at a public URL

---

## Troubleshooting

**Backend won't start:** Make sure you ran `npm install` in `dashboard/backend`

**"ANTHROPIC_API_KEY not configured":** Add your key to `.env` and restart the backend

**Google not connecting:** Make sure the redirect URI in Google Cloud Console matches exactly: `http://localhost:3001/api/google/callback`

**GitHub showing 401:** Token may have expired. Generate a new one at github.com/settings/tokens
