import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgbDatepickerModule } from '@ng-bootstrap/ng-bootstrap';
import { SlidePanelComponent } from './slide-panel.component';
import { PanelConfig } from '../timeline/timeline.component';
import { WorkOrderService } from '../../services/work-order.service';

describe('SlidePanelComponent', () => {
  let component: SlidePanelComponent;
  let fixture: ComponentFixture<SlidePanelComponent>;

  const createConfig: PanelConfig = {
    mode: 'create',
    workCenterId: 'wc-1',
    workCenterName: 'Test Center',
    startDate: '2026-03-15'
  };

  const editConfig: PanelConfig = {
    mode: 'edit',
    workCenterId: 'wc-1',
    workCenterName: 'Test Center',
    workOrder: {
      docId: 'wo-1',
      docType: 'workOrder',
      data: {
        name: 'Existing Order',
        workCenterId: 'wc-1',
        status: 'in-progress',
        startDate: '2026-03-01',
        endDate: '2026-03-31'
      }
    }
  };

  function createComponent(config: PanelConfig): void {
    TestBed.configureTestingModule({
      imports: [SlidePanelComponent, ReactiveFormsModule, NgSelectModule, NgbDatepickerModule],
      providers: [WorkOrderService]
    });

    fixture = TestBed.createComponent(SlidePanelComponent);
    component = fixture.componentInstance;
    component.config = config;
    component.workCenters = [
      { docId: 'wc-1', docType: 'workCenter', data: { name: 'Test Center' } }
    ];
    fixture.detectChanges();
  }

  afterEach(() => {
    localStorage.clear();
  });

  // ─── Component creation ───

  describe('create mode', () => {
    beforeEach(() => createComponent(createConfig));

    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize form with empty name in create mode', () => {
      expect(component.form.get('name')?.value).toBe('');
    });

    it('should initialize status to "open" in create mode', () => {
      expect(component.form.get('status')?.value).toBe('open');
    });

    it('should initialize start date from config', () => {
      const startDate = component.form.get('startDate')?.value;
      expect(startDate).toBeTruthy();
      expect(startDate.year).toBe(2026);
      expect(startDate.month).toBe(3);
      expect(startDate.day).toBe(15);
    });

    it('should initialize end date 7 days after start', () => {
      const endDate = component.form.get('endDate')?.value;
      expect(endDate).toBeTruthy();
      expect(endDate.year).toBe(2026);
      expect(endDate.month).toBe(3);
      expect(endDate.day).toBe(22);
    });

    it('should report isEditMode as false', () => {
      expect(component.isEditMode).toBe(false);
    });
  });

  describe('edit mode', () => {
    beforeEach(() => createComponent(editConfig));

    it('should populate form with existing work order data', () => {
      expect(component.form.get('name')?.value).toBe('Existing Order');
      expect(component.form.get('status')?.value).toBe('in-progress');
    });

    it('should report isEditMode as true', () => {
      expect(component.isEditMode).toBe(true);
    });
  });

  // ─── Form validation ───

  describe('form validation', () => {
    beforeEach(() => createComponent(createConfig));

    it('should require work order name', () => {
      component.form.get('name')?.setValue('');
      component.form.get('name')?.markAsTouched();
      expect(component.form.get('name')?.hasError('required')).toBe(true);
    });

    it('should accept a valid name', () => {
      component.form.get('name')?.setValue('Valid Name');
      expect(component.form.get('name')?.valid).toBe(true);
    });

    it('should mark form as invalid when name is empty', () => {
      component.form.get('name')?.setValue('');
      expect(component.form.invalid).toBe(true);
    });

    it('should mark form as valid when all fields are filled', () => {
      component.form.get('name')?.setValue('Test Order');
      expect(component.form.valid).toBe(true);
    });
  });

  // ─── Date validation (end date after start date) ───

  describe('date validation', () => {
    beforeEach(() => createComponent(createConfig));

    it('should reject end date before start date on submit', () => {
      component.form.get('name')?.setValue('Test');
      // Set end date before start date
      component.form.get('startDate')?.setValue({ year: 2026, month: 3, day: 15 });
      component.form.get('endDate')?.setValue({ year: 2026, month: 3, day: 10 });

      const saveSpy = jest.spyOn(component.save, 'emit');
      component.onSubmit();

      expect(saveSpy).not.toHaveBeenCalled();
      expect(component.form.get('endDate')?.hasError('endBeforeStart')).toBe(true);
    });

    it('should reject end date equal to start date on submit', () => {
      component.form.get('name')?.setValue('Test');
      component.form.get('startDate')?.setValue({ year: 2026, month: 3, day: 15 });
      component.form.get('endDate')?.setValue({ year: 2026, month: 3, day: 15 });

      const saveSpy = jest.spyOn(component.save, 'emit');
      component.onSubmit();

      expect(saveSpy).not.toHaveBeenCalled();
    });

    it('should accept end date after start date', () => {
      component.form.get('name')?.setValue('Test');
      component.form.get('startDate')?.setValue({ year: 2026, month: 3, day: 15 });
      component.form.get('endDate')?.setValue({ year: 2026, month: 3, day: 20 });

      const saveSpy = jest.spyOn(component.save, 'emit');
      component.onSubmit();

      expect(saveSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test',
          startDate: '2026-03-15',
          endDate: '2026-03-20'
        })
      );
    });
  });

  // ─── Submit and emit ───

  describe('onSubmit', () => {
    beforeEach(() => createComponent(createConfig));

    it('should not emit save when form is invalid', () => {
      const saveSpy = jest.spyOn(component.save, 'emit');
      component.form.get('name')?.setValue('');
      component.onSubmit();
      expect(saveSpy).not.toHaveBeenCalled();
    });

    it('should mark all fields as touched on invalid submit', () => {
      component.form.get('name')?.setValue('');
      component.onSubmit();
      expect(component.form.get('name')?.touched).toBe(true);
    });

    it('should emit save with correct data for valid form', () => {
      const saveSpy = jest.spyOn(component.save, 'emit');

      component.form.get('name')?.setValue('New Order');
      component.form.get('status')?.setValue('blocked');
      component.form.get('startDate')?.setValue({ year: 2026, month: 4, day: 1 });
      component.form.get('endDate')?.setValue({ year: 2026, month: 4, day: 30 });

      component.onSubmit();

      expect(saveSpy).toHaveBeenCalledWith({
        name: 'New Order',
        status: 'blocked',
        startDate: '2026-04-01',
        endDate: '2026-04-30'
      });
    });
  });

  // ─── Cancel ───

  describe('onCancel', () => {
    beforeEach(() => createComponent(createConfig));

    it('should emit close event', () => {
      const closeSpy = jest.spyOn(component.close, 'emit');
      component.onCancel();
      expect(closeSpy).toHaveBeenCalled();
    });
  });

  // ─── Keyboard handling ───

  describe('onKeydown', () => {
    beforeEach(() => createComponent(createConfig));

    it('should emit close on Escape key', () => {
      const closeSpy = jest.spyOn(component.close, 'emit');
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      component.onKeydown(event);
      expect(closeSpy).toHaveBeenCalled();
    });

    it('should not emit close on other keys', () => {
      const closeSpy = jest.spyOn(component.close, 'emit');
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      component.onKeydown(event);
      expect(closeSpy).not.toHaveBeenCalled();
    });
  });

  // ─── Accessibility attributes ───

  describe('accessibility', () => {
    beforeEach(() => createComponent(createConfig));

    it('should have role="dialog" on the panel element', () => {
      const panelEl = fixture.nativeElement.querySelector('.slide-panel');
      expect(panelEl.getAttribute('role')).toBe('dialog');
    });

    it('should have aria-modal="true" on the panel', () => {
      const panelEl = fixture.nativeElement.querySelector('.slide-panel');
      expect(panelEl.getAttribute('aria-modal')).toBe('true');
    });

    it('should have aria-labelledby pointing to the title', () => {
      const panelEl = fixture.nativeElement.querySelector('.slide-panel');
      const labelledBy = panelEl.getAttribute('aria-labelledby');
      expect(labelledBy).toBe('panelTitle');

      const titleEl = fixture.nativeElement.querySelector('#panelTitle');
      expect(titleEl).toBeTruthy();
      expect(titleEl.textContent).toContain('Work Order Details');
    });

    it('should associate name input with its label via id/for', () => {
      const label = fixture.nativeElement.querySelector('label[for="workOrderName"]');
      const input = fixture.nativeElement.querySelector('#workOrderName');
      expect(label).toBeTruthy();
      expect(input).toBeTruthy();
    });

    it('should have aria-label on the Cancel button', () => {
      const cancelBtn = fixture.nativeElement.querySelector('.btn-header-cancel');
      expect(cancelBtn.getAttribute('aria-label')).toBeTruthy();
    });

    it('should have aria-label on the Create/Save button', () => {
      const submitBtn = fixture.nativeElement.querySelector('.btn-header-create');
      expect(submitBtn.getAttribute('aria-label')).toBeTruthy();
    });

    it('should have role="alert" on validation errors when they appear', () => {
      component.form.get('name')?.setValue('');
      component.form.get('name')?.markAsTouched();
      fixture.detectChanges();

      const errorEl = fixture.nativeElement.querySelector('.field-error[role="alert"]');
      expect(errorEl).toBeTruthy();
    });
  });

  // ─── Status options ───

  describe('statusOptions', () => {
    beforeEach(() => createComponent(createConfig));

    it('should provide all four status options', () => {
      expect(component.statusOptions.length).toBe(4);
      const values = component.statusOptions.map(s => s.value);
      expect(values).toContain('open');
      expect(values).toContain('in-progress');
      expect(values).toContain('complete');
      expect(values).toContain('blocked');
    });
  });

  // ─── getStatusClass ───

  describe('getStatusClass', () => {
    beforeEach(() => createComponent(createConfig));

    it('should return correct CSS class for each status', () => {
      expect(component.getStatusClass('open')).toBe('status-open');
      expect(component.getStatusClass('in-progress')).toBe('status-in-progress');
      expect(component.getStatusClass('complete')).toBe('status-complete');
      expect(component.getStatusClass('blocked')).toBe('status-blocked');
    });
  });
});
