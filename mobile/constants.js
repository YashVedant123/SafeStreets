/**
 * Shared constants for SafeStreets mobile app
 * Colors, labels, and issue type definitions used across screens
 */

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

export const ISSUE_SEVERITY = {
  no_crosswalk:  5,
  no_sidewalk:   4,
  blind_corner:  3,
  poor_lighting: 2,
  speeding:      2,
  other:         1,
};

export const STATUS_COLORS = {
  pending:   '#f59e0b',
  reviewed:  '#3b82f6',
  submitted: '#a855f7',
  actioned:  '#22c55e',
};

export const ISSUES = [
  { key: 'no_crosswalk',  label: 'No Crosswalk' },
  { key: 'speeding',      label: 'Speeding' },
  { key: 'poor_lighting', label: 'Poor Lighting' },
  { key: 'blind_corner',  label: 'Blind Corner' },
  { key: 'no_sidewalk',   label: 'No Sidewalk' },
  { key: 'other',         label: 'Other' },
];

export const OAKVILLE = {
  latitude:       43.4675,
  longitude:      -79.6877,
  latitudeDelta:  0.08,
  longitudeDelta: 0.08,
};

export const DARK_MAP_STYLE = [
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
