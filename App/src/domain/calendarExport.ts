import { createEvents, type Alarm, type DateArray, type EventAttributes } from 'ics';
import type { Entry, EntryType, MealPayload } from '../data/db';
import { ALARM_LEAD_MINUTES } from '../constants/exportDefaults';

export interface CalendarExportResult {
  filename: string;
  icsContent: string;
}

/**
 * Generate a single .ics calendar file containing every entry passed in.
 * Callers are expected to pre-filter to `exportToCalendar: true` entries
 * (see repositories/entries.ts `listExportableEntries`).
 */
export function generateIcsForEntries(entries: Entry[]): CalendarExportResult {
  const events = entries
    .filter((e) => e.startAt != null)
    .map(entryToIcsEvent);

  const { error, value } = createEvents(events, {
    productId: 'Track',
    calName: 'Track',
  });

  if (error || !value) {
    throw error ?? new Error('Failed to generate .ics file');
  }

  const filename = `track-export-${dateStamp(new Date())}.ics`;
  return { filename, icsContent: value };
}

/** Generate the .ics for the given entries and trigger a browser download. */
export function downloadIcsForEntries(entries: Entry[]): CalendarExportResult {
  const result = generateIcsForEntries(entries);
  const blob = new Blob([result.icsContent], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = result.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return result;
}

function dateStamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function toLocalDateArray(ms: number, allDay: boolean): DateArray {
  const d = new Date(ms);
  if (allDay) {
    return [d.getFullYear(), d.getMonth() + 1, d.getDate()];
  }
  return [
    d.getFullYear(),
    d.getMonth() + 1,
    d.getDate(),
    d.getHours(),
    d.getMinutes(),
  ];
}

function entryToIcsEvent(entry: Entry): EventAttributes {
  const start = toLocalDateArray(entry.startAt as number, entry.allDay);

  const endOrDuration = entry.endAt
    ? { end: toLocalDateArray(entry.endAt, entry.allDay) }
    : entry.allDay
      ? { duration: { days: 1 } }
      : { duration: { hours: 1 } };

  const descriptionParts: string[] = [];
  if (entry.notes) descriptionParts.push(entry.notes);
  descriptionParts.push(`Track entry type: ${entry.type}`);

  const event: EventAttributes = {
    uid: `${entry.id}@track.app`,
    title: entry.title,
    description: descriptionParts.join('\n\n'),
    start,
    startInputType: 'local',
    startOutputType: 'local',
    ...endOrDuration,
    ...(entry.recurrenceRule
      ? { recurrenceRule: entry.recurrenceRule.replace(/^RRULE:/, '') }
      : {}),
    alarms: buildAlarms(entry),
  };

  return event;
}

function buildAlarms(entry: Entry): Alarm[] {
  if (entry.startAt == null) return [];

  if (entry.type === 'assignment') {
    return [assignmentAlarm(entry.startAt)];
  }

  if (entry.type === 'meal') {
    const payload = entry.payload as MealPayload | undefined;
    const offset = payload?.prepStartOffsetMin;
    if (offset != null) {
      return [relativeAlarm(offset, entry.title, 'Prep time')];
    }
    return [];
  }

  const leadTimes = ALARM_LEAD_MINUTES[entry.type as EntryType];
  if (!leadTimes) return [];
  return leadTimes.map((minutes) => relativeAlarm(minutes, entry.title));
}

function relativeAlarm(minutesBefore: number, title: string, label = 'Reminder'): Alarm {
  return {
    action: 'display',
    description: `${label}: ${title}`,
    trigger: {
      before: true,
      ...minutesToDuration(minutesBefore),
    },
  };
}

function minutesToDuration(minutes: number): { hours?: number; minutes?: number } {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  const duration: { hours?: number; minutes?: number } = {};
  if (hours > 0) duration.hours = hours;
  if (remainder > 0) duration.minutes = remainder;
  if (hours === 0 && remainder === 0) duration.minutes = 0;
  return duration;
}

/**
 * Assignment reminders fire at 6pm local on the day before the due date,
 * not at a fixed offset from the (often all-day/midnight) due timestamp.
 * Uses an absolute DATE-TIME trigger, computed in the browser's local
 * timezone (correct because export always runs on the user's own device).
 */
function assignmentAlarm(startAtMs: number): Alarm {
  const due = new Date(startAtMs);
  const dayBefore = new Date(due);
  dayBefore.setDate(due.getDate() - 1);
  dayBefore.setHours(18, 0, 0, 0);

  const trigger: DateArray = [
    dayBefore.getFullYear(),
    dayBefore.getMonth() + 1,
    dayBefore.getDate(),
    dayBefore.getHours(),
    dayBefore.getMinutes(),
  ];

  return {
    action: 'display',
    description: 'Assignment due tomorrow',
    trigger,
  };
}
