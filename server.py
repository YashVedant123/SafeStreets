import sqlite3, os
from flask import Flask, request, jsonify, send_from_directory

app = Flask(__name__, static_folder='public', static_url_path='')

DB = 'db/safestreets.db'

def get_db():
    os.makedirs('db', exist_ok=True)
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.execute( '''
        CREATE TABLE IF NOT EXISTS reports (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            lat         REAL    NOT NULL,
            lng         REAL    NOT NULL,
            issue_type  TEXT    NOT NULL,
            description TEXT,
            address     TEXT,
            photo       TEXT,
            status      TEXT    DEFAULT 'pending',
            created_at  TEXT    DEFAULT (datetime('now'))
        )
    ''')
    conn.commit()
    conn.close()

@app.route('/')
def index():
    return send_from_directory('public', 'index.html')

@app.route('/api/reports', methods=['GET'])
def get_reports():
    conn = get_db()
    rows = conn.execute(
        'SELECT * FROM reports ORDER BY created_at DESC'
    ).fetchall()
    conn.close()
    return jsonify([dict(row) for row in rows])

@app.route('/api/reports', methods=['POST'])
def create_report():
    data = request.json
    if not all(k in data for k in ['lat', 'lng', 'issue_type']):
        return jsonify({'error': 'Missing required fields'}), 400
    conn = get_db()
    cur = conn.execute('''
        INSERT INTO reports (lat, lng, issue_type, description, address, photo)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (
        data['lat'], data['lng'], data['issue_type'],
        data.get('description', ''),
        data.get('address', ''),
        data.get('photo', '')
    ))
    rid = cur.lastrowid
    conn.commit()
    row = conn.execute('SELECT * FROM reports WHERE id = ?', (rid,)).fetchone()
    conn.close()
    return jsonify(dict(row)), 201

@app.route('/api/stats', methods=['GET'])
def get_stats():
    conn = get_db()
    total = conn.execute('SELECT COUNT(*) as c FROM reports').fetchone()['c']
    by_type = conn.execute(
        'SELECT issue_type, COUNT(*) as count FROM reports '
        'GROUP BY issue_type ORDER BY count DESC'
    ).featchAll()
    conn.close()
    return jsonify({
        'total': total,
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
    conn.execute('UPDATE reports SET status = ? WHERE id = ?',
                 (data['status'], rid))
    conn.commit()
    conn.close()
    return jsonify({'ok': True})

if __name__ == '__main__':
    init_db()
    print('\n SafeStreets running → http://localhost:5000\n')
    app.run(debug=True, port=5000)