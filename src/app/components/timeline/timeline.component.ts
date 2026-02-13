import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { Subject, takeUntil } from 'rxjs';
import { format } from 'date-fns';

import { WorkOrderService } from '../../services/work-order.service';
import { TimelineService, ZoomLevel, TimelineColumn, TimelineRange } from '../../services/timeline.service';
import { WorkCenterDocument } from '../../models/work-center.model';
import { WorkOrderDocument, WorkOrderStatus } from '../../models/work-order.model';
import { SlidePanelComponent } from '../slide-panel/slide-panel.component';

export interface PanelConfig {
  mode: 'create' | 'edit';
  workCenterId: string;
  workCenterName: string;
  startDate?: string;
  workOrder?: WorkOrderDocument;
}

@Component({
  selector: 'app-timeline',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule, SlidePanelComponent],
  templateUrl: './timeline.component.html',
  styleUrls: ['./timeline.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default
})
export class TimelineComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('gridScrollContainer') gridScrollContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('headerScrollContainer') headerScrollContainer!: ElementRef<HTMLDivElement>;

  workCenters: WorkCenterDocument[] = [];
  workOrders: WorkOrderDocument[] = [];

  zoomLevel: ZoomLevel = 'month';
  zoomOptions = [
    { value: 'hour' as ZoomLevel, label: 'Hour' },
    { value: 'day' as ZoomLevel, label: 'Day' },
    { value: 'week' as ZoomLevel, label: 'Week' },
    { value: 'month' as ZoomLevel, label: 'Month' }
  ];

  columns: TimelineColumn[] = [];
  range!: TimelineRange;
  totalWidth = 0;
  todayOffset = 0;
  columnWidth = 0;

  // Panel state
  panelOpen = false;
  panelConfig: PanelConfig | null = null;

  // Accessibility: element that triggered the panel (for focus restoration)
  private panelTriggerEl: HTMLElement | null = null;

  // Hover state for rows
  hoveredRowId: string | null = null;

  // Actions menu state
  activeMenuOrderId: string | null = null;

  // Hover tooltip for empty area
  hoverTooltip: { visible: boolean; x: number; y: number; text: string } = {
    visible: false, x: 0, y: 0, text: ''
  };

  // Hover placeholder box (Sketch: 113×38px, shown on empty grid space)
  hoverPlaceholder: { visible: boolean; x: number; y: number } = {
    visible: false, x: 0, y: 0
  };

  /** Whether the view has been initialised (ViewChild refs available) */
  private viewReady = false;

  private destroy$ = new Subject<void>();

  constructor(
    private workOrderService: WorkOrderService,
    private timelineService: TimelineService
  ) {}

  ngOnInit(): void {
    this.workCenters = this.workOrderService.getWorkCenters();

    this.workOrderService.getWorkOrders$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(orders => {
        this.workOrders = orders;
      });

    // Calculate timeline data (columns, widths, offsets) — no scrolling yet
    this.recalculateTimeline();
  }

  ngAfterViewInit(): void {
    this.viewReady = true;

    // Wait one animation frame so Angular finishes rendering *ngFor columns
    // and the container has its final layout dimensions (clientWidth > 0).
    requestAnimationFrame(() => {
      this.scrollToToday(false); // instant on initial load — no visible jump
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Recalculate timeline columns and dimensions (data only, no scrolling). */
  private recalculateTimeline(): void {
    this.range = this.timelineService.getDefaultRange(this.zoomLevel);
    this.columns = this.timelineService.getColumns(this.zoomLevel, this.range);
    this.columnWidth = this.timelineService.COLUMN_WIDTHS[this.zoomLevel];
    this.totalWidth = this.timelineService.getTotalWidth(this.zoomLevel, this.range);
    this.todayOffset = this.timelineService.getTodayOffset(this.zoomLevel, this.range);
  }

  /** Update timeline columns and dimensions when zoom level changes */
  updateTimeline(): void {
    this.recalculateTimeline();

    // Only scroll if the view is ready (zoom change after initial load)
    if (this.viewReady) {
      // Allow Angular to re-render the new columns, then scroll
      setTimeout(() => this.scrollToToday(), 0);
    }
  }

  onZoomChange(zoom: ZoomLevel): void {
    this.zoomLevel = zoom;
    this.updateTimeline();
  }

  /** Pixel threshold from either edge to trigger range extension */
  private readonly SCROLL_EDGE_THRESHOLD = 300;
  private extending = false;

  /** Synchronize horizontal scroll between header and grid, and extend range at edges */
  onGridScroll(): void {
    if (this.headerScrollContainer && this.gridScrollContainer) {
      const el = this.gridScrollContainer.nativeElement;
      this.headerScrollContainer.nativeElement.scrollLeft = el.scrollLeft;

      // Extend range when scrolling near edges
      if (!this.extending) {
        const scrollRight = el.scrollWidth - el.scrollLeft - el.clientWidth;

        if (el.scrollLeft < this.SCROLL_EDGE_THRESHOLD) {
          this.extendTimeline('left');
        } else if (scrollRight < this.SCROLL_EDGE_THRESHOLD) {
          this.extendTimeline('right');
        }
      }
    }
  }

  /** Dynamically extend the timeline range and preserve scroll position */
  private extendTimeline(direction: 'left' | 'right'): void {
    this.extending = true;
    const el = this.gridScrollContainer.nativeElement;
    const previousWidth = this.totalWidth;
    const previousScrollLeft = el.scrollLeft;

    this.range = this.timelineService.extendRange(this.zoomLevel, this.range, direction);
    this.columns = this.timelineService.getColumns(this.zoomLevel, this.range);
    this.totalWidth = this.timelineService.getTotalWidth(this.zoomLevel, this.range);
    this.todayOffset = this.timelineService.getTodayOffset(this.zoomLevel, this.range);

    if (direction === 'left') {
      // Preserve visual scroll position after prepending columns
      const addedWidth = this.totalWidth - previousWidth;
      setTimeout(() => {
        el.scrollLeft = previousScrollLeft + addedWidth;
        this.headerScrollContainer.nativeElement.scrollLeft = el.scrollLeft;
        this.extending = false;
      }, 0);
    } else {
      setTimeout(() => { this.extending = false; }, 0);
    }
  }

  /** Scroll timeline to center on today.
   *  @param smooth  true → animated (zoom changes), false → instant (initial load)
   */
  scrollToToday(smooth: boolean = true): void {
    if (this.gridScrollContainer) {
      const container = this.gridScrollContainer.nativeElement;
      const scrollTarget = Math.max(0, this.todayOffset - container.clientWidth / 2);

      // scrollTo with options may not be available in all environments (e.g. jsdom)
      if (typeof container.scrollTo === 'function') {
        container.scrollTo({ left: scrollTarget, behavior: smooth ? 'smooth' : 'instant' });
      } else {
        container.scrollLeft = scrollTarget;
      }

      // Sync header scroll — immediately for instant, after animation settles for smooth
      if (smooth) {
        setTimeout(() => this.onGridScroll(), 350);
      } else {
        this.onGridScroll();
      }
    }
  }

  // ───── Work Order Bar Positioning ─────

  getBarLeft(order: WorkOrderDocument): number {
    return this.timelineService.dateToPixelOffset(order.data.startDate, this.zoomLevel, this.range);
  }

  getBarWidth(order: WorkOrderDocument): number {
    return this.timelineService.getBarWidth(order.data.startDate, order.data.endDate, this.zoomLevel, this.range);
  }

  getOrdersForCenter(centerId: string): WorkOrderDocument[] {
    return this.workOrders.filter(wo => wo.data.workCenterId === centerId);
  }

  getStatusClass(status: WorkOrderStatus): string {
    return `status-${status}`;
  }

  getStatusLabel(status: WorkOrderStatus): string {
    switch (status) {
      case 'open': return 'Open';
      case 'in-progress': return 'In progress';
      case 'complete': return 'Complete';
      case 'blocked': return 'Blocked';
    }
  }

  // ───── Interactions ─────

  /** Click on empty timeline area → open create panel */
  onGridClick(event: MouseEvent, workCenter: WorkCenterDocument): void {
    // Don't open panel if clicking on an existing work order bar or menu
    const target = event.target as HTMLElement;
    if (target.closest('.work-order-bar') || target.closest('.actions-menu')) {
      return;
    }

    const gridEl = this.gridScrollContainer.nativeElement;
    const rect = gridEl.getBoundingClientRect();
    const scrollLeft = gridEl.scrollLeft;

    // Calculate x offset relative to the full timeline, accounting for scroll
    const clickX = event.clientX - rect.left + scrollLeft;

    // Convert pixel position to date
    const clickDate = this.timelineService.pixelOffsetToDate(clickX, this.zoomLevel, this.range);
    const startDateStr = format(clickDate, 'yyyy-MM-dd');

    this.panelTriggerEl = event.target as HTMLElement;
    this.panelConfig = {
      mode: 'create',
      workCenterId: workCenter.docId,
      workCenterName: workCenter.data.name,
      startDate: startDateStr
    };
    this.panelOpen = true;
    this.activeMenuOrderId = null;
  }

  /** Row hover */
  onRowHover(centerId: string | null): void {
    this.hoveredRowId = centerId;
  }

  /** Show "Click to add dates" tooltip and placeholder box on empty area hover */
  onGridMouseMove(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest('.work-order-bar')) {
      this.hoverTooltip.visible = false;
      this.hoverPlaceholder.visible = false;
      return;
    }

    const gridEl = this.gridScrollContainer.nativeElement;
    const rect = gridEl.getBoundingClientRect();
    const scrollLeft = gridEl.scrollLeft;

    // Viewport-relative cursor position
    const viewportX = event.clientX - rect.left;
    const viewportY = event.clientY - rect.top;

    // Scroll-adjusted X for positioning inside grid-track
    const trackX = viewportX + scrollLeft;

    // Placeholder box: 113×38px, centered horizontally on cursor
    const placeholderWidth = 113;
    const placeholderHeight = 38;
    const firstRowHeight = 60;
    const rowHeight = 48;

    const rowIndex = this.workCenters.findIndex(c => c.docId === this.hoveredRowId);

    if (rowIndex >= 0) {
      const rowTop = rowIndex === 0 ? 0 : firstRowHeight + (rowIndex - 1) * rowHeight;
      const currentRowHeight = rowIndex === 0 ? firstRowHeight : rowHeight;
      const placeholderY = rowTop + (currentRowHeight - placeholderHeight) / 2;
      const placeholderX = trackX - placeholderWidth / 2;

      this.hoverPlaceholder = {
        visible: true,
        x: Math.max(0, placeholderX),
        y: placeholderY
      };
    } else {
      this.hoverPlaceholder.visible = false;
    }

    // Tooltip: fixed viewport coordinates, centered above the placeholder box
    // Convert placeholder's grid-track position to viewport position
    if (this.hoverPlaceholder.visible) {
      const placeholderCenterX = this.hoverPlaceholder.x + placeholderWidth / 2 - scrollLeft;
      const placeholderTopY = this.hoverPlaceholder.y;

      this.hoverTooltip = {
        visible: true,
        x: rect.left + placeholderCenterX,          // viewport X
        y: rect.top + placeholderTopY - 6,           // viewport Y, 6px gap above placeholder
        text: 'Click to add dates'
      };
    } else {
      this.hoverTooltip.visible = false;
    }
  }

  onGridMouseLeave(): void {
    this.hoverTooltip.visible = false;
    this.hoverPlaceholder.visible = false;
  }

  // ───── Keyboard Navigation ─────

  /** Enter/Space on a grid row → open create panel (centered on today) */
  onGridRowKeydown(event: Event, workCenter: WorkCenterDocument): void {
    event.preventDefault();
    this.panelTriggerEl = event.target as HTMLElement;
    const startDateStr = format(new Date(), 'yyyy-MM-dd');
    this.panelConfig = {
      mode: 'create',
      workCenterId: workCenter.docId,
      workCenterName: workCenter.data.name,
      startDate: startDateStr
    };
    this.panelOpen = true;
    this.activeMenuOrderId = null;
  }

  /** Keydown on a work order bar: Enter opens edit, Escape closes menu */
  onBarKeydown(event: KeyboardEvent, order: WorkOrderDocument): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      this.panelTriggerEl = event.target as HTMLElement;
      const center = this.workCenters.find(wc => wc.docId === order.data.workCenterId);
      this.panelConfig = {
        mode: 'edit',
        workCenterId: order.data.workCenterId,
        workCenterName: center?.data.name || '',
        workOrder: order
      };
      this.panelOpen = true;
      this.activeMenuOrderId = null;
    }
  }

  /** Keydown on the three-dot trigger button: Enter/Space toggle, Escape close */
  onMenuTriggerKeydown(event: KeyboardEvent, orderId: string): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      this.activeMenuOrderId = this.activeMenuOrderId === orderId ? null : orderId;

      // Auto-focus first menu item when opening
      if (this.activeMenuOrderId) {
        setTimeout(() => {
          const dropdown = (event.target as HTMLElement)
            .closest('.actions-menu')
            ?.querySelector<HTMLElement>('.actions-dropdown .action-item');
          dropdown?.focus();
        });
      }
    } else if (event.key === 'Escape') {
      event.stopPropagation();
      this.activeMenuOrderId = null;
    }
  }

  /** Keydown inside the actions dropdown: arrow keys, Escape, Enter */
  onMenuKeydown(event: KeyboardEvent, order: WorkOrderDocument): void {
    const items = Array.from(
      (event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('.action-item')
    );
    const currentIdx = items.indexOf(document.activeElement as HTMLElement);

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (currentIdx < items.length - 1) items[currentIdx + 1].focus();
        break;

      case 'ArrowUp':
        event.preventDefault();
        if (currentIdx > 0) items[currentIdx - 1].focus();
        break;

      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        this.activeMenuOrderId = null;
        // Return focus to the trigger button
        const trigger = (event.currentTarget as HTMLElement)
          .closest('.actions-menu')
          ?.querySelector<HTMLElement>('.actions-trigger');
        trigger?.focus();
        break;

      case 'Tab':
        // Close menu on Tab out to prevent focus leaving into void
        this.activeMenuOrderId = null;
        break;
    }
  }

  /** Global Escape handler: close actions menu from anywhere */
  onContainerKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.activeMenuOrderId) {
      this.activeMenuOrderId = null;
    }
  }

  // ───── Actions Menu (three-dot) ─────

  toggleActionsMenu(event: MouseEvent, orderId: string): void {
    event.stopPropagation();
    this.activeMenuOrderId = this.activeMenuOrderId === orderId ? null : orderId;

    // Auto-focus first menu item when opening via click
    if (this.activeMenuOrderId) {
      setTimeout(() => {
        const trigger = event.target as HTMLElement;
        const dropdown = trigger
          .closest('.actions-menu')
          ?.querySelector<HTMLElement>('.actions-dropdown .action-item');
        dropdown?.focus();
      });
    }
  }

  onEditOrder(event: MouseEvent, order: WorkOrderDocument): void {
    event.stopPropagation();
    this.panelTriggerEl = event.target as HTMLElement;
    const center = this.workCenters.find(wc => wc.docId === order.data.workCenterId);
    this.panelConfig = {
      mode: 'edit',
      workCenterId: order.data.workCenterId,
      workCenterName: center?.data.name || '',
      workOrder: order
    };
    this.panelOpen = true;
    this.activeMenuOrderId = null;
  }

  onDeleteOrder(event: MouseEvent, orderId: string): void {
    event.stopPropagation();
    this.workOrderService.deleteWorkOrder(orderId);
    this.activeMenuOrderId = null;
  }

  // ───── Panel Events ─────

  onPanelClose(): void {
    this.panelOpen = false;
    this.panelConfig = null;
    this.restoreFocus();
  }

  onPanelSave(data: { name: string; status: WorkOrderStatus; startDate: string; endDate: string }): void {
    if (!this.panelConfig) return;

    if (this.panelConfig.mode === 'create') {
      this.workOrderService.createWorkOrder({
        ...data,
        workCenterId: this.panelConfig.workCenterId
      });
    } else if (this.panelConfig.mode === 'edit' && this.panelConfig.workOrder) {
      this.workOrderService.updateWorkOrder(this.panelConfig.workOrder.docId, data);
    }

    this.panelOpen = false;
    this.panelConfig = null;
    this.restoreFocus();
  }

  /** Restore keyboard focus to the element that triggered the panel */
  private restoreFocus(): void {
    if (this.panelTriggerEl) {
      setTimeout(() => {
        this.panelTriggerEl?.focus();
        this.panelTriggerEl = null;
      });
    }
  }

  /** Close menus when clicking outside */
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.actions-menu')) {
      this.activeMenuOrderId = null;
    }
  }

  trackByCenter(index: number, item: WorkCenterDocument): string {
    return item.docId;
  }

  trackByOrder(index: number, item: WorkOrderDocument): string {
    return item.docId;
  }

  trackByColumn(index: number, item: TimelineColumn): string {
    return item.label;
  }

  /** Pixel offset for the "Current month" badge in the body area */
  get currentMonthBadgeLeft(): number {
    const idx = this.columns.findIndex(c => c.isCurrentMonth);
    return idx >= 0 ? idx * this.columnWidth : -1;
  }
}
