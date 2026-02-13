import { Component, Input, Output, EventEmitter, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgbDatepickerModule, NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { addDays, format, parseISO } from 'date-fns';

import { PanelConfig } from '../timeline/timeline.component';
import { WorkCenterDocument } from '../../models/work-center.model';
import { WorkOrderStatus } from '../../models/work-order.model';
import { WorkOrderService } from '../../services/work-order.service';

@Component({
  selector: 'app-slide-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgSelectModule, NgbDatepickerModule],
  templateUrl: './slide-panel.component.html',
  styleUrls: ['./slide-panel.component.scss']
})
export class SlidePanelComponent implements OnInit, AfterViewInit {
  @Input() config!: PanelConfig;
  @Input() workCenters: WorkCenterDocument[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<{
    name: string;
    status: WorkOrderStatus;
    startDate: string;
    endDate: string;
  }>();

  /** Reference to the panel container for focus trapping */
  @ViewChild('panelEl') panelEl!: ElementRef<HTMLDivElement>;

  /** Reference to the first input for auto-focus */
  @ViewChild('nameInput') nameInput!: ElementRef<HTMLInputElement>;

  form!: FormGroup;
  overlapError = false;

  statusOptions = [
    { value: 'open' as WorkOrderStatus, label: 'Open' },
    { value: 'in-progress' as WorkOrderStatus, label: 'In progress' },
    { value: 'complete' as WorkOrderStatus, label: 'Complete' },
    { value: 'blocked' as WorkOrderStatus, label: 'Blocked' }
  ];

  constructor(private workOrderService: WorkOrderService) {}

  ngOnInit(): void {
    this.initForm();
  }

  ngAfterViewInit(): void {
    // Auto-focus the first input field when panel opens
    setTimeout(() => {
      this.nameInput?.nativeElement?.focus();
    });
  }

  private initForm(): void {
    if (this.config.mode === 'edit' && this.config.workOrder) {
      const wo = this.config.workOrder;
      this.form = new FormGroup({
        name: new FormControl(wo.data.name, [Validators.required]),
        status: new FormControl(wo.data.status, [Validators.required]),
        startDate: new FormControl(this.isoToNgbDate(wo.data.startDate), [Validators.required]),
        endDate: new FormControl(this.isoToNgbDate(wo.data.endDate), [Validators.required])
      });
    } else {
      // Create mode
      const startDate = this.config.startDate || format(new Date(), 'yyyy-MM-dd');
      const endDate = format(addDays(parseISO(startDate), 7), 'yyyy-MM-dd');

      this.form = new FormGroup({
        name: new FormControl('', [Validators.required]),
        status: new FormControl('open', [Validators.required]),
        startDate: new FormControl(this.isoToNgbDate(startDate), [Validators.required]),
        endDate: new FormControl(this.isoToNgbDate(endDate), [Validators.required])
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const startDate = this.ngbDateToIso(this.form.value.startDate);
    const endDate = this.ngbDateToIso(this.form.value.endDate);

    // Validate end > start
    if (new Date(endDate) <= new Date(startDate)) {
      this.overlapError = false;
      // Show inline error — mark endDate as invalid
      this.form.get('endDate')?.setErrors({ endBeforeStart: true });
      return;
    }

    // Validate no overlap
    const excludeId = this.config.mode === 'edit' ? this.config.workOrder?.docId : undefined;
    const hasOverlap = this.workOrderService.checkOverlap(
      this.config.workCenterId,
      startDate,
      endDate,
      excludeId
    );

    if (hasOverlap) {
      this.overlapError = true;
      return;
    }

    this.overlapError = false;
    this.save.emit({
      name: this.form.value.name,
      status: this.form.value.status,
      startDate,
      endDate
    });
  }

  onCancel(): void {
    this.close.emit();
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.close.emit();
      return;
    }

    // Focus trap: keep Tab / Shift+Tab cycling within the panel
    if (event.key === 'Tab') {
      this.trapFocus(event);
    }
  }

  /**
   * Trap keyboard focus inside the panel.
   * When the user tabs past the last focusable element, loop back to the first (and vice-versa).
   */
  private trapFocus(event: KeyboardEvent): void {
    const panel = this.panelEl?.nativeElement;
    if (!panel) return;

    const focusable = panel.querySelectorAll<HTMLElement>(
      'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), ' +
      'button:not([disabled]), [tabindex]:not([tabindex="-1"]), a[href]'
    );

    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey) {
      // Shift+Tab on first element → wrap to last
      if (document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    } else {
      // Tab on last element → wrap to first
      if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  /** Convert ISO date string "YYYY-MM-DD" to NgbDateStruct */
  private isoToNgbDate(dateStr: string): NgbDateStruct {
    const date = parseISO(dateStr);
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate()
    };
  }

  /** Convert NgbDateStruct to ISO date string "YYYY-MM-DD" */
  private ngbDateToIso(ngbDate: NgbDateStruct): string {
    const month = String(ngbDate.month).padStart(2, '0');
    const day = String(ngbDate.day).padStart(2, '0');
    return `${ngbDate.year}-${month}-${day}`;
  }

  get isEditMode(): boolean {
    return this.config.mode === 'edit';
  }

  /**
   * Get status class for the status badge display.
   * When dropdown is collapsed, status shows as a pill.
   */
  getStatusClass(value: string): string {
    return `status-${value}`;
  }
}
