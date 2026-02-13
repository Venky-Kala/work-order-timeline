import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { TimelineComponent } from './timeline.component';
import { WorkOrderService } from '../../services/work-order.service';
import { TimelineService } from '../../services/timeline.service';

describe('TimelineComponent', () => {
  let component: TimelineComponent;
  let fixture: ComponentFixture<TimelineComponent>;
  let workOrderService: WorkOrderService;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      imports: [TimelineComponent, FormsModule, NgSelectModule],
      providers: [WorkOrderService, TimelineService]
    });

    fixture = TestBed.createComponent(TimelineComponent);
    component = fixture.componentInstance;
    workOrderService = TestBed.inject(WorkOrderService);
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ─── Component creation ───

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load work centers on init', () => {
    expect(component.workCenters.length).toBeGreaterThan(0);
  });

  it('should load work orders on init', () => {
    expect(component.workOrders.length).toBeGreaterThan(0);
  });

  it('should default to month zoom', () => {
    expect(component.zoomLevel).toBe('month');
  });

  it('should calculate timeline dimensions on init', () => {
    expect(component.totalWidth).toBeGreaterThan(0);
    expect(component.columnWidth).toBe(130); // month = 130px
    expect(component.columns.length).toBeGreaterThan(0);
  });

  // ─── Zoom control ───

  describe('zoom level changes', () => {
    it('should update column width when changing to day zoom', () => {
      component.onZoomChange('day');
      expect(component.columnWidth).toBe(44);
      expect(component.zoomLevel).toBe('day');
    });

    it('should update column width when changing to week zoom', () => {
      component.onZoomChange('week');
      expect(component.columnWidth).toBe(100);
    });

    it('should recalculate columns when zoom changes', () => {
      const monthColumns = component.columns.length;
      component.onZoomChange('day');
      expect(component.columns.length).not.toBe(monthColumns);
    });

    it('should provide all four zoom options', () => {
      expect(component.zoomOptions.length).toBe(4);
      const values = component.zoomOptions.map(o => o.value);
      expect(values).toEqual(['hour', 'day', 'week', 'month']);
    });
  });

  // ─── Panel state management ───

  describe('panel open/close', () => {
    it('should start with panel closed', () => {
      expect(component.panelOpen).toBe(false);
      expect(component.panelConfig).toBeNull();
    });

    it('should close panel and clear config on onPanelClose', () => {
      component.panelOpen = true;
      component.panelConfig = {
        mode: 'create',
        workCenterId: 'wc-1',
        workCenterName: 'Test',
        startDate: '2026-01-01'
      };

      component.onPanelClose();

      expect(component.panelOpen).toBe(false);
      expect(component.panelConfig).toBeNull();
    });

    it('should close panel on save and create the order', () => {
      component.panelOpen = true;
      component.panelConfig = {
        mode: 'create',
        workCenterId: 'wc-1',
        workCenterName: 'Test',
        startDate: '2026-01-01'
      };

      const initialCount = workOrderService.getWorkOrders().length;

      component.onPanelSave({
        name: 'New Order',
        status: 'open',
        startDate: '2026-06-01',
        endDate: '2026-06-30'
      });

      expect(component.panelOpen).toBe(false);
      expect(component.panelConfig).toBeNull();
      expect(workOrderService.getWorkOrders().length).toBe(initialCount + 1);
    });

    it('should update work order on save in edit mode', () => {
      const orders = workOrderService.getWorkOrders();
      const target = orders[0];

      component.panelOpen = true;
      component.panelConfig = {
        mode: 'edit',
        workCenterId: target.data.workCenterId,
        workCenterName: 'Test',
        workOrder: target
      };

      component.onPanelSave({
        name: 'Updated Name',
        status: 'complete',
        startDate: target.data.startDate,
        endDate: target.data.endDate
      });

      const updated = workOrderService.getWorkOrders().find(o => o.docId === target.docId);
      expect(updated!.data.name).toBe('Updated Name');
      expect(updated!.data.status).toBe('complete');
    });

    it('should do nothing on save when panelConfig is null', () => {
      component.panelConfig = null;
      const countBefore = workOrderService.getWorkOrders().length;

      component.onPanelSave({
        name: 'Test',
        status: 'open',
        startDate: '2026-01-01',
        endDate: '2026-01-31'
      });

      expect(workOrderService.getWorkOrders().length).toBe(countBefore);
    });
  });

  // ─── Actions menu toggle ───

  describe('actions menu', () => {
    it('should start with no active menu', () => {
      expect(component.activeMenuOrderId).toBeNull();
    });

    it('should toggle menu open', () => {
      const event = new MouseEvent('click');
      Object.defineProperty(event, 'stopPropagation', { value: jest.fn() });
      component.toggleActionsMenu(event, 'wo-1');
      expect(component.activeMenuOrderId).toBe('wo-1');
    });

    it('should toggle menu closed when same order clicked', () => {
      component.activeMenuOrderId = 'wo-1';
      const event = new MouseEvent('click');
      Object.defineProperty(event, 'stopPropagation', { value: jest.fn() });
      component.toggleActionsMenu(event, 'wo-1');
      expect(component.activeMenuOrderId).toBeNull();
    });

    it('should switch to a different order menu', () => {
      component.activeMenuOrderId = 'wo-1';
      const event = new MouseEvent('click');
      Object.defineProperty(event, 'stopPropagation', { value: jest.fn() });
      component.toggleActionsMenu(event, 'wo-2');
      expect(component.activeMenuOrderId).toBe('wo-2');
    });

    it('should close menu on document click outside', () => {
      component.activeMenuOrderId = 'wo-1';

      // Simulate clicking outside the menu
      const div = document.createElement('div');
      const event = new MouseEvent('click');
      Object.defineProperty(event, 'target', { value: div });

      component.onDocumentClick(event);
      expect(component.activeMenuOrderId).toBeNull();
    });

    it('should close menu on Escape key via container keydown', () => {
      component.activeMenuOrderId = 'wo-1';
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      component.onContainerKeydown(event);
      expect(component.activeMenuOrderId).toBeNull();
    });

    it('should not close menu on non-Escape key', () => {
      component.activeMenuOrderId = 'wo-1';
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      component.onContainerKeydown(event);
      expect(component.activeMenuOrderId).toBe('wo-1');
    });
  });

  // ─── Delete ───

  describe('onDeleteOrder', () => {
    it('should delete the work order and close the menu', () => {
      const orders = workOrderService.getWorkOrders();
      const targetId = orders[0].docId;
      const initialCount = orders.length;

      component.activeMenuOrderId = targetId;
      const event = new MouseEvent('click');
      Object.defineProperty(event, 'stopPropagation', { value: jest.fn() });

      component.onDeleteOrder(event, targetId);

      expect(component.activeMenuOrderId).toBeNull();
      expect(workOrderService.getWorkOrders().length).toBe(initialCount - 1);
    });
  });

  // ─── Row hover ───

  describe('row hover', () => {
    it('should set hovered row id', () => {
      component.onRowHover('wc-1');
      expect(component.hoveredRowId).toBe('wc-1');
    });

    it('should clear hovered row id on null', () => {
      component.hoveredRowId = 'wc-1';
      component.onRowHover(null);
      expect(component.hoveredRowId).toBeNull();
    });
  });

  // ─── Mouse leave ───

  describe('onGridMouseLeave', () => {
    it('should hide tooltip and placeholder', () => {
      component.hoverTooltip.visible = true;
      component.hoverPlaceholder.visible = true;

      component.onGridMouseLeave();

      expect(component.hoverTooltip.visible).toBe(false);
      expect(component.hoverPlaceholder.visible).toBe(false);
    });
  });

  // ─── Helper methods ───

  describe('helper methods', () => {
    it('getStatusClass should return correct class string', () => {
      expect(component.getStatusClass('open')).toBe('status-open');
      expect(component.getStatusClass('in-progress')).toBe('status-in-progress');
      expect(component.getStatusClass('complete')).toBe('status-complete');
      expect(component.getStatusClass('blocked')).toBe('status-blocked');
    });

    it('getStatusLabel should return human-readable labels', () => {
      expect(component.getStatusLabel('open')).toBe('Open');
      expect(component.getStatusLabel('in-progress')).toBe('In progress');
      expect(component.getStatusLabel('complete')).toBe('Complete');
      expect(component.getStatusLabel('blocked')).toBe('Blocked');
    });

    it('getOrdersForCenter should filter by center id', () => {
      const centerId = component.workCenters[0].docId;
      const orders = component.getOrdersForCenter(centerId);
      orders.forEach(o => expect(o.data.workCenterId).toBe(centerId));
    });

    it('getOrdersForCenter should return empty for nonexistent center', () => {
      expect(component.getOrdersForCenter('nonexistent')).toEqual([]);
    });
  });

  // ─── Track-by functions ───

  describe('trackBy functions', () => {
    it('trackByCenter should return docId', () => {
      const center = { docId: 'c1', docType: 'workCenter' as const, data: { name: 'Test' } };
      expect(component.trackByCenter(0, center)).toBe('c1');
    });

    it('trackByOrder should return docId', () => {
      const order = {
        docId: 'o1', docType: 'workOrder' as const,
        data: { name: 'Test', workCenterId: 'c1', status: 'open' as const, startDate: '2026-01-01', endDate: '2026-01-31' }
      };
      expect(component.trackByOrder(0, order)).toBe('o1');
    });

    it('trackByColumn should return label', () => {
      const col = { label: 'Jan 2026', date: new Date(), isToday: false, isCurrentMonth: false };
      expect(component.trackByColumn(0, col)).toBe('Jan 2026');
    });
  });

  // ─── currentMonthBadgeLeft ───

  describe('currentMonthBadgeLeft', () => {
    it('should return valid pixel offset for current month', () => {
      // In month zoom, there should be a current month column
      const badgeLeft = component.currentMonthBadgeLeft;
      expect(badgeLeft).toBeGreaterThanOrEqual(0);
    });

    it('should return -1 when no current month column exists', () => {
      // Override columns to have no current month
      component.columns = component.columns.map(c => ({ ...c, isCurrentMonth: false }));
      expect(component.currentMonthBadgeLeft).toBe(-1);
    });
  });

  // ─── Keyboard navigation: grid row ───

  describe('onGridRowKeydown', () => {
    it('should open create panel for the work center', () => {
      const center = component.workCenters[0];
      const event = new Event('keydown');
      Object.defineProperty(event, 'preventDefault', { value: jest.fn() });
      Object.defineProperty(event, 'target', { value: document.createElement('div') });

      component.onGridRowKeydown(event, center);

      expect(component.panelOpen).toBe(true);
      expect(component.panelConfig?.mode).toBe('create');
      expect(component.panelConfig?.workCenterId).toBe(center.docId);
    });
  });

  // ─── Keyboard navigation: bar ───

  describe('onBarKeydown', () => {
    it('should open edit panel on Enter', () => {
      const order = component.workOrders[0];
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      Object.defineProperty(event, 'stopPropagation', { value: jest.fn() });
      Object.defineProperty(event, 'target', { value: document.createElement('div') });

      component.onBarKeydown(event, order);

      expect(component.panelOpen).toBe(true);
      expect(component.panelConfig?.mode).toBe('edit');
      expect(component.panelConfig?.workOrder?.docId).toBe(order.docId);
    });

    it('should open edit panel on Space', () => {
      const order = component.workOrders[0];
      const event = new KeyboardEvent('keydown', { key: ' ' });
      Object.defineProperty(event, 'stopPropagation', { value: jest.fn() });
      Object.defineProperty(event, 'target', { value: document.createElement('div') });

      component.onBarKeydown(event, order);

      expect(component.panelOpen).toBe(true);
    });

    it('should not open panel on Escape', () => {
      const order = component.workOrders[0];
      const event = new KeyboardEvent('keydown', { key: 'Escape' });

      component.onBarKeydown(event, order);

      expect(component.panelOpen).toBe(false);
    });
  });

  // ─── Keyboard: menu trigger ───

  describe('onMenuTriggerKeydown', () => {
    it('should toggle menu on Enter', () => {
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      Object.defineProperty(event, 'stopPropagation', { value: jest.fn() });
      Object.defineProperty(event, 'preventDefault', { value: jest.fn() });

      // Create a minimal DOM structure for .closest() to work
      const menuDiv = document.createElement('div');
      menuDiv.classList.add('actions-menu');
      const triggerBtn = document.createElement('button');
      menuDiv.appendChild(triggerBtn);
      Object.defineProperty(event, 'target', { value: triggerBtn });

      component.onMenuTriggerKeydown(event, 'wo-1');
      expect(component.activeMenuOrderId).toBe('wo-1');
    });

    it('should close menu on Escape', () => {
      component.activeMenuOrderId = 'wo-1';
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      Object.defineProperty(event, 'stopPropagation', { value: jest.fn() });

      component.onMenuTriggerKeydown(event, 'wo-1');
      expect(component.activeMenuOrderId).toBeNull();
    });
  });

  // ─── Rendered accessibility attributes ───

  describe('rendered accessibility', () => {
    it('should have role="grid" on the timeline table', () => {
      const table = fixture.nativeElement.querySelector('.timeline-table');
      expect(table?.getAttribute('role')).toBe('grid');
    });

    it('should have aria-label on the timeline table', () => {
      const table = fixture.nativeElement.querySelector('.timeline-table');
      expect(table?.getAttribute('aria-label')).toBeTruthy();
    });

    it('should have role="row" on grid rows', () => {
      const rows = fixture.nativeElement.querySelectorAll('.grid-row');
      rows.forEach((row: Element) => {
        expect(row.getAttribute('role')).toBe('row');
      });
    });

    it('should have tabindex on grid rows', () => {
      const rows = fixture.nativeElement.querySelectorAll('.grid-row');
      rows.forEach((row: Element) => {
        expect(row.getAttribute('tabindex')).toBe('0');
      });
    });

    it('should have role="button" on work order bars', () => {
      const bars = fixture.nativeElement.querySelectorAll('.work-order-bar');
      bars.forEach((bar: Element) => {
        expect(bar.getAttribute('role')).toBe('button');
      });
    });

    it('should have aria-label on work order bars', () => {
      const bars = fixture.nativeElement.querySelectorAll('.work-order-bar');
      bars.forEach((bar: Element) => {
        expect(bar.getAttribute('aria-label')).toBeTruthy();
      });
    });
  });
});
