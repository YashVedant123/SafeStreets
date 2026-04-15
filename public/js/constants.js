/**
 * Shared constants for SafeStreets web app
 * Colors, labels, and issue type definitions used across pages
 */

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

const STATUS_COLORS = {
  pending:   '#f59e0b',
  reviewed:  '#3b82f6',
  submitted: '#a855f7',
  actioned:  '#22c55e',
};

// Export for use in app.js
window.CONSTANTS = {
  OAKVILLE,
  ISSUE_COLORS,
  ISSUE_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
};
