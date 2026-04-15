import os
import psycopg2
import psycopg2.extras
import json
from groq import Groq
from flask import Flask, request, jsonify
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_folder='public', static_url_path='')

DATABASE_URL = os.environ.get('DATABASE_URL')
GROQ_API_KEY = os.environ.get('GROQ_API_KEY')
ADMIN_KEY    = os.environ.get('ADMIN_KEY', 'changeme')

gc = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

# ── DB ────────────────────────────────────────────────────────────────────────

def get_db():
    conn = psycopg2.connect(DATABASE_URL, sslmode='require')
    conn.autocommit = False
    return conn

def init_db():
    conn = get_db()
    cur  = conn.cursor()
    cur.execute('''
        CREATE TABLE IF NOT EXISTS reports (
            id          SERIAL PRIMARY KEY,
            lat         REAL    NOT NULL,
            lng         REAL    NOT NULL,
            issue_type  TEXT    NOT NULL,
            description TEXT,
            address     TEXT,
            photo       TEXT,
            status      TEXT    DEFAULT 'pending',
            verified    BOOLEAN DEFAULT FALSE,
            spam_score  INTEGER DEFAULT 0,
            spam_reason TEXT,
            created_at  TIMESTAMP DEFAULT NOW()
        )
    ''')
    conn.commit()
    cur.close()
    conn.close()

# ── AI SPAM FILTER ────────────────────────────────────────────────────────────

SPAM_PROMPT = """You are a spam filter for SafeStreets Oakville — a civic app where residents report pedestrian safety issues like missing crosswalks, poor lighting, and dangerous intersections.

Analyze this report and return ONLY a raw JSON object with absolutely no extra text, no markdown, no backticks:
{{"score": <0-100>, "action": "<approve|flag|reject>", "reason": "<one short sentence>"}}

Scoring rules:
- approve (score 60-100): plausible safety concern, real-sounding location, coherent description
- flag (score 30-59): vague, suspicious coordinates, odd or very short description
- reject (score 0-29): gibberish, offensive content, clearly fake, coordinates outside Oakville

Oakville is roughly lat 43.35-43.55, lng -79.85 to -79.45. Reject anything far outside this box.

Report:
- Issue type: {issue_type}
- Address: {address}
- Description: {description}
- Coordinates: {lat}, {lng}
- Has photo: {has_photo}"""

def ai_spam_check(data):
    if not gc:
        return 80, 'approve', 'AI filter not configured'
    try:
        prompt = SPAM_PROMPT.format(
            issue_type  = data.get('issue_type', ''),
            address     = data.get('address',     'not provided'),
            description = data.get('description', 'not provided'),
            lat         = data.get('lat', 0),
            lng         = data.get('lng', 0),
            has_photo   = 'yes' if data.get('photo') else 'no',
        )
        response = gc.chat.completions.create(
            model    = 'llama-3.1-8b-instant',
            messages = [
                {
                    'role':    'system',
                    'content': 'You are a JSON-only spam filter. Never output anything except a raw JSON object.'
                },
                {
                    'role':    'user',
                    'content': prompt
                }
            ],
            max_tokens  = 120,
            temperature = 0.1,
        )
        raw    = response.choices[0].message.content.strip()
        # Strip any accidental markdown backticks
        raw    = raw.replace('```json', '').replace('```', '').strip()
        result = json.loads(raw)
        return (
            int(result.get('score',  50)),
            str(result.get('action', 'flag')),
            str(result.get('reason', ''))
        )
    except Exception as e:
        print('Groq spam check failed:', e)
        return 50, 'flag', 'AI check failed — queued for manual review'

# ── ROUTES ────────────────────────────────────────────────────────────────────

@app.route('/')
def index():
    return jsonify({'status': 'SafeStreets API running'})

@app.route('/api/reports', methods=['GET'])
def get_reports():
    conn = get_db()
    cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute('''
        SELECT * FROM reports
        WHERE status != 'rejected'
        AND (spam_score >= 60 OR spam_score = 0)
        ORDER BY created_at DESC
    ''')
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.route('/api/reports/flagged', methods=['GET'])
def get_flagged():
    secret = request.headers.get('X-Admin-Key')
    if secret != ADMIN_KEY:
        return jsonify({'error': 'Unauthorized'}), 401
    conn = get_db()
    cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute('''
        SELECT * FROM reports
        WHERE spam_score BETWEEN 30 AND 59
        ORDER BY created_at DESC
    ''')
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.route('/api/reports', methods=['POST'])
def create_report():
    data = request.json
    if not all(k in data for k in ['lat', 'lng', 'issue_type']):
        return jsonify({'error': 'Missing required fields'}), 400

    score, action, reason = ai_spam_check(data)

    if action == 'reject':
        return jsonify({'error': 'Report rejected', 'reason': reason}), 422

    db_status = 'pending' if action == 'approve' else 'flagged'

    conn = get_db()
    cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute('''
        INSERT INTO reports
            (lat, lng, issue_type, description, address, photo, status, spam_score, spam_reason)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING *
    ''', (
        data['lat'],
        data['lng'],
        data['issue_type'],
        data.get('description', ''),
        data.get('address',     ''),
        data.get('photo',       ''),
        db_status,
        score,
        reason,
    ))
    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()

    return jsonify({
        **dict(row),
        'flagged': action == 'flag',
        'message': 'Report submitted for review' if action == 'flag' else 'Report submitted',
    }), 201

@app.route('/api/stats', methods=['GET'])
def get_stats():
    conn = get_db()
    cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute('SELECT COUNT(*) as c FROM reports WHERE spam_score >= 60 OR spam_score = 0')
    total = cur.fetchone()['c']
    cur.execute('''
        SELECT issue_type, COUNT(*) as count FROM reports
        WHERE spam_score >= 60 OR spam_score = 0
        GROUP BY issue_type ORDER BY count DESC
    ''')
    by_type = cur.fetchall()
    cur.execute('''
        SELECT status, COUNT(*) as count FROM reports
        WHERE spam_score >= 60 OR spam_score = 0
        GROUP BY status
    ''')
    by_status = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify({
        'total':     total,
        'by_type':   [dict(r) for r in by_type],
        'by_status': [dict(r) for r in by_status],
    })

@app.route('/api/reports/<int:rid>/status', methods=['PATCH'])
def update_status(rid):
    data  = request.json
    valid = ['pending', 'reviewed', 'submitted', 'actioned', 'rejected']
    if data.get('status') not in valid:
        return jsonify({'error': 'Invalid status'}), 400
    conn = get_db()
    cur  = conn.cursor()
    cur.execute('UPDATE reports SET status = %s WHERE id = %s', (data['status'], rid))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'ok': True})

with app.app_context():
    init_db()

if __name__ == '__main__':
    print('\n SafeStreets running → http://localhost:5000\n')
    app.run(debug=True, port=5000)