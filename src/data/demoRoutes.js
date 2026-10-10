/*
 * DEMONSTRATION DATA ONLY.
 *  - Safety scores, factors and coverage are simulated. They are not real-world reports.
 *  - Paths and pin positions are sample coordinates near Jaipur, not real road routing,
 *    and they are not the real locations of the named places.
 *
 * Replace with real results and set data-source="live" on RoutesPanel and MapPanel.
 *
 * Route shape (see RoutesPanel.vue for the full description):
 *   { id, name, distanceKm, durationMin, safety: number | null, confidence, coverage,
 *     factors: [...], path: [[lat, lng], ...] }
 */

const START = [26.831, 75.56];
const END = [26.8435, 75.564];

export const DEMO_TRIP = {
  origin: { name: 'Hotel Highway King', position: START },
  destination: { name: 'Manipal University Jaipur', position: END }
};

export const DEMO_ROUTES = [
  {
    id: 'A',
    name: 'Main road',
    distanceKm: 2,
    durationMin: 30,
    safety: 78,
    confidence: 'simulated',
    coverage: 85,
    factors: [
      { key: 'lighting', label: 'Street lighting', value: 82, source: 'simulated' },
      { key: 'footfall', label: 'Foot traffic', value: 74, source: 'simulated' },
      { key: 'incidents', label: 'Incident reports', value: null, source: null },
      { key: 'open', label: 'Open businesses', value: 76, source: 'simulated' }
    ],
    path: [START, [26.831, 75.5645], [26.8435, 75.5645], END]
  },
  {
    id: 'B',
    name: 'Inner lanes',
    distanceKm: 1.5,
    durationMin: 22,
    safety: 54,
    confidence: 'simulated',
    coverage: 70,
    factors: [
      { key: 'lighting', label: 'Street lighting', value: 48, source: 'simulated' },
      { key: 'footfall', label: 'Foot traffic', value: 40, source: 'simulated' },
      { key: 'incidents', label: 'Incident reports', value: null, source: null },
      { key: 'open', label: 'Open businesses', value: 68, source: 'simulated' }
    ],
    path: [START, [26.8355, 75.5612], [26.8395, 75.5628], END]
  },
  {
    id: 'C',
    name: 'Bypass road',
    distanceKm: 2.4,
    durationMin: 36,
    safety: null,
    confidence: 'incomplete',
    coverage: 15,
    factors: [
      { key: 'lighting', label: 'Street lighting', value: 40, source: 'simulated' },
      { key: 'footfall', label: 'Foot traffic', value: null, source: null },
      { key: 'incidents', label: 'Incident reports', value: null, source: null },
      { key: 'open', label: 'Open businesses', value: null, source: null }
    ],
    path: [START, [26.831, 75.5575], [26.8435, 75.5575], END]
  }
];