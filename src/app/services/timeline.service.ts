import { Injectable } from '@angular/core';
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  addDays, addWeeks, addMonths, addHours, subDays, subWeeks, subMonths,
  differenceInDays, differenceInCalendarDays, differenceInCalendarWeeks, differenceInCalendarMonths,
  differenceInHours,
  format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, eachHourOfInterval,
  isSameDay, isSameHour, isWithinInterval, parseISO
} from 'date-fns';

export type ZoomLevel = 'hour' | 'day' | 'week' | 'month';

export interface TimelineColumn {
  label: string;
  date: Date;
  isToday: boolean;
  isCurrentMonth: boolean;
}

export interface TimelineRange {
  start: Date;
  end: Date;
}

/**
 * TimelineService handles all date-to-pixel calculations.
 *
 * Column widths derived from Sketch inspect:
 * - Artboard width: 1,259px
 * - Work center column: 300px (fixed)
 * - Remaining grid: ~920px for 8 visible months
 * - Month column: 116px each (920/8 ≈ 115)
 */
@Injectable({
  providedIn: 'root'
})
export class TimelineService {

  /** Column widths in pixels for each zoom level (from Sketch inspect) */
  readonly COLUMN_WIDTHS: Record<ZoomLevel, number> = {
    hour: 60,
    day: 44,
    week: 100,
    month: 130
  };

  /** Row height in pixels (from Sketch: ~48px per data row) */
  readonly ROW_HEIGHT = 48;

  /**
   * Get the visible date range based on zoom level centered on today.
   * Ranges are intentionally wide so the grid extends well beyond the viewport.
   */
  getDefaultRange(zoom: ZoomLevel): TimelineRange {
    const today = new Date();

    switch (zoom) {
      case 'hour':
        return {
          start: subDays(startOfDay(today), 14),
          end: addDays(endOfDay(today), 14)
        };
      case 'day':
        return {
          start: subDays(startOfDay(today), 90),
          end: addDays(endOfDay(today), 90)
        };
      case 'week':
        return {
          start: subWeeks(startOfWeek(today, { weekStartsOn: 1 }), 52),
          end: addWeeks(endOfWeek(today, { weekStartsOn: 1 }), 52)
        };
      case 'month':
        return {
          start: subMonths(startOfMonth(today), 48),
          end: addMonths(endOfMonth(today), 48)
        };
    }
  }

  /**
   * Extend an existing range in the given direction.
   * Returns a new range with additional time prepended or appended.
   */
  extendRange(zoom: ZoomLevel, range: TimelineRange, direction: 'left' | 'right'): TimelineRange {
    switch (zoom) {
      case 'hour':
        return direction === 'left'
          ? { start: subDays(range.start, 14), end: range.end }
          : { start: range.start, end: addDays(range.end, 14) };
      case 'day':
        return direction === 'left'
          ? { start: subDays(range.start, 60), end: range.end }
          : { start: range.start, end: addDays(range.end, 60) };
      case 'week':
        return direction === 'left'
          ? { start: subWeeks(range.start, 26), end: range.end }
          : { start: range.start, end: addWeeks(range.end, 26) };
      case 'month':
        return direction === 'left'
          ? { start: subMonths(range.start, 24), end: range.end }
          : { start: range.start, end: addMonths(range.end, 24) };
    }
  }

  /**
   * Generate column headers for the timeline based on zoom level.
   */
  getColumns(zoom: ZoomLevel, range: TimelineRange): TimelineColumn[] {
    const today = startOfDay(new Date());
    const currentMonth = startOfMonth(today);

    switch (zoom) {
      case 'hour':
        return eachHourOfInterval({ start: range.start, end: range.end }).map(date => ({
          label: format(date, 'ha'),
          date,
          isToday: isSameHour(date, new Date()),
          isCurrentMonth: false
        }));

      case 'day':
        return eachDayOfInterval({ start: range.start, end: range.end }).map(date => ({
          label: format(date, 'd MMM'),
          date,
          isToday: isSameDay(date, today),
          isCurrentMonth: false
        }));

      case 'week':
        return eachWeekOfInterval({ start: range.start, end: range.end }, { weekStartsOn: 1 }).map(date => ({
          label: format(date, "'W'w, MMM d"),
          date,
          isToday: isWithinInterval(today, { start: date, end: addDays(date, 6) }),
          isCurrentMonth: false
        }));

      case 'month':
        return eachMonthOfInterval({ start: range.start, end: range.end }).map(date => ({
          label: format(date, 'MMM yyyy'),
          date,
          isToday: false,
          isCurrentMonth: isSameDay(startOfMonth(date), currentMonth)
        }));
    }
  }

  /**
   * Calculate the pixel offset (left position) of a date within the timeline.
   *
   * For month zoom: proportional position within each month column.
   * A date halfway through March will be at the midpoint of the March column.
   */
  dateToPixelOffset(dateStr: string, zoom: ZoomLevel, range: TimelineRange): number {
    const date = parseISO(dateStr);
    const columnWidth = this.COLUMN_WIDTHS[zoom];

    switch (zoom) {
      case 'hour': {
        const hourDiff = differenceInHours(date, range.start);
        return hourDiff * columnWidth;
      }
      case 'day': {
        const dayDiff = differenceInCalendarDays(date, range.start);
        return dayDiff * columnWidth;
      }
      case 'week': {
        const totalDays = differenceInCalendarDays(date, range.start);
        return (totalDays / 7) * columnWidth;
      }
      case 'month': {
        const months = eachMonthOfInterval({ start: range.start, end: range.end });
        let offset = 0;

        for (let i = 0; i < months.length; i++) {
          const monthStart = months[i];
          const monthEnd = endOfMonth(monthStart);
          const daysInMonth = differenceInCalendarDays(monthEnd, monthStart) + 1;

          if (date <= monthEnd) {
            const daysInto = Math.max(0, differenceInCalendarDays(date, monthStart));
            offset += (daysInto / daysInMonth) * columnWidth;
            break;
          } else {
            offset += columnWidth;
          }
        }
        return offset;
      }
    }
  }

  /**
   * Calculate the pixel width of a work order bar.
   */
  getBarWidth(startDateStr: string, endDateStr: string, zoom: ZoomLevel, range: TimelineRange): number {
    const startOffset = this.dateToPixelOffset(startDateStr, zoom, range);
    const endOffset = this.dateToPixelOffset(endDateStr, zoom, range);
    return Math.max(endOffset - startOffset, 20);
  }

  /**
   * Convert a pixel x-position back to a date (for click-to-create).
   */
  pixelOffsetToDate(offsetX: number, zoom: ZoomLevel, range: TimelineRange): Date {
    const columnWidth = this.COLUMN_WIDTHS[zoom];

    switch (zoom) {
      case 'hour': {
        const hours = Math.floor(offsetX / columnWidth);
        return addHours(range.start, hours);
      }
      case 'day': {
        const days = Math.floor(offsetX / columnWidth);
        return addDays(range.start, days);
      }
      case 'week': {
        const weeks = Math.floor(offsetX / columnWidth);
        return addWeeks(range.start, weeks);
      }
      case 'month': {
        const months = eachMonthOfInterval({ start: range.start, end: range.end });
        let cumulativeOffset = 0;

        for (let i = 0; i < months.length; i++) {
          if (cumulativeOffset + columnWidth > offsetX) {
            const monthStart = months[i];
            const monthEnd = endOfMonth(monthStart);
            const daysInMonth = differenceInCalendarDays(monthEnd, monthStart) + 1;
            const fraction = (offsetX - cumulativeOffset) / columnWidth;
            const dayWithinMonth = Math.floor(fraction * daysInMonth);
            return addDays(monthStart, dayWithinMonth);
          }
          cumulativeOffset += columnWidth;
        }
        return range.end;
      }
    }
  }

  /**
   * Get the pixel offset of today's date for the current day indicator.
   */
  getTodayOffset(zoom: ZoomLevel, range: TimelineRange): number {
    const today = format(new Date(), 'yyyy-MM-dd');
    return this.dateToPixelOffset(today, zoom, range);
  }

  /**
   * Get total timeline width in pixels.
   */
  getTotalWidth(zoom: ZoomLevel, range: TimelineRange): number {
    const columns = this.getColumns(zoom, range);
    return columns.length * this.COLUMN_WIDTHS[zoom];
  }
}
