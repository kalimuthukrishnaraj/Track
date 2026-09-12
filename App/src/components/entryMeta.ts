import type { EntryType } from '../data/db';

export interface EntryTypeMeta {
  label: string;
  icon: string;
  color: string;
}

export const ENTRY_TYPE_META: Record<EntryType, EntryTypeMeta> = {
  task: { label: 'Task', icon: '✓', color: '#2563eb' },
  work_shift: { label: 'Work Shift', icon: '💼', color: '#7c3aed' },
  assignment: { label: 'Assignment', icon: '📚', color: '#d97706' },
  appointment: { label: 'Appointment', icon: '🗓️', color: '#0891b2' },
  meal: { label: 'Meal', icon: '🍽️', color: '#16a34a' },
  shopping_item: { label: 'Shopping Item', icon: '🛒', color: '#db2777' },
  errand: { label: 'Errand', icon: '📍', color: '#65a30d' },
  travel: { label: 'Travel', icon: '✈️', color: '#dc2626' },
};

export const ALL_ENTRY_TYPES: EntryType[] = [
  'task',
  'work_shift',
  'assignment',
  'appointment',
  'meal',
  'shopping_item',
  'errand',
  'travel',
];

/** Types shown on the Agenda timeline (per architecture.md Agenda description). */
export const AGENDA_ENTRY_TYPES: EntryType[] = [
  'work_shift',
  'assignment',
  'appointment',
  'travel',
];

export function formatTime(ms: number, allDay: boolean): string {
  if (allDay) return 'All day';
  return new Date(ms).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDateLabel(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTimeRange(
  startAt: number | undefined,
  endAt: number | undefined,
  allDay: boolean,
): string {
  if (startAt == null) return 'No date';
  const datePart = formatDateLabel(startAt);
  if (allDay) return datePart;
  const startTime = formatTime(startAt, false);
  if (endAt == null) return `${datePart} · ${startTime}`;
  const endTime = formatTime(endAt, false);
  return `${datePart} · ${startTime} – ${endTime}`;
}
