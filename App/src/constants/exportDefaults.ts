import type { EntryType } from '../data/db';

/** Whether a given entry type is flagged for calendar export by default. */
export const EXPORT_DEFAULTS: Record<EntryType, boolean> = {
  appointment: true,
  travel: true,
  work_shift: true,
  assignment: true,
  task: false,
  errand: false,
  meal: false,
  shopping_item: false,
};

/**
 * Alarm lead times, in minutes before the event start, per type.
 * `assignment` is a special case: reminder fires at 6pm local the day
 * before, not a fixed offset from the (often all-day) start time — see
 * computeAssignmentAlarmDate in calendarExport.ts.
 */
export const ALARM_LEAD_MINUTES: Partial<Record<EntryType, number[]>> = {
  appointment: [60],
  travel: [24 * 60, 3 * 60], // 1 day before + 3 hours before
  work_shift: [60],
  task: [60],
  errand: [60],
};

/** Types that support calendar export at all (matches the architecture's reminder table). */
export const EXPORTABLE_TYPES: EntryType[] = [
  'appointment',
  'travel',
  'work_shift',
  'assignment',
  'task',
  'errand',
];
