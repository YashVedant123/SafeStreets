# SafeStreets 🚦

A civic safety reporting app for Oakville, Ontario. Users report pedestrian safety issues like missing crosswalks, poor lighting, and dangerous intersections—all through a mobile-first interface.

## Architecture

**SafeStreets uses a simple backend-first approach:**

- **Users**: Download the mobile app or visit the web app
- **No API Keys Required**: Users don't manage any credentials
- **Everything Goes Through Backend**: All requests → backend API
- **Backend Handles Secrets**: Database, Groq AI key, Firebase config

This means:
- ✅ Simple setup for users
- ✅ Secure credential management
- ✅ Easy updates and maintenance
- ✅ No key rotation headaches

---

## Quick Start

### Prerequisites
- Python 3.9+
- Node.js 16+ (for mobile/web development)
- PostgreSQL (for production)

### 1. Clone & Install

```bash
cd safestreets

# Backend dependencies
pip install -r requirements.txt

# Mobile dependencies
cd mobile && npm install && cd ..

# Web dependencies (if using Node for web)
cd public && npm install && cd ..
```

### 2. Set Up Environment

Copy the example to create your actual `.env`:

```bash
cp .env.example .env
```

Edit `.env` and fill in:
- `DATABASE_URL`: PostgreSQL connection string
- `GROQ_API_KEY`: Get from https://console.groq.com/keys
- `ADMIN_KEY`: A strong random secret for admin endpoints

```bash
# Generate a random admin key:
openssl rand -hex 32
```

### 3. Run Backend

```bash
python server.py
```

Backend runs on `http://localhost:5000`

### 4. Run Mobile App

```bash
cd mobile
npm start
```

### 5. Run Web Dashboard

```bash
# The web app is served by the backend at http://localhost:5000
# Just open in your browser!
```

---

## File Structure

```
safestreets/
├── server.py                 # Flask backend API
├── requirements.txt          # Python dependencies
├── .env.example             # Template for environment variables
├── .gitignore               # Prevents .env from being committed
│
├── mobile/                  # React Native mobile app
│   ├── App.js
│   ├── firebase.js          # Minimal - no sensitive keys
│   ├── config.js            # Just backend API URL
│   ├── constants.js         # Shared colors, labels, issue types
│   ├── ThemeContext.js
│   ├── package.json
│   └── screens/
│       ├── MapScreen.js
│       ├── ReportFormScreen.js
│       ├── ReportsScreen.js
│       └── SettingsScreen.js
│
├── public/                  # Web dashboard (served by Flask)
│   ├── index.html
│   ├── js/
│   │   ├── app.js
│   │   └── constants.js     # Shared colors, labels, issue types
│   └── css/
│       └── styles.css
│
└── db/
    └── safestreets.db       # Local SQLite (dev only)
```

---

## Environment Variables

Only the **backend** needs environment variables. Users don't need any!

| Variable | Purpose | Example |
|----------|---------|---------|
| `DATABASE_URL` | PostgreSQL connection | `postgresql://user:pass@localhost/safestreets` |
| `GROQ_API_KEY` | AI spam filtering | `gsk_...` |
| `ADMIN_KEY` | Admin endpoints secret | `your_random_key_here` |

---

## API Endpoints

All requests come from mobile/web apps to these endpoints:

### Public Endpoints

```
GET  /api/reports              # List all approved reports
POST /api/reports              # Submit a new report
GET  /api/stats                # Get aggregated stats
```

### Admin Endpoints (require X-Admin-Key header)

```
GET  /api/reports/flagged      # See flagged reports for manual review
PATCH /api/reports/<id>/status # Update report status
```

---

## Deployment

### Option 1: Render.com (Recommended)

1. Connect your GitHub repo
2. Create new web service
3. Build command: `pip install -r requirements.txt`
4. Start command: `gunicorn server:app`
5. Add environment variables in Settings:
   - `DATABASE_URL` (Render can provision PostgreSQL)
   - `GROQ_API_KEY`
   - `ADMIN_KEY`

### Option 2: Fly.io

```bash
fly launch
fly secrets set DATABASE_URL="..."
fly secrets set GROQ_API_KEY="..."
fly secrets set ADMIN_KEY="..."
fly deploy
```

---

## How Spam Filtering Works

1. User submits a report
2. Backend sends to Groq LLM with location/description
3. AI returns: score (0-100), action (approve/flag/reject)
4. Report stored with spam_score
5. Only approved reports shown to users
6. Admin can review flagged reports

---

## Security Notes

⚠️ **Important:**
- **Never commit .env** - it's in `.gitignore`
- **Change ADMIN_KEY** - don't use defaults in production
- **Use HTTPS** - always in production
- **Validate input** - frontend validation + backend validation
- **Rate limit** - add rate limiting to prevent spam attacks

---

## Development Tips

### Adding a New Issue Type

1. Edit `mobile/constants.js` - add to `ISSUE_COLORS` and `ISSUE_LABELS`
2. Edit `public/js/constants.js` - add same entries
3. Update database schema if needed

### Running with SQLite (Development)

The app defaults to SQLite if `DATABASE_URL` isn't set:

```bash
# Just run without .env:
python server.py
# Uses local db/safestreets.db
```

### Accessing Admin Dashboard

```bash
curl -H "X-Admin-Key: your_admin_key" \
     http://localhost:5000/api/reports/flagged
```

---

## Common Issues

**Q: "DatabaseURL not set"**
- A: Create `.env` from `.env.example` and set `DATABASE_URL`

**Q: "Groq API key invalid"**
- A: Check your GROQ_API_KEY in `.env` - get from https://console.groq.com/keys

**Q: Mobile app can't reach backend**
- A: Make sure `mobile/config.js` has correct API URL. For local dev, use `http://localhost:5000`

**Q: Reports not showing up**
- A: Check they have `spam_score >= 60` or `spam_score = 0`. Use `/api/reports/flagged` to see others.

---

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit changes (`git commit -m 'Add feature'`)
4. Push to branch (`git push origin feature/my-feature`)
5. Open a Pull Request

---

## License

MIT License - see LICENSE file for details

---

## Support

For issues or questions, open a GitHub issue or contact the team.

**SafeStreets** - Making Oakville safer, one report at a time. 🛡️
