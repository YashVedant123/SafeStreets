const OAKVILLE = [43.4675, -79.6877];

const ISSUE_COLORS = {
  no_crosswalk:  '#ef4444',
  speeding:      '#f59e0b',
  poor_lighting: '#3b82f6',
  blind_corner:  '#a855f7',
  no_sidewalk:   '#14b8a6',
  other:         '#6b7280',
};

const ISSUE_LABELS = {
  no_crosswalk:  'No Crosswalk',
  speeding:      'Speeding',
  poor_lighting: 'Poor Lighting',
  blind_corner:  'Blind Corner',
  no_sidewalk:   'No Sidewalk',
  other:         'Other',
};

const STATUS_LABELS = ['pending', 'reviewed', 'submitted', 'actioned'];

let map, markers = {}, allReports = [];
let selectedIssue = null;
let selectedLat = null, selectedLng = null;
let photoBase64 = null;
let activeFilter = 'all';
let pendingPin = null;

// ── MAP ──────────────────────────────────────────────────────────────────────

function initMap() {
  map = L.map('map', { zoomControl: false }).setView(OAKVILLE, 13);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    maxZoom: 19
  }).addTo(map);

  L.control.zoom({ position: 'bottomright' }).addTo(map);

  map.on('click', (e) => {
    if (document.getElementById('modal-overlay').classList.contains('open')) {
      setLocation(e.latlng.lat, e.latlng.lng);
    }
  });
}

// ── MARKERS ──────────────────────────────────────────────────────────────────

function makeIcon(type) {
  const color = ISSUE_COLORS[type] || '#6b7280';
  const html = `
    <div style="
      width:28px; height:28px;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      background:${color};
      border:2px solid rgba(0,0,0,0.3);
      box-shadow:0 2px 8px rgba(0,0,0,0.4);
      display:flex; align-items:center; justify-content:center;">
      <span style="transform:rotate(45deg); font-size:11px;">⚠</span>
    </div>`;
  return L.divIcon({
    html,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });
}

function renderMarkers(reports) {
  Object.values(markers).forEach(m => map.removeLayer(m));
  markers = {};
  reports.forEach(r => {
    const m = L.marker([r.lat, r.lng], { icon: makeIcon(r.issue_type) }).addTo(map);
    m.on('click', () => openDetail(r));
    markers[r.id] = m;
  });
}

// ── DATA ─────────────────────────────────────────────────────────────────────

async function loadReports() {
  try {
    const res = await fetch('/api/reports');
    allReports = await res.json();
    applyFilter();
    loadStats();
  } catch(e) {
    document.getElementById('reports-list').innerHTML =
      '<div class="empty-msg">Could not load reports.<br>Is the server running?</div>';
  }
}

async function loadStats() {
  try {
    const res = await fetch('/api/stats');
    const s = await res.json();
    document.getElementById('stat-total').textContent = s.total;
    const pending  = (s.by_status.find(x => x.status === 'pending')  || {}).count || 0;
    const actioned = (s.by_status.find(x => x.status === 'actioned') || {}).count || 0;
    document.getElementById('stat-pending').textContent  = pending;
    document.getElementById('stat-actioned').textContent = actioned;
  } catch(e) {}
}

function applyFilter() {
  const filtered = activeFilter === 'all'
    ? allReports
    : allReports.filter(r => r.issue_type === activeFilter);
  renderMarkers(filtered);
  renderList(filtered);
}

// ── LIST ─────────────────────────────────────────────────────────────────────

function renderList(reports) {
  const el = document.getElementById('reports-list');
  if (!reports.length) {
    el.innerHTML = '<div class="empty-msg">No reports yet.<br>Be the first to flag a danger spot.</div>';
    return;
  }
  el.innerHTML = reports.map(r => `
    <div class="report-item" onclick='openDetail(${JSON.stringify(r)})'>
      <div class="ri-top">
        <span class="badge badge-${r.issue_type}">
          ${ISSUE_LABELS[r.issue_type] || r.issue_type}
        </span>
      </div>
      <div class="ri-addr">${r.address || coordLabel(r.lat, r.lng)}</div>
      <div class="ri-meta">
        <span class="dot dot-${r.status}"></span>${r.status}
        &nbsp;·&nbsp;${fmtDate(r.created_at)}
      </div>
    </div>
  `).join('');
}

// ── DETAIL PANEL ─────────────────────────────────────────────────────────────

function openDetail(r) {
  const steps = STATUS_LABELS.map(s => `
    <div class="status-step ${r.status === s ? 'active' : ''}"
      onclick="updateStatus(${r.id}, '${s}', this)">${s}</div>
  `).join('');

  const img = r.photo
    ? `<img class="detail-img" src="${r.photo}">`
    : '';

  document.getElementById('detail-content').innerHTML = `
    <div style="margin: 8px 0 16px;">
      <span class="badge badge-${r.issue_type}" style="font-size:13px; padding:5px 12px;">
        ${ISSUE_LABELS[r.issue_type] || r.issue_type}
      </span>
    </div>
    <div class="detail-desc">
      ${r.description || '<em style="color:var(--text3)">No description.</em>'}
    </div>
    <div class="detail-meta">
      <div>📍 ${r.address || coordLabel(r.lat, r.lng)}</div>
      <div>🕐 ${fmtDate(r.created_at)}</div>
    </div>
    ${img}
    <div class="status-wrap">
      <div class="status-label">Status</div>
      <div class="status-steps">${steps}</div>
    </div>
  `;

  document.getElementById('detail-panel').classList.add('open');

  if (markers[r.id]) {
    map.setView([r.lat, r.lng], 16, { animate: true });
  }
}

async function updateStatus(id, status, el) {
  try {
    await fetch(`/api/reports/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    el.closest('.status-steps')
      .querySelectorAll('.status-step')
      .forEach(s => s.classList.remove('active'));
    el.classList.add('active');
    const r = allReports.find(r => r.id === id);
    if (r) r.status = status;
    renderList(activeFilter === 'all' ? allReports : allReports.filter(r => r.issue_type === activeFilter));
    showToast('Status updated');
  } catch(e) {
    showToast('Failed to update');
  }
}

// ── MODAL ────────────────────────────────────────────────────────────────────

function openModal() {
  selectedIssue = null;
  selectedLat   = null;
  selectedLng   = null;
  photoBase64   = null;
  document.getElementById('modal-overlay').classList.add('open');
  document.getElementById('address-input').value = '';
  document.getElementById('desc-input').value    = '';
  document.getElementById('photo-preview').style.display = 'none';
  document.getElementById('photo-label').style.display   = '';
  document.getElementById('location-display').textContent = 'Click the map to drop a pin';
  document.getElementById('location-display').classList.remove('set');
  document.querySelectorAll('.issue-btn').forEach(b => b.classList.remove('selected'));
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  if (pendingPin) { map.removeLayer(pendingPin); pendingPin = null; }
}

function setLocation(lat, lng) {
  selectedLat = lat;
  selectedLng = lng;
  const display = document.getElementById('location-display');
  display.textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  display.classList.add('set');
  if (pendingPin) map.removeLayer(pendingPin);
  pendingPin = L.circleMarker([lat, lng], {
    radius: 10, color: '#22c55e',
    fillColor: '#22c55e', fillOpacity: 0.35, weight: 2
  }).addTo(map);
}

async function submitReport() {
  if (!selectedIssue) { showToast('Select an issue type'); return; }
  if (!selectedLat)   { showToast('Set a location on the map'); return; }

  const btn = document.getElementById('submit-btn');
  btn.disabled    = true;
  btn.textContent = 'Submitting...';

  try {
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat:         selectedLat,
        lng:         selectedLng,
        issue_type:  selectedIssue,
        description: document.getElementById('desc-input').value,
        address:     document.getElementById('address-input').value,
        photo:       photoBase64 || '',
      })
    });
    if (!res.ok) throw new Error();
    closeModal();
    pendingPin = null;
    await loadReports();
    showToast('Report submitted — thank you!');
  } catch(e) {
    showToast('Failed to submit. Is the server running?');
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Submit Report';
  }
}

// ── PHOTO ────────────────────────────────────────────────────────────────────

function handlePhoto(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    photoBase64 = e.target.result;
    document.getElementById('photo-preview').src          = photoBase64;
    document.getElementById('photo-preview').style.display = 'block';
    document.getElementById('photo-label').style.display   = 'none';
  };
  reader.readAsDataURL(file);
}

// ── UTILS ────────────────────────────────────────────────────────────────────

function coordLabel(lat, lng) {
  return `${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}`;
}

function fmtDate(str) {
  if (!str) return '';
  return new Date(str).toLocaleDateString('en-CA', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

// ── EVENTS ───────────────────────────────────────────────────────────────────

document.getElementById('report-btn').addEventListener('click', openModal);
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('cancel-btn').addEventListener('click', closeModal);
document.getElementById('submit-btn').addEventListener('click', submitReport);

document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
});

document.getElementById('detail-close').addEventListener('click', () => {
  document.getElementById('detail-panel').classList.remove('open');
});

document.querySelectorAll('.issue-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.issue-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedIssue = btn.dataset.val;
  });
});

document.querySelectorAll('.filter-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeFilter = chip.dataset.filter;
    applyFilter();
  });
});

document.getElementById('locate-btn').addEventListener('click', () => {
  if (!navigator.geolocation) { showToast('Geolocation not supported'); return; }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      setLocation(pos.coords.latitude, pos.coords.longitude);
      map.setView([pos.coords.latitude, pos.coords.longitude], 16);
    },
    () => showToast('Could not get your location')
  );
});

document.getElementById('photo-drop').addEventListener('click', () => {
  document.getElementById('photo-input').click();
});
document.getElementById('photo-input').addEventListener('change', (e) => {
  handlePhoto(e.target.files[0]);
});
document.getElementById('photo-drop').addEventListener('dragover', e => e.preventDefault());
document.getElementById('photo-drop').addEventListener('drop', (e) => {
  e.preventDefault();
  handlePhoto(e.dataTransfer.files[0]);
});

// ── BOOT ─────────────────────────────────────────────────────────────────────

initMap();
loadReports();