import { RecurrenceType, RecurrenceConfig } from '@/types/task';
import { addDays, addWeeks, addMonths, setDate, getDay, startOfMonth, getDate } from 'date-fns';

/**
 * Calculate the next due date for a recurring task.
 * @param currentDueDate - The current due date string (yyyy-MM-dd)
 * @param type - The recurrence type
 * @param config - The recurrence configuration
 * @returns The next due date string (yyyy-MM-dd) or null
 */
export function calculateNextOccurrence(
  currentDueDate: string | undefined,
  type: RecurrenceType,
  config?: RecurrenceConfig
): string | null {
  if (!type || !currentDueDate) return null;

  const base = new Date(currentDueDate + 'T12:00:00'); // noon to avoid timezone issues
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  switch (type) {
    case 'daily': {
      let next = addDays(base, 1);
      // If next is in the past, jump to today or tomorrow
      if (next < today) next = today;
      return fmt(next);
    }

    case 'weekly': {
      const weekDays = config?.weekDays || [getDay(base)];
      // Find next matching weekday after base
      for (let i = 1; i <= 14; i++) {
        const candidate = addDays(base, i);
        if (weekDays.includes(getDay(candidate))) {
          return fmt(candidate < today ? today : candidate);
        }
      }
      return fmt(addWeeks(base, 1));
    }

    case 'monthly_day': {
      const day = config?.monthDay || getDate(base);
      let next = addMonths(base, 1);
      try { next = setDate(next, Math.min(day, daysInMonth(next))); } catch { /* */ }
      if (next <= today) {
        next = addMonths(today, 1);
        try { next = setDate(next, Math.min(day, daysInMonth(next))); } catch { /* */ }
      }
      return fmt(next);
    }

    case 'monthly_weekday': {
      const week = config?.monthWeekday?.week || 1;
      const dayOfWeek = config?.monthWeekday?.day || 1; // 0=Sun..6=Sat
      let nextMonth = addMonths(base, 1);
      const result = getNthWeekdayOfMonth(nextMonth.getFullYear(), nextMonth.getMonth(), dayOfWeek, week);
      if (result <= today) {
        nextMonth = addMonths(nextMonth, 1);
        const r2 = getNthWeekdayOfMonth(nextMonth.getFullYear(), nextMonth.getMonth(), dayOfWeek, week);
        return fmt(r2);
      }
      return fmt(result);
    }

    case 'custom': {
      const interval = config?.interval || 1;
      const unit = config?.intervalUnit || 'days';
      let next: Date;
      if (unit === 'days') next = addDays(base, interval);
      else if (unit === 'weeks') next = addWeeks(base, interval);
      else next = addMonths(base, interval);
      if (next < today) next = today;
      return fmt(next);
    }

    default:
      return null;
  }
}

function daysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function getNthWeekdayOfMonth(year: number, month: number, dayOfWeek: number, n: number): Date {
  const first = new Date(year, month, 1);
  let day = 1 + ((dayOfWeek - first.getDay() + 7) % 7);
  day += (n - 1) * 7;
  // Clamp to month
  const max = daysInMonth(first);
  if (day > max) day = max - 6 + ((dayOfWeek - new Date(year, month, max - 6).getDay() + 7) % 7);
  return new Date(year, month, day);
}
