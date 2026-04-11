import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useRef } from 'react';
import MapView, { Marker, Callout } from 'react-native-maps';

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

const MAC_IP = '172.20.10.2';

const OAKVILLE = {
  latitude:       43.4675,
  longitude:      -79.6877,
  latitudeDelta:  0.08,
  longitudeDelta: 0.08,
};

export default function MapScreen({ navigation }) {
  const [reports, setReports] = useState([]);
  const [stats,   setStats]   = useState({ total: 0, pending: 0, actioned: 0 });
  const mapRef = useRef(null);

  useEffect(() => {
    fetchReports();
    fetchStats();
  }, []);

  async function fetchReports() {
    try {
      const res  = await fetch(`http://${MAC_IP}:5000/api/reports`);
      const data = await res.json();
      setReports(data);
    } catch(e) {
      console.log('Map fetch error:', e);
    }
  }

  async function fetchStats() {
    try {
      const res = await fetch(`http://${MAC_IP}:5000/api/stats`);
      const s   = await res.json();
      const pending  = (s.by_status.find(x => x.status === 'pending')  || {}).count || 0;
      const actioned = (s.by_status.find(x => x.status === 'actioned') || {}).count || 0;
      setStats({ total: s.total, pending, actioned });
    } catch(e) {}
  }

  return (
    <View style={s.container}>

      <MapView
        ref={mapRef}
        style={s.map}
        initialRegion={OAKVILLE}
        customMapStyle={darkMapStyle}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {reports.map(r => (
          <Marker
            key={r.id}
            coordinate={{ latitude: r.lat, longitude: r.lng }}
            pinColor={ISSUE_COLORS[r.issue_type] || '#6b7280'}
          >
            <Callout tooltip>
              <View style={s.callout}>
                <Text style={s.calloutType}>
                  {ISSUE_LABELS[r.issue_type] || r.issue_type}
                </Text>
                {r.address ? (
                  <Text style={s.calloutAddr}>{r.address}</Text>
                ) : null}
                {r.description ? (
                  <Text style={s.calloutDesc} numberOfLines={2}>{r.description}</Text>
                ) : null}
                <View style={[s.calloutStatus, { backgroundColor: r.status === 'actioned' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)' }]}>
                  <Text style={[s.calloutStatusText, { color: r.status === 'actioned' ? COLORS.green : COLORS.amber }]}>
                    {r.status}
                  </Text>
                </View>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {/* HEADER OVERLAY */}
      <SafeAreaView style={s.headerWrap} edges={['top']} pointerEvents="box-none">
        <View style={s.header}>
          <View>
            <Text style={s.title}>SafeStreets</Text>
            <Text style={s.sub}>Oakville, Ontario</Text>
          </View>
          <TouchableOpacity
            style={s.settingsBtn}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={s.settingsBtnText}>SET</Text>
          </TouchableOpacity>
        </View>

        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statNum}>{stats.total}</Text>
            <Text style={s.statLabel}>Reports</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statNum}>{stats.pending}</Text>
            <Text style={s.statLabel}>Pending</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statNum}>{stats.actioned}</Text>
            <Text style={s.statLabel}>Actioned</Text>
          </View>
        </View>
      </SafeAreaView>

    </View>
  );
}

const darkMapStyle = [
  { elementType: 'geometry',        stylers: [{ color: '#0e1117' }] },
  { elementType: 'labels.text.fill',stylers: [{ color: '#8b95a8' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0e1117' }] },
  { featureType: 'road',            elementType: 'geometry', stylers: [{ color: '#1d2535' }] },
  { featureType: 'road.arterial',   elementType: 'geometry', stylers: [{ color: '#1d2535' }] },
  { featureType: 'road.highway',    elementType: 'geometry', stylers: [{ color: '#2a3547' }] },
  { featureType: 'water',           elementType: 'geometry', stylers: [{ color: '#0a0f16' }] },
  { featureType: 'poi',             elementType: 'geometry', stylers: [{ color: '#161b24' }] },
  { featureType: 'transit',         elementType: 'geometry', stylers: [{ color: '#161b24' }] },
  { featureType: 'administrative',  elementType: 'geometry.stroke', stylers: [{ color: '#1d2535' }] },
];

const s = StyleSheet.create({
  container:         { flex: 1, backgroundColor: COLORS.bg },
  map:               { ...StyleSheet.absoluteFillObject },
  headerWrap:        { position: 'absolute', top: 0, left: 0, right: 0 },
  header:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginTop: 8, backgroundColor: COLORS.bg2, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  title:             { fontSize: 16, fontWeight: '600', color: COLORS.text, letterSpacing: -0.3 },
  sub:               { fontSize: 11, color: COLORS.text2, marginTop: 1 },
  settingsBtn:       { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: COLORS.bg3, borderWidth: 1, borderColor: COLORS.border },
  settingsBtnText:   { fontSize: 11, fontWeight: '600', color: COLORS.text2, letterSpacing: 0.5 },
  statsRow:          { flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 8 },
  statCard:          { flex: 1, backgroundColor: COLORS.bg2, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  statNum:           { fontSize: 20, fontWeight: '600', color: COLORS.green },
  statLabel:         { fontSize: 10, color: COLORS.text3, marginTop: 2 },
  callout:           { backgroundColor: COLORS.bg2, borderRadius: 12, padding: 12, width: 200, borderWidth: 1, borderColor: COLORS.border2 },
  calloutType:       { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  calloutAddr:       { fontSize: 12, color: COLORS.text2, marginBottom: 4 },
  calloutDesc:       { fontSize: 12, color: COLORS.text3, lineHeight: 16, marginBottom: 8 },
  calloutStatus:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, alignSelf: 'flex-start' },
  calloutStatusText: { fontSize: 11, fontWeight: '500' },
});