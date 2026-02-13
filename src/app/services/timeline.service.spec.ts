import { TestBed } from '@angular/core/testing';
import { TimelineService, ZoomLevel, TimelineRange } from './timeline.service';
import { startOfMonth, endOfMonth, addMonths, subMonths, format, differenceInCalendarDays } from 'date-fns';

describe('TimelineService', () => {
  let service: TimelineService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TimelineService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ─── COLUMN_WIDTHS ───

  describe('COLUMN_WIDTHS', () => {
    it('should define widths for all zoom levels', () => {
      expect(service.COLUMN_WIDTHS.hour).toBe(60);
      expect(service.COLUMN_WIDTHS.day).toBe(44);
      expect(service.COLUMN_WIDTHS.week).toBe(100);
      expect(service.COLUMN_WIDTHS.month).toBe(130);
    });
  });

  // ─── getDefaultRange ───

  describe('getDefaultRange', () => {
    const zoomLevels: ZoomLevel[] = ['hour', 'day', 'week', 'month'];

    zoomLevels.forEach(zoom => {
      it(`should return a valid range for "${zoom}" zoom`, () => {
        const range = service.getDefaultRange(zoom);
        expect(range.start).toBeInstanceOf(Date);
        expect(range.end).toBeInstanceOf(Date);
        expect(range.start.getTime()).toBeLessThan(range.end.getTime());
      });

      it(`should center the "${zoom}" range around today`, () => {
        const range = service.getDefaultRange(zoom);
        const today = new Date().getTime();
        expect(range.start.getTime()).toBeLessThan(today);
        expect(range.end.getTime()).toBeGreaterThan(today);
      });
    });
  });

  // ─── getColumns ───

  describe('getColumns', () => {
    it('should generate columns for month zoom', () => {
      const range = service.getDefaultRange('month');
      const columns = service.getColumns('month', range);

      expect(columns.length).toBeGreaterThan(0);
      columns.forEach(col => {
        expect(col.label).toBeTruthy();
        expect(col.date).toBeInstanceOf(Date);
        expect(typeof col.isToday).toBe('boolean');
        expect(typeof col.isCurrentMonth).toBe('boolean');
      });
    });

    it('should mark exactly one column as current month (month zoom)', () => {
      const range = service.getDefaultRange('month');
      const columns = service.getColumns('month', range);
      const currentMonthCols = columns.filter(c => c.isCurrentMonth);
      expect(currentMonthCols.length).toBe(1);
    });

    it('should generate columns for day zoom', () => {
      const range = service.getDefaultRange('day');
      const columns = service.getColumns('day', range);

      expect(columns.length).toBeGreaterThan(0);
      // At least one column should be today
      const todayCol = columns.find(c => c.isToday);
      expect(todayCol).toBeTruthy();
    });

    it('should generate columns for week zoom', () => {
      const range = service.getDefaultRange('week');
      const columns = service.getColumns('week', range);
      expect(columns.length).toBeGreaterThan(0);
    });

    it('should generate columns for hour zoom', () => {
      const range = service.getDefaultRange('hour');
      const columns = service.getColumns('hour', range);
      expect(columns.length).toBeGreaterThan(0);
    });
  });

  // ─── dateToPixelOffset ───

  describe('dateToPixelOffset', () => {
    it('should return 0 for a date at the range start (day zoom)', () => {
      const range = service.getDefaultRange('day');
      const startStr = format(range.start, 'yyyy-MM-dd');
      const offset = service.dateToPixelOffset(startStr, 'day', range);
      expect(offset).toBe(0);
    });

    it('should return positive offset for a date after range start (day zoom)', () => {
      const range = service.getDefaultRange('day');
      const today = format(new Date(), 'yyyy-MM-dd');
      const offset = service.dateToPixelOffset(today, 'day', range);
      expect(offset).toBeGreaterThan(0);
    });

    it('should increase linearly with days in day zoom', () => {
      const range = service.getDefaultRange('day');
      const dayWidth = service.COLUMN_WIDTHS.day; // 44px
      const startStr = format(range.start, 'yyyy-MM-dd');
      const offsetStart = service.dateToPixelOffset(startStr, 'day', range);

      // One day later
      const nextDay = new Date(range.start);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextStr = format(nextDay, 'yyyy-MM-dd');
      const offsetNext = service.dateToPixelOffset(nextStr, 'day', range);

      expect(offsetNext - offsetStart).toBe(dayWidth);
    });

    it('should calculate proportional offset within month for month zoom', () => {
      const range: TimelineRange = {
        start: startOfMonth(new Date(2026, 0, 1)), // Jan 2026
        end: endOfMonth(new Date(2026, 11, 1))     // Dec 2026
      };
      const monthWidth = service.COLUMN_WIDTHS.month; // 130px

      // Jan 1 should be at offset 0
      const janOffset = service.dateToPixelOffset('2026-01-01', 'month', range);
      expect(janOffset).toBe(0);

      // Feb 1 should be at ~1 column width (130px)
      const febOffset = service.dateToPixelOffset('2026-02-01', 'month', range);
      expect(febOffset).toBe(monthWidth); // First day of second month = 1 full column

      // Mid-January (Jan 16 in a 31-day month) should be ~halfway through first column
      const midJanOffset = service.dateToPixelOffset('2026-01-16', 'month', range);
      // 15 days into 31-day month = (15/31) * 130 ≈ 62.9
      const expectedMidJan = (15 / 31) * monthWidth;
      expect(midJanOffset).toBeCloseTo(expectedMidJan, 0);
    });

    it('should handle week zoom correctly', () => {
      const range = service.getDefaultRange('week');
      const weekWidth = service.COLUMN_WIDTHS.week; // 100px

      // 7 days apart should be ~1 column width
      const startStr = format(range.start, 'yyyy-MM-dd');
      const startOffset = service.dateToPixelOffset(startStr, 'week', range);

      const oneWeekLater = new Date(range.start);
      oneWeekLater.setDate(oneWeekLater.getDate() + 7);
      const weekStr = format(oneWeekLater, 'yyyy-MM-dd');
      const weekOffset = service.dateToPixelOffset(weekStr, 'week', range);

      expect(weekOffset - startOffset).toBeCloseTo(weekWidth, 0);
    });
  });

  // ─── getBarWidth ───

  describe('getBarWidth', () => {
    it('should return positive width for valid date range', () => {
      const range: TimelineRange = {
        start: startOfMonth(new Date(2026, 0, 1)),
        end: endOfMonth(new Date(2026, 11, 1))
      };

      const width = service.getBarWidth('2026-03-01', '2026-03-31', 'month', range);
      expect(width).toBeGreaterThan(0);
    });

    it('should return minimum width of 20px for very short ranges', () => {
      const range: TimelineRange = {
        start: startOfMonth(new Date(2026, 0, 1)),
        end: endOfMonth(new Date(2026, 11, 1))
      };

      // Same day start and end → width would be 0 pixels → clamped to 20
      const width = service.getBarWidth('2026-03-15', '2026-03-15', 'month', range);
      expect(width).toBe(20);
    });

    it('should scale width proportionally to duration (day zoom)', () => {
      const range = service.getDefaultRange('day');
      const dayWidth = service.COLUMN_WIDTHS.day;

      // 10-day order
      const width10 = service.getBarWidth('2026-03-01', '2026-03-11', 'day', range);
      // 5-day order
      const width5 = service.getBarWidth('2026-03-01', '2026-03-06', 'day', range);

      // 10-day should be ~2x the 5-day width
      expect(width10).toBeCloseTo(width5 * 2, 0);
    });

    it('should calculate correct width for a full month (month zoom)', () => {
      const range: TimelineRange = {
        start: startOfMonth(new Date(2026, 0, 1)),
        end: endOfMonth(new Date(2026, 11, 1))
      };
      const monthWidth = service.COLUMN_WIDTHS.month;

      // An order spanning exactly Jan 1 to Feb 1 should be ~1 column width
      const width = service.getBarWidth('2026-01-01', '2026-02-01', 'month', range);
      expect(width).toBeCloseTo(monthWidth, 0);
    });
  });

  // ─── pixelOffsetToDate ───

  describe('pixelOffsetToDate', () => {
    it('should return range start for offset 0 (day zoom)', () => {
      const range = service.getDefaultRange('day');
      const date = service.pixelOffsetToDate(0, 'day', range);
      expect(date.getTime()).toBe(range.start.getTime());
    });

    it('should return date one day later for one column width offset (day zoom)', () => {
      const range = service.getDefaultRange('day');
      const dayWidth = service.COLUMN_WIDTHS.day;
      const date = service.pixelOffsetToDate(dayWidth, 'day', range);

      const expected = new Date(range.start);
      expected.setDate(expected.getDate() + 1);
      expect(format(date, 'yyyy-MM-dd')).toBe(format(expected, 'yyyy-MM-dd'));
    });

    it('should round-trip: dateToPixel → pixelToDate ≈ original date (day zoom)', () => {
      const range = service.getDefaultRange('day');
      const originalDate = '2026-03-15';
      const offset = service.dateToPixelOffset(originalDate, 'day', range);
      const recovered = service.pixelOffsetToDate(offset, 'day', range);
      expect(format(recovered, 'yyyy-MM-dd')).toBe(originalDate);
    });

    it('should return a date within the correct month for month zoom', () => {
      const range: TimelineRange = {
        start: startOfMonth(new Date(2026, 0, 1)),
        end: endOfMonth(new Date(2026, 11, 1))
      };
      const monthWidth = service.COLUMN_WIDTHS.month;

      // Offset at halfway through the second column (Feb)
      const offset = monthWidth + monthWidth / 2;
      const date = service.pixelOffsetToDate(offset, 'month', range);

      expect(date.getMonth()).toBe(1); // February (0-indexed)
    });

    it('should return range.end when offset exceeds total width (month zoom)', () => {
      const range: TimelineRange = {
        start: startOfMonth(new Date(2026, 0, 1)),
        end: endOfMonth(new Date(2026, 2, 1)) // 3 months
      };

      const totalWidth = service.getTotalWidth('month', range);
      const date = service.pixelOffsetToDate(totalWidth + 1000, 'month', range);
      expect(date.getTime()).toBe(range.end.getTime());
    });
  });

  // ─── extendRange ───

  describe('extendRange', () => {
    it('should extend range to the left for month zoom', () => {
      const range = service.getDefaultRange('month');
      const originalStart = range.start.getTime();

      const extended = service.extendRange('month', range, 'left');
      expect(extended.start.getTime()).toBeLessThan(originalStart);
      expect(extended.end.getTime()).toBe(range.end.getTime()); // end unchanged
    });

    it('should extend range to the right for month zoom', () => {
      const range = service.getDefaultRange('month');
      const originalEnd = range.end.getTime();

      const extended = service.extendRange('month', range, 'right');
      expect(extended.end.getTime()).toBeGreaterThan(originalEnd);
      expect(extended.start.getTime()).toBe(range.start.getTime()); // start unchanged
    });

    it('should extend range to the left for day zoom', () => {
      const range = service.getDefaultRange('day');
      const extended = service.extendRange('day', range, 'left');
      expect(extended.start.getTime()).toBeLessThan(range.start.getTime());
    });

    it('should extend range to the right for week zoom', () => {
      const range = service.getDefaultRange('week');
      const extended = service.extendRange('week', range, 'right');
      expect(extended.end.getTime()).toBeGreaterThan(range.end.getTime());
    });
  });

  // ─── getTotalWidth ───

  describe('getTotalWidth', () => {
    it('should return columns * columnWidth for day zoom', () => {
      const range = service.getDefaultRange('day');
      const columns = service.getColumns('day', range);
      const expectedWidth = columns.length * service.COLUMN_WIDTHS.day;
      expect(service.getTotalWidth('day', range)).toBe(expectedWidth);
    });

    it('should return positive width for all zoom levels', () => {
      const zoomLevels: ZoomLevel[] = ['hour', 'day', 'week', 'month'];
      zoomLevels.forEach(zoom => {
        const range = service.getDefaultRange(zoom);
        expect(service.getTotalWidth(zoom, range)).toBeGreaterThan(0);
      });
    });
  });

  // ─── getTodayOffset ───

  describe('getTodayOffset', () => {
    it('should return a positive offset within default range', () => {
      const range = service.getDefaultRange('month');
      const offset = service.getTodayOffset('month', range);
      expect(offset).toBeGreaterThan(0);
      expect(offset).toBeLessThan(service.getTotalWidth('month', range));
    });

    it('should match dateToPixelOffset for today', () => {
      const range = service.getDefaultRange('day');
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const expected = service.dateToPixelOffset(todayStr, 'day', range);
      const actual = service.getTodayOffset('day', range);
      expect(actual).toBe(expected);
    });
  });
});
