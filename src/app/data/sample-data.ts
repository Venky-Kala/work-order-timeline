import { WorkCenterDocument } from '../models/work-center.model';
import { WorkOrderDocument } from '../models/work-order.model';

/**
 * Sample data for the Work Order Schedule Timeline.
 *
 * 7 work centers with realistic manufacturing / logistics names.
 * 20 work orders distributed across past, current, and future months
 * relative to today (Feb 13 2026), ensuring:
 *   - All 4 statuses represented (open, in-progress, complete, blocked)
 *   - No overlapping orders within any single work center
 *   - Multiple non-overlapping orders per work center
 *   - Mix of short (~5 weeks) and long (~3.5 months) durations
 *   - 6 orders span the current date for today-indicator visibility
 *   - Data visible across all zoom levels (Day / Week / Month)
 */

export const WORK_CENTERS: WorkCenterDocument[] = [
  {
    docId: 'wc-001',
    docType: 'workCenter',
    data: { name: 'Genesis Hardware' }
  },
  {
    docId: 'wc-002',
    docType: 'workCenter',
    data: { name: 'Rodriques Electrics' }
  },
  {
    docId: 'wc-003',
    docType: 'workCenter',
    data: { name: 'Konsulting Inc' }
  },
  {
    docId: 'wc-004',
    docType: 'workCenter',
    data: { name: 'McMarrow Distribution' }
  },
  {
    docId: 'wc-005',
    docType: 'workCenter',
    data: { name: 'Spartan Manufacturing' }
  },
  {
    docId: 'wc-006',
    docType: 'workCenter',
    data: { name: 'Pinnacle Aerospace' }
  },
  {
    docId: 'wc-007',
    docType: 'workCenter',
    data: { name: 'Valterra Logistics' }
  }
];

export const WORK_ORDERS: WorkOrderDocument[] = [

  // ── wc-001  Genesis Hardware (3 orders) ──────────────────────────
  // Past — complete — ~2.5 months
  {
    docId: 'wo-001',
    docType: 'workOrder',
    data: {
      name: 'Centrix Ltd',
      workCenterId: 'wc-001',
      status: 'complete',
      startDate: '2025-10-01',
      endDate: '2025-12-15'
    }
  },
  // Spans today — open — ~2 months
  {
    docId: 'wo-002',
    docType: 'workOrder',
    data: {
      name: 'Sensor Calibration',
      workCenterId: 'wc-001',
      status: 'open',
      startDate: '2026-01-05',
      endDate: '2026-03-10'
    }
  },
  // Future — in-progress — ~7 weeks
  {
    docId: 'wo-003',
    docType: 'workOrder',
    data: {
      name: 'Circuit Board Run',
      workCenterId: 'wc-001',
      status: 'in-progress',
      startDate: '2026-04-01',
      endDate: '2026-05-20'
    }
  },

  // ── wc-002  Rodriques Electrics (3 orders) ──────────────────────
  // Past — complete — ~2 months
  {
    docId: 'wo-004',
    docType: 'workOrder',
    data: {
      name: 'Capacitor Bank Install',
      workCenterId: 'wc-002',
      status: 'complete',
      startDate: '2025-09-15',
      endDate: '2025-11-10'
    }
  },
  // Recent past — open — ~2 months
  {
    docId: 'wo-005',
    docType: 'workOrder',
    data: {
      name: 'Voltage Regulators',
      workCenterId: 'wc-002',
      status: 'open',
      startDate: '2025-12-01',
      endDate: '2026-02-05'
    }
  },
  // Future — in-progress — ~2.5 months
  {
    docId: 'wo-006',
    docType: 'workOrder',
    data: {
      name: 'Transformer Assembly',
      workCenterId: 'wc-002',
      status: 'in-progress',
      startDate: '2026-03-01',
      endDate: '2026-05-15'
    }
  },

  // ── wc-003  Konsulting Inc (3 orders) ───────────────────────────
  // Past — complete — ~7 weeks
  {
    docId: 'wo-007',
    docType: 'workOrder',
    data: {
      name: 'Vendor Audit Phase 1',
      workCenterId: 'wc-003',
      status: 'complete',
      startDate: '2025-11-01',
      endDate: '2025-12-20'
    }
  },
  // Spans today — in-progress — ~2.5 months
  {
    docId: 'wo-008',
    docType: 'workOrder',
    data: {
      name: 'Compleks Systems',
      workCenterId: 'wc-003',
      status: 'in-progress',
      startDate: '2026-01-10',
      endDate: '2026-03-25'
    }
  },
  // Future — open — ~2.5 months
  {
    docId: 'wo-009',
    docType: 'workOrder',
    data: {
      name: 'ERP Integration',
      workCenterId: 'wc-003',
      status: 'open',
      startDate: '2026-04-15',
      endDate: '2026-06-30'
    }
  },

  // ── wc-004  McMarrow Distribution (3 orders) ───────────────────
  // Past — complete — ~2 months
  {
    docId: 'wo-010',
    docType: 'workOrder',
    data: {
      name: 'Freight Consolidation',
      workCenterId: 'wc-004',
      status: 'complete',
      startDate: '2025-08-20',
      endDate: '2025-10-15'
    }
  },
  // Spans today — blocked — ~3.5 months (long duration)
  {
    docId: 'wo-011',
    docType: 'workOrder',
    data: {
      name: 'Cold Chain Setup',
      workCenterId: 'wc-004',
      status: 'blocked',
      startDate: '2025-11-15',
      endDate: '2026-02-28'
    }
  },
  // Future — open — ~2 months
  {
    docId: 'wo-012',
    docType: 'workOrder',
    data: {
      name: 'Logistics Batch Q2',
      workCenterId: 'wc-004',
      status: 'open',
      startDate: '2026-04-01',
      endDate: '2026-05-30'
    }
  },

  // ── wc-005  Spartan Manufacturing (3 orders) ───────────────────
  // Spans today — in-progress — ~5 weeks (short duration)
  {
    docId: 'wo-013',
    docType: 'workOrder',
    data: {
      name: 'Armor Plating Batch',
      workCenterId: 'wc-005',
      status: 'in-progress',
      startDate: '2026-01-20',
      endDate: '2026-02-25'
    }
  },
  // Future — blocked — ~2 months
  {
    docId: 'wo-014',
    docType: 'workOrder',
    data: {
      name: 'Shield Components',
      workCenterId: 'wc-005',
      status: 'blocked',
      startDate: '2026-03-15',
      endDate: '2026-05-10'
    }
  },
  // Future — open — ~2.5 months
  {
    docId: 'wo-015',
    docType: 'workOrder',
    data: {
      name: 'Titanium Forge Run',
      workCenterId: 'wc-005',
      status: 'open',
      startDate: '2026-06-01',
      endDate: '2026-08-15'
    }
  },

  // ── wc-006  Pinnacle Aerospace (3 orders) ──────────────────────
  // Past — complete — ~2.5 months
  {
    docId: 'wo-016',
    docType: 'workOrder',
    data: {
      name: 'Propulsion Test Rig',
      workCenterId: 'wc-006',
      status: 'complete',
      startDate: '2025-09-01',
      endDate: '2025-11-20'
    }
  },
  // Spans today — blocked — ~2 months
  {
    docId: 'wo-017',
    docType: 'workOrder',
    data: {
      name: 'Avionics Harness',
      workCenterId: 'wc-006',
      status: 'blocked',
      startDate: '2026-01-15',
      endDate: '2026-03-20'
    }
  },
  // Future — open — ~6 weeks
  {
    docId: 'wo-018',
    docType: 'workOrder',
    data: {
      name: 'Fuselage Inspection',
      workCenterId: 'wc-006',
      status: 'open',
      startDate: '2026-05-01',
      endDate: '2026-06-15'
    }
  },

  // ── wc-007  Valterra Logistics (2 orders) ──────────────────────
  // Spans today — in-progress — ~2.5 months
  {
    docId: 'wo-019',
    docType: 'workOrder',
    data: {
      name: 'Route Optimization',
      workCenterId: 'wc-007',
      status: 'in-progress',
      startDate: '2026-02-01',
      endDate: '2026-04-10'
    }
  },
  // Future — blocked — ~2.5 months
  {
    docId: 'wo-020',
    docType: 'workOrder',
    data: {
      name: 'Warehouse Automation',
      workCenterId: 'wc-007',
      status: 'blocked',
      startDate: '2026-05-15',
      endDate: '2026-07-30'
    }
  }
];
