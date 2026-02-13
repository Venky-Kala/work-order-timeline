import { TestBed } from '@angular/core/testing';
import { WorkOrderService } from './work-order.service';
import { WorkOrderDocument } from '../models/work-order.model';

describe('WorkOrderService', () => {
  let service: WorkOrderService;

  beforeEach(() => {
    // Clear localStorage before each test to prevent state leakage
    localStorage.clear();

    TestBed.configureTestingModule({});
    service = TestBed.inject(WorkOrderService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ─── Basic service instantiation ───

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return work centers', () => {
    const centers = service.getWorkCenters();
    expect(centers.length).toBeGreaterThan(0);
    centers.forEach(c => {
      expect(c.docId).toBeTruthy();
      expect(c.docType).toBe('workCenter');
      expect(c.data.name).toBeTruthy();
    });
  });

  it('should return work orders via observable', (done) => {
    service.getWorkOrders$().subscribe(orders => {
      expect(orders.length).toBeGreaterThan(0);
      orders.forEach(o => {
        expect(o.docId).toBeTruthy();
        expect(o.docType).toBe('workOrder');
        expect(o.data.name).toBeTruthy();
        expect(o.data.workCenterId).toBeTruthy();
        expect(o.data.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(o.data.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
      done();
    });
  });

  it('should return work orders synchronously', () => {
    const orders = service.getWorkOrders();
    expect(orders.length).toBeGreaterThan(0);
  });

  // ─── CRUD: Create ───

  describe('createWorkOrder', () => {
    it('should create a new work order and emit it', (done) => {
      const initialCount = service.getWorkOrders().length;

      const newOrder = service.createWorkOrder({
        name: 'Test Order',
        workCenterId: 'wc-1',
        status: 'open',
        startDate: '2026-06-01',
        endDate: '2026-06-15'
      });

      expect(newOrder.docId).toBeTruthy();
      expect(newOrder.data.name).toBe('Test Order');
      expect(newOrder.data.status).toBe('open');

      service.getWorkOrders$().subscribe(orders => {
        expect(orders.length).toBe(initialCount + 1);
        const found = orders.find(o => o.docId === newOrder.docId);
        expect(found).toBeTruthy();
        expect(found!.data.name).toBe('Test Order');
        done();
      });
    });

    it('should generate docIds with the wo- prefix', () => {
      const order = service.createWorkOrder({
        name: 'Order A',
        workCenterId: 'wc-1',
        status: 'open',
        startDate: '2026-07-01',
        endDate: '2026-07-10'
      });

      expect(order.docId).toMatch(/^wo-\d+$/);
    });
  });

  // ─── CRUD: Update ───

  describe('updateWorkOrder', () => {
    it('should update an existing work order name and status', (done) => {
      const orders = service.getWorkOrders();
      const target = orders[0];

      service.updateWorkOrder(target.docId, {
        name: 'Updated Name',
        status: 'complete'
      });

      service.getWorkOrders$().subscribe(updated => {
        const found = updated.find(o => o.docId === target.docId);
        expect(found).toBeTruthy();
        expect(found!.data.name).toBe('Updated Name');
        expect(found!.data.status).toBe('complete');
        // Other fields should remain unchanged
        expect(found!.data.workCenterId).toBe(target.data.workCenterId);
        expect(found!.data.startDate).toBe(target.data.startDate);
        done();
      });
    });

    it('should update dates without affecting other fields', () => {
      const orders = service.getWorkOrders();
      const target = orders[0];
      const originalName = target.data.name;

      service.updateWorkOrder(target.docId, {
        startDate: '2026-01-01',
        endDate: '2026-02-01'
      });

      const updated = service.getWorkOrders().find(o => o.docId === target.docId);
      expect(updated!.data.startDate).toBe('2026-01-01');
      expect(updated!.data.endDate).toBe('2026-02-01');
      expect(updated!.data.name).toBe(originalName);
    });
  });

  // ─── CRUD: Delete ───

  describe('deleteWorkOrder', () => {
    it('should remove a work order and emit updated list', (done) => {
      const orders = service.getWorkOrders();
      const initialCount = orders.length;
      const targetId = orders[0].docId;

      service.deleteWorkOrder(targetId);

      service.getWorkOrders$().subscribe(updated => {
        expect(updated.length).toBe(initialCount - 1);
        expect(updated.find(o => o.docId === targetId)).toBeUndefined();
        done();
      });
    });

    it('should not affect other orders when deleting one', () => {
      const orders = service.getWorkOrders();
      const targetId = orders[0].docId;
      const otherId = orders[1].docId;

      service.deleteWorkOrder(targetId);

      const updated = service.getWorkOrders();
      expect(updated.find(o => o.docId === otherId)).toBeTruthy();
    });
  });

  // ─── Overlap Detection ───

  describe('checkOverlap', () => {
    let centerId: string;

    beforeEach(() => {
      // Create a known order on a clean center for overlap tests
      centerId = 'test-overlap-center';

      // Create a work center entry if needed (service uses sample data)
      // We'll create a known order directly
      service.createWorkOrder({
        name: 'Existing Order',
        workCenterId: centerId,
        status: 'open',
        startDate: '2026-03-01',
        endDate: '2026-03-31'
      });
    });

    it('should detect overlap when new range fully contains existing range', () => {
      const result = service.checkOverlap(centerId, '2026-02-15', '2026-04-15');
      expect(result).toBe(true);
    });

    it('should detect overlap when new range is fully contained within existing range', () => {
      const result = service.checkOverlap(centerId, '2026-03-10', '2026-03-20');
      expect(result).toBe(true);
    });

    it('should detect overlap when new range overlaps start of existing range', () => {
      const result = service.checkOverlap(centerId, '2026-02-15', '2026-03-15');
      expect(result).toBe(true);
    });

    it('should detect overlap when new range overlaps end of existing range', () => {
      const result = service.checkOverlap(centerId, '2026-03-15', '2026-04-15');
      expect(result).toBe(true);
    });

    it('should NOT detect overlap when new range is entirely before existing', () => {
      const result = service.checkOverlap(centerId, '2026-01-01', '2026-02-28');
      expect(result).toBe(false);
    });

    it('should NOT detect overlap when new range is entirely after existing', () => {
      const result = service.checkOverlap(centerId, '2026-04-01', '2026-05-01');
      expect(result).toBe(false);
    });

    it('should NOT detect overlap when new range ends exactly when existing starts', () => {
      // endA <= startB means no overlap (strict < in the condition)
      const result = service.checkOverlap(centerId, '2026-02-01', '2026-03-01');
      expect(result).toBe(false);
    });

    it('should NOT detect overlap when new range starts exactly when existing ends', () => {
      const result = service.checkOverlap(centerId, '2026-03-31', '2026-04-15');
      expect(result).toBe(false);
    });

    it('should exclude a specific order by docId (edit mode)', () => {
      const orders = service.getWorkOrders().filter(o => o.data.workCenterId === centerId);
      const existingId = orders[0].docId;

      // This would overlap, but we exclude the existing order (simulating edit of itself)
      const result = service.checkOverlap(centerId, '2026-03-01', '2026-03-31', existingId);
      expect(result).toBe(false);
    });

    it('should return false when no orders exist on a work center', () => {
      const result = service.checkOverlap('empty-center', '2026-01-01', '2026-12-31');
      expect(result).toBe(false);
    });
  });

  // ─── getWorkOrdersByCenter ───

  describe('getWorkOrdersByCenter', () => {
    it('should return only orders for the specified center', () => {
      const centers = service.getWorkCenters();
      const centerId = centers[0].docId;
      const orders = service.getWorkOrdersByCenter(centerId);

      orders.forEach(o => {
        expect(o.data.workCenterId).toBe(centerId);
      });
    });

    it('should return empty array for nonexistent center', () => {
      const orders = service.getWorkOrdersByCenter('nonexistent');
      expect(orders).toEqual([]);
    });
  });

  // ─── localStorage Persistence ───

  describe('localStorage persistence', () => {
    it('should persist created orders to localStorage', () => {
      service.createWorkOrder({
        name: 'Persisted Order',
        workCenterId: 'wc-1',
        status: 'open',
        startDate: '2026-09-01',
        endDate: '2026-09-30'
      });

      const stored = localStorage.getItem('naologic-work-orders');
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      const found = parsed.find((o: WorkOrderDocument) => o.data.name === 'Persisted Order');
      expect(found).toBeTruthy();
    });

    it('should persist deletions to localStorage', () => {
      const orders = service.getWorkOrders();
      const targetId = orders[0].docId;

      service.deleteWorkOrder(targetId);

      const stored = localStorage.getItem('naologic-work-orders');
      const parsed = JSON.parse(stored!);
      expect(parsed.find((o: WorkOrderDocument) => o.docId === targetId)).toBeUndefined();
    });
  });
});
