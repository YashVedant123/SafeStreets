import os
import psycopg2
import psycopg2.extras
from flask import Flask, request, jsonify, send_from_directory

app = Flask(__name__, static_folder='public', static_url_path='')

with app.app_context():
    init_db()

DATABASE_URL = os.environ.get('DATABASE_URL')

def get_db():
    conn = psycopg2.connect(DATABASE_URL, sslmode='require')
    conn.autocommit = False
    return conn

def init_db():
    conn = get_db()
    cur = conn.cursor()
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
            created_at  TIMESTAMP DEFAULT NOW()
        )
    ''')
    conn.commit()
    cur.close()
    conn.close()

@app.route('/')
def index():
    return jsonify({'status': 'SafeStreets API running'})

@app.route('/api/reports', methods=['GET'])
def get_reports():
    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute('SELECT * FROM reports ORDER BY created_at DESC')
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.route('/api/reports', methods=['POST'])
def create_report():
    data = request.json
    if not all(k in data for k in ['lat', 'lng', 'issue_type']):
        return jsonify({'error': 'Missing required fields'}), 400
    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute('''
        INSERT INTO reports (lat, lng, issue_type, description, address, photo)
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING *
    ''', (
        data['lat'], data['lng'], data['issue_type'],
        data.get('description', ''),
        data.get('address', ''),
        data.get('photo', '')
    ))
    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    return jsonify(dict(row)), 201

@app.route('/api/stats', methods=['GET'])
def get_stats():
    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute('SELECT COUNT(*) as c FROM reports')
    total = cur.fetchone()['c']
    cur.execute('SELECT issue_type, COUNT(*) as count FROM reports GROUP BY issue_type ORDER BY count DESC')
    by_type = cur.fetchall()
    cur.execute('SELECT status, COUNT(*) as count FROM reports GROUP BY status')
    by_status = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify({
        'total':     total,
        'by_type':   [dict(r) for r in by_type],
        'by_status': [dict(r) for r in by_status]
    })

@app.route('/api/reports/<int:rid>/status', methods=['PATCH'])
def update_status(rid):
    data = request.json
    valid = ['pending', 'reviewed', 'submitted', 'actioned']
    if data.get('status') not in valid:
        return jsonify({'error': 'Invalid status'}), 400
    conn = get_db()
    cur = conn.cursor()
    cur.execute('UPDATE reports SET status = %s WHERE id = %s', (data['status'], rid))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'ok': True})

if __name__ == '__main__':
    init_db()
    print('\n SafeStreets running → http://localhost:5000\n')
    app.run(debug=True, port=5000)