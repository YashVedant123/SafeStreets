import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useRef } from 'react';
import MapView, { Marker, Callout, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { API } from '../config';
import { useTheme } from '../ThemeContext';

export const COLORS = {
  bg:      '#0e1117',
  bg2:     '#161b24',
  bg3:     '#1d2535',
  border:  'rgba(255,255,255,0.08)',
  border2: 'rgba(255,255,255,0.15)',
  text:    '#f0f2f5',
  text2:   '#8b95a8',
  text3:   '#5a6275',
  green:   '#22c55e',
  amber:   '#f59e0b',
  red:     '#ef4444',
  blue:    '#3b82f6',
  purple:  '#a855f7',
  teal:    '#14b8a6',
};

export const ISSUE_COLORS = {
  no_crosswalk:  '#ef4444',
  speeding:      '#f59e0b',
  poor_lighting: '#3b82f6',
  blind_corner:  '#a855f7',
  no_sidewalk:   '#14b8a6',
  other:         '#6b7280',
};

export const ISSUE_LABELS = {
  no_crosswalk:  'No Crosswalk',
  speeding:      'Speeding',
  poor_lighting: 'Poor Lighting',
  blind_corner:  'Blind Corner',
  no_sidewalk:   'No Sidewalk',
  other:         'Other',
};

export const darkMapStyle = [
  { elementType: 'geometry',           stylers: [{ color: '#0e1117' }] },
  { elementType: 'labels.text.fill',   stylers: [{ color: '#8b95a8' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0e1117' }] },
  { featureType: 'road',               elementType: 'geometry', stylers: [{ color: '#1d2535' }] },
  { featureType: 'road.arterial',      elementType: 'geometry', stylers: [{ color: '#1d2535' }] },
  { featureType: 'road.highway',       elementType: 'geometry', stylers: [{ color: '#2a3547' }] },
  { featureType: 'water',              elementType: 'geometry', stylers: [{ color: '#0a0f16' }] },
  { featureType: 'poi',                elementType: 'geometry', stylers: [{ color: '#161b24' }] },
  { featureType: 'transit',            elementType: 'geometry', stylers: [{ color: '#161b24' }] },
  { featureType: 'administrative',     elementType: 'geometry.stroke', stylers: [{ color: '#1d2535' }] },
];

const SEVERITY = {
  no_crosswalk:  5,
  no_sidewalk:   4,
  blind_corner:  3,
  poor_lighting: 2,
  speeding:      2,
  other:         1,
};

const OAKVILLE = {
  latitude:       43.4675,
  longitude:      -79.6877,
  latitudeDelta:  0.08,
  longitudeDelta: 0.08,
};

// Haversine distance in metres
function distMetres(lat1, lng1, lat2, lng2) {
  const R  = 6371000;
  const d1 = (lat2 - lat1) * Math.PI / 180;
  const d2 = (lng2 - lng1) * Math.PI / 180;
  const a  = Math.sin(d1/2)**2 +
             Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(d2/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Group reports within ~80m of each other
function clusterReports(reports) {
  const THRESH = 80; // metres
  const clusters = [];
  const used = new Set();

  reports.forEach((r, i) => {
    if (used.has(i)) return;
    const group = [r];
    used.add(i);
    reports.forEach((r2, j) => {
      if (used.has(j)) return;
      if (distMetres(r.lat, r.lng, r2.lat, r2.lng) < THRESH) {
        group.push(r2);
        used.add(j);
      }
    });
    clusters.push(group);
  });
  return clusters;
}

// Hotspot = cluster with 3+ reports
function isHotspot(group) {
  return group.length >= 3;
}

// Hotspot radius in metres — scales with count
function hotspotRadius(group) {
  return 60 + group.length * 10;
}

// AI relevance score
function scoreReport(r, userLat, userLng) {
  let score = 0;
  if (userLat != null && userLng != null) {
    const dist = distMetres(r.lat, r.lng, userLat, userLng);
    score += Math.max(0, 50 - dist / 20);   // up to 50 pts for proximity
  }
  score += (SEVERITY[r.issue_type] || 1) * 5; // up to 25 pts severity
  return score;
}

function CustomPin({ color, count, hot }) {
  const size = hot ? 38 : count > 1 ? 32 : 26;
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{
        width:           size,
        height:          size,
        borderRadius:    size / 2,
        backgroundColor: color + 'ee',
        borderWidth:     hot ? 3 : 2,
        borderColor:     hot ? '#ef4444' : '#fff',
        alignItems:      'center',
        justifyContent:  'center',
        shadowColor:     '#000',
        shadowOffset:    { width: 0, height: 3 },
        shadowOpacity:   0.5,
        shadowRadius:    5,
        elevation:       6,
      }}>
        {count > 1 && (
          <Text style={{ color: '#fff', fontSize: hot ? 13 : 11, fontWeight: '700' }}>
            {count}
          </Text>
        )}
      </View>
      {/* pin tail */}
      <View style={{
        width:            0,
        height:           0,
        borderLeftWidth:  5,
        borderRightWidth: 5,
        borderTopWidth:   8,
        borderStyle:      'solid',
        borderLeftColor:  'transparent',
        borderRightColor: 'transparent',
        borderTopColor:   color + 'ee',
        marginTop:        -1,
      }} />
    </View>
  );
}

export default function MapScreen({ navigation }) {
  const { dark } = useTheme();
  const [reports, setReports] = useState([]);
  const [stats,   setStats]   = useState({ total: 0, pending: 0, actioned: 0 });
  const [userLat, setUserLat] = useState(null);
  const [userLng, setUserLng] = useState(null);
  const mapRef = useRef(null);

  // light theme colours for header/stats overlay
  const bg2    = dark ? COLORS.bg2   : '#ffffff';
  const border = dark ? COLORS.border: 'rgba(0,0,0,0.08)';
  const text   = dark ? COLORS.text  : '#111827';
  const text2  = dark ? COLORS.text2 : '#4b5563';
  const text3  = dark ? COLORS.text3 : '#9ca3af';

  useEffect(() => {
    getUserLocation();
  }, []);

  useEffect(() => {
    fetchReports();
    fetchStats();
  }, [userLat, userLng]);

  async function getUserLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setUserLat(loc.coords.latitude);
        setUserLng(loc.coords.longitude);
      }
    } catch(e) {}
  }

  async function fetchReports() {
    try {
      const res  = await fetch(`${API}/api/reports`);
      const data = await res.json();
      const scored = [...data].sort((a, b) =>
        scoreReport(b, userLat, userLng) - scoreReport(a, userLat, userLng)
      );
      setReports(scored);
    } catch(e) { console.log('Map fetch error:', e); }
  }

  async function fetchStats() {
    try {
      const res = await fetch(`${API}/api/stats`);
      const s   = await res.json();
      const pending  = (s.by_status.find(x => x.status === 'pending')  || {}).count || 0;
      const actioned = (s.by_status.find(x => x.status === 'actioned') || {}).count || 0;
      setStats({ total: s.total, pending, actioned });
    } catch(e) {}
  }

  const clusters = clusterReports(reports);

  return (
    <View style={s.container}>

      <MapView
        ref={mapRef}
        style={s.map}
        initialRegion={OAKVILLE}
        customMapStyle={dark ? darkMapStyle : []}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {/* Hotspot glow circles — rendered before pins so they sit behind */}
        {clusters.filter(isHotspot).map((group, i) => (
          <Circle
            key={`hs-${i}`}
            center={{ latitude: group[0].lat, longitude: group[0].lng }}
            radius={hotspotRadius(group)}
            fillColor="rgba(239,68,68,0.12)"
            strokeColor="rgba(239,68,68,0.45)"
            strokeWidth={1.5}
          />
        ))}

        {clusters.map((group, i) => {
          const rep  = group[0];
          const hot  = isHotspot(group);
          const color = ISSUE_COLORS[rep.issue_type] || '#6b7280';

          return (
            <Marker
              key={`m-${i}`}
              coordinate={{ latitude: rep.lat, longitude: rep.lng }}
              anchor={{ x: 0.5, y: 1 }}
              tracksViewChanges={false}
            >
              <CustomPin color={color} count={group.length} hot={hot} />
              <Callout tooltip>
                <View style={[s.callout, { backgroundColor: bg2, borderColor: dark ? COLORS.border2 : 'rgba(0,0,0,0.12)' }]}>
                  {hot && (
                    <View style={s.hotspotBadge}>
                      <Text style={s.hotspotBadgeText}>HOTSPOT</Text>
                    </View>
                  )}
                  <Text style={[s.calloutType, { color: text }]}>
                    {ISSUE_LABELS[rep.issue_type] || rep.issue_type}
                    {group.length > 1 ? `  +${group.length - 1} more` : ''}
                  </Text>
                  {rep.address ? (
                    <Text style={[s.calloutAddr, { color: text2 }]}>{rep.address}</Text>
                  ) : null}
                  {rep.description ? (
                    <Text style={[s.calloutDesc, { color: text3 }]} numberOfLines={2}>
                      {rep.description}
                    </Text>
                  ) : null}
                  <View style={[s.calloutStatus, {
                    backgroundColor: rep.status === 'actioned'
                      ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)'
                  }]}>
                    <Text style={[s.calloutStatusText, {
                      color: rep.status === 'actioned' ? COLORS.green : COLORS.amber
                    }]}>
                      {rep.status}
                    </Text>
                  </View>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      {/* HEADER OVERLAY */}
      <SafeAreaView style={s.headerWrap} edges={['top']} pointerEvents="box-none">
        <View style={[s.header, { backgroundColor: bg2, borderColor: border }]}>
          <View>
            <Text style={[s.title, { color: text }]}>SafeStreets</Text>
            <Text style={[s.sub,   { color: text2 }]}>Oakville, Ontario</Text>
          </View>
          <TouchableOpacity
            style={[s.settingsBtn, { backgroundColor: dark ? COLORS.bg3 : '#f0f0f2', borderColor: border }]}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={[s.settingsBtnText, { color: text2 }]}>SET</Text>
          </TouchableOpacity>
        </View>

        <View style={s.statsRow}>
          {[
            { label: 'Reports',  val: stats.total   },
            { label: 'Pending',  val: stats.pending  },
            { label: 'Actioned', val: stats.actioned },
          ].map(({ label, val }) => (
            <View key={label} style={[s.statCard, { backgroundColor: bg2, borderColor: border }]}>
              <Text style={s.statNum}>{val}</Text>
              <Text style={[s.statLabel, { color: text3 }]}>{label}</Text>
            </View>
          ))}
        </View>
      </SafeAreaView>

    </View>
  );
}

const s = StyleSheet.create({
  container:         { flex: 1, backgroundColor: COLORS.bg },
  map:               { ...StyleSheet.absoluteFillObject },
  headerWrap:        { position: 'absolute', top: 0, left: 0, right: 0 },
  header:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginTop: 8, borderRadius: 14, padding: 14, borderWidth: 1 },
  title:             { fontSize: 16, fontWeight: '600', letterSpacing: -0.3 },
  sub:               { fontSize: 11, marginTop: 1 },
  settingsBtn:       { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  settingsBtnText:   { fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  statsRow:          { flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 8 },
  statCard:          { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1 },
  statNum:           { fontSize: 20, fontWeight: '600', color: COLORS.green },
  statLabel:         { fontSize: 10, marginTop: 2 },
  callout:           { borderRadius: 12, padding: 12, width: 200, borderWidth: 1 },
  hotspotBadge:      { backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 6 },
  hotspotBadgeText:  { fontSize: 10, fontWeight: '700', color: '#ef4444', letterSpacing: 0.8 },
  calloutType:       { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  calloutAddr:       { fontSize: 12, marginBottom: 4 },
  calloutDesc:       { fontSize: 12, lineHeight: 16, marginBottom: 8 },
  calloutStatus:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, alignSelf: 'flex-start' },
  calloutStatusText: { fontSize: 11, fontWeight: '500' },
});