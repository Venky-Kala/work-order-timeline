import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { WorkCenterDocument } from '../models/work-center.model';
import { WorkOrderDocument, WorkOrderStatus } from '../models/work-order.model';
import { WORK_CENTERS, WORK_ORDERS } from '../data/sample-data';

@Injectable({
  providedIn: 'root'
})
export class WorkOrderService {
  private workCenters: WorkCenterDocument[] = [...WORK_CENTERS];
  private workOrders: WorkOrderDocument[] = [...WORK_ORDERS];

  private workOrders$ = new BehaviorSubject<WorkOrderDocument[]>(this.workOrders);

  constructor() {
    this.loadFromLocalStorage();
  }

  getWorkCenters(): WorkCenterDocument[] {
    return this.workCenters;
  }

  getWorkOrders$() {
    return this.workOrders$.asObservable();
  }

  getWorkOrders(): WorkOrderDocument[] {
    return this.workOrders;
  }

  getWorkOrdersByCenter(centerId: string): WorkOrderDocument[] {
    return this.workOrders.filter(wo => wo.data.workCenterId === centerId);
  }

  /**
   * Check if a new/edited work order would overlap with existing orders
   * on the same work center.
   *
   * Two date ranges overlap if: startA < endB AND startB < endA
   *
   * @param centerId - The work center to check
   * @param startDate - Start date ISO string
   * @param endDate - End date ISO string
   * @param excludeId - Optional docId to exclude (for edit mode)
   * @returns true if there IS an overlap (i.e., invalid)
   */
  checkOverlap(centerId: string, startDate: string, endDate: string, excludeId?: string): boolean {
    const existingOrders = this.getWorkOrdersByCenter(centerId)
      .filter(wo => wo.docId !== excludeId);

    const newStart = new Date(startDate).getTime();
    const newEnd = new Date(endDate).getTime();

    return existingOrders.some(wo => {
      const existingStart = new Date(wo.data.startDate).getTime();
      const existingEnd = new Date(wo.data.endDate).getTime();
      // Overlap condition: startA < endB AND startB < endA
      return newStart < existingEnd && existingStart < newEnd;
    });
  }

  createWorkOrder(data: {
    name: string;
    workCenterId: string;
    status: WorkOrderStatus;
    startDate: string;
    endDate: string;
  }): WorkOrderDocument {
    const newOrder: WorkOrderDocument = {
      docId: `wo-${Date.now()}`,
      docType: 'workOrder',
      data: { ...data }
    };
    this.workOrders = [...this.workOrders, newOrder];
    this.emit();
    return newOrder;
  }

  updateWorkOrder(docId: string, data: Partial<{
    name: string;
    workCenterId: string;
    status: WorkOrderStatus;
    startDate: string;
    endDate: string;
  }>): void {
    this.workOrders = this.workOrders.map(wo => {
      if (wo.docId === docId) {
        return {
          ...wo,
          data: { ...wo.data, ...data }
        };
      }
      return wo;
    });
    this.emit();
  }

  deleteWorkOrder(docId: string): void {
    this.workOrders = this.workOrders.filter(wo => wo.docId !== docId);
    this.emit();
  }

  // Bonus: localStorage persistence
  private emit(): void {
    this.workOrders$.next(this.workOrders);
    this.saveToLocalStorage();
  }

  private saveToLocalStorage(): void {
    try {
      localStorage.setItem('naologic-work-orders', JSON.stringify(this.workOrders));
    } catch (e) {
      // Silent fail - localStorage may not be available
    }
  }

  /**
   * Load from localStorage with version check.
   * If the data version doesn't match, clear old data and use sample data.
   */
  private loadFromLocalStorage(): void {
    try {
      const DATA_VERSION = 'v3'; // Bump when sample data changes
      const storedVersion = localStorage.getItem('naologic-data-version');

      if (storedVersion !== DATA_VERSION) {
        // Data structure changed — clear old data
        localStorage.removeItem('naologic-work-orders');
        localStorage.setItem('naologic-data-version', DATA_VERSION);
        return;
      }

      const stored = localStorage.getItem('naologic-work-orders');
      if (stored) {
        this.workOrders = JSON.parse(stored);
        this.workOrders$.next(this.workOrders);
      }
    } catch (e) {
      // Silent fail - use default data
    }
  }

  /** Reset to sample data (useful for development) */
  resetToSampleData(): void {
    localStorage.removeItem('naologic-work-orders');
    this.workOrders = [...WORK_ORDERS];
    this.emit();
  }
}
