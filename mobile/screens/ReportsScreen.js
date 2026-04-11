import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { COLORS } from './MapScreen';

const ISSUE_LABELS = {
  no_crosswalk:   'No Crosswalk',
  speeding:       'Speeding',
  poor_lighting:  'Poor Lighting',
  blind_corner:   'Blind Corner',
  no_sidewalk:    'No Sidewalk',
  other:          'Other',
};

const ISSUE_COLORS = {
  no_crosswalk:   '#ef4444',
  speeding:       '#f59e0b',
  poor_lighting:  '#3b82f6',
  blind_corner:   '#a855f7',
  no_sidewalk:    '#14b8a6',
  other:          '#6b7280',
};

const STATUS_COLORS = {
  pending:   '#f59e0b',
  reviewed:  '#3b82f6',
  submitted: '#a855f7',
  actioned:  '#22c55e',
};

function ReportCard({ report }) {
  const issueColor  = ISSUE_COLORS[report.issue_type]  || '#6b7280';
  const statusColor = STATUS_COLORS[report.status] || '#6b7280';

  return (
    <TouchableOpacity style={s.card} activeOpacity={0.7}>
      <View style={s.cardTop}>
        <View style={[s.badge, { backgroundColor: issueColor + '22', borderColor: issueColor + '44' }]}>
          <Text style={[s.badgeText, { color: issueColor }]}>
            {ISSUE_LABELS[report.issue_type] || report.issue_type}
          </Text>
        </View>
        {report.verified && (
          <View style={s.verifiedBadge}>
            <Text style={s.verifiedText}>✓ Verified</Text>
          </View>
        )}
        <View style={[s.statusDot, { backgroundColor: statusColor }]} />
      </View>

      <Text style={s.address} numberOfLines={1}>
        {report.address || `${parseFloat(report.lat).toFixed(4)}, ${parseFloat(report.lng).toFixed(4)}`}
      </Text>

      {report.description ? (
        <Text style={s.desc} numberOfLines={2}>{report.description}</Text>
      ) : null}

      <View style={s.cardBottom}>
        <Text style={s.meta}>{report.status}</Text>
        <Text style={s.meta}>{formatDate(report.created_at)}</Text>
      </View>
    </TouchableOpacity>
  );
}

function formatDate(str) {
  if (!str) return '';
  return new Date(str).toLocaleDateString('en-CA', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
}

export default function ReportsScreen() {
  const [reports, setReports]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter,  setFilter]    = useState('all');

  const FILTERS = [
    { key: 'all',          label: 'All'          },
    { key: 'no_crosswalk', label: 'No Crosswalk' },
    { key: 'speeding',     label: 'Speeding'     },
    { key: 'poor_lighting',label: 'Lighting'     },
    { key: 'blind_corner', label: 'Blind Corner' },
    { key: 'other',        label: 'Other'        },
  ];

  useEffect(() => {
    fetchReports();
  }, []);

  async function fetchReports() {
    try {
      const res  = await fetch('http://172.20.10.2:5000/api/reports');
      const data = await res.json();
      setReports(data);
    } catch(e) {
      console.log('Could not fetch reports:', e);
    } finally {
      setLoading(false);
    }
  }

  const filtered = filter === 'all'
    ? reports
    : reports.filter(r => r.issue_type === filter);

  return (
    <SafeAreaView style={s.container} edges={['top']}>

      <View style={s.header}>
        <Text style={s.title}>Reports</Text>
        <Text style={s.count}>{filtered.length} spots</Text>
      </View>

      <View style={s.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[s.chip, filter === f.key && s.chipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[s.chipText, filter === f.key && s.chipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={s.center}>
          <Text style={s.emptyText}>Loading...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={s.center}>
          <Text style={s.emptyText}>No reports yet.</Text>
          <Text style={s.emptySub}>Be the first to flag a danger spot.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={r => r.id.toString()}
          renderItem={({ item }) => <ReportCard report={item} />}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          showsVerticalScrollIndicator={false}
        />
      )}

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: COLORS.bg },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title:           { fontSize: 18, fontWeight: '600', color: COLORS.text, letterSpacing: -0.3 },
  count:           { fontSize: 13, color: COLORS.text3 },
  filterRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  chip:            { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, borderWidth: 1, borderColor: COLORS.border },
  chipActive:      { backgroundColor: 'rgba(34,197,94,0.12)', borderColor: COLORS.green },
  chipText:        { fontSize: 12, color: COLORS.text3 },
  chipTextActive:  { color: COLORS.green },
  center:          { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText:       { fontSize: 15, color: COLORS.text2 },
  emptySub:        { fontSize: 13, color: COLORS.text3 },
  card:            { backgroundColor: COLORS.bg2, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  cardTop:         { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  badge:           { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, borderWidth: 1 },
  badgeText:       { fontSize: 12, fontWeight: '500' },
  verifiedBadge:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, backgroundColor: 'rgba(34,197,94,0.12)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)' },
  verifiedText:    { fontSize: 11, color: COLORS.green, fontWeight: '500' },
  statusDot:       { width: 7, height: 7, borderRadius: 99, marginLeft: 'auto' },
  address:         { fontSize: 14, color: COLORS.text, fontWeight: '500', marginBottom: 4 },
  desc:            { fontSize: 13, color: COLORS.text2, lineHeight: 18, marginBottom: 8 },
  cardBottom:      { flexDirection: 'row', justifyContent: 'space-between' },
  meta:            { fontSize: 11, color: COLORS.text3 },
});