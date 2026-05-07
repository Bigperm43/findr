# The Middlemen — eBay Watch Engine

Monitor eBay listings automatically. Create watchlists with keywords and price ranges. Get matched results the moment they appear.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React (Create React App) |
| Backend | Node.js + Express |
| Database | SQLite (via better-sqlite3) — zero setup |
| Scheduler | node-cron (runs inside the backend process) |
| Auth | JWT + bcrypt |
| eBay | Browse API v1 (OAuth Client Credentials) |

---

## Quick Start

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Configure environment

```bash
npm run setup
# then edit backend/.env
```

### 3. Add your eBay API keys

Edit `backend/.env`:

```env
EBAY_CLIENT_ID=your-client-id
EBAY_CLIENT_SECRET=your-client-secret
EBAY_SANDBOX=false
```

**Getting eBay keys (free):**
1. Go to https://developer.ebay.com/my/keys
2. Sign in / create account
3. Click **"Create a Keyset"** → choose **Production**
4. Copy **App ID (Client ID)** and **Cert ID (Client Secret)**
5. Under OAuth, ensure `https://api.ebay.com/oauth/api_scope` is enabled

> **Sandbox mode:** Set `EBAY_SANDBOX=true` to use eBay's test environment.  
> Sandbox returns fake listings but is useful for testing the pipeline end-to-end without Production API limits.

### 4. Run the backend

```bash
npm run dev:backend
# Server: http://localhost:3001
# Default login: admin@middlemen.local / password123
```

### 5. Run the frontend (separate terminal)

```bash
npm run dev:frontend
# App: http://localhost:3000
```

---

## How It Works

```
User creates watchlist
       │
       ▼
Cron fires every 30 min (configurable)
       │
       ▼
eBay Browse API → searchEbay(keywords, priceMin, priceMax)
       │
       ▼
Layer 1 filter: keyword overlap + price range (local JS)
       │
       ▼
New matches saved to SQLite (duplicates ignored via UNIQUE constraint)
       │
       ▼
Dashboard shows matches — user marks Found / Dismiss
```

### Scan frequency

Set `SCAN_CRON` in `backend/.env`:

```
*/30 * * * *   → every 30 minutes (default)
*/5 * * * *    → every 5 minutes
0 * * * *      → every hour
```

You can also trigger a manual scan anytime via "Scan Now" or "Scan All" buttons in the UI.

---

## API Reference

All endpoints require `Authorization: Bearer <token>` except login.

| Method | Path | Description |
|---|---|---|
| POST | /api/auth/login | Login → returns JWT |
| GET | /api/auth/me | Current user |
| GET | /api/watchlists | List all watchlists |
| POST | /api/watchlists | Create watchlist |
| PUT | /api/watchlists/:id | Update watchlist |
| DELETE | /api/watchlists/:id | Delete watchlist |
| POST | /api/watchlists/:id/scan | Trigger scan for one watchlist |
| POST | /api/scan/all | Trigger scan for all active watchlists |
| GET | /api/scan/status | Last scan info |
| GET | /api/matches | List matches (filterable) |
| PATCH | /api/matches/:id/feedback | Mark found / not_relevant |
| GET | /api/stats | Dashboard stats |

---

## Database

SQLite file lives at `backend/middlemen.db` — created automatically on first run.

To reset everything:
```bash
rm backend/middlemen.db
node backend/server.js  # recreates schema + default user
```

---

## Changing the Default Password

```bash
node -e "
const bcrypt = require('bcryptjs');
const { getDb } = require('./backend/db');
const db = getDb();
db.prepare(\"UPDATE users SET password_hash = ? WHERE email = 'admin@middlemen.local'\")
  .run(bcrypt.hashSync('yournewpassword', 10));
console.log('Password updated');
"
```

---

## Deployment (Single Server)

For a VPS (Ubuntu):

```bash
# Install Node 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Clone and install
git clone <repo> /opt/middlemen
cd /opt/middlemen && npm run install:all

# Configure
cp backend/.env.example backend/.env
nano backend/.env   # add eBay keys

# Build frontend
cd frontend && npm run build

# Serve frontend static files from Express (add to server.js):
# app.use(express.static(path.join(__dirname, '../frontend/build')));

# Run with PM2
npm install -g pm2
pm2 start backend/server.js --name middlemen
pm2 save && pm2 startup
```

---

## Next Steps (Post-MVP)

- [ ] Email alerts via Resend when new matches appear
- [ ] AI relevance scoring layer (Claude Haiku — only on shortlisted results)
- [ ] Multiple users / SaaS tier system
- [ ] Additional sources: Gumtree AU, Facebook Marketplace scraper
- [ ] Webhook notifications
- [ ] Match deduplication across watchlists
