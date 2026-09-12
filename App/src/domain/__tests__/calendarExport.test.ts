import { describe, expect, it } from 'vitest';
import type { Entry } from '../../data/db';
import { generateIcsForEntries } from '../calendarExport';

function makeEntry(overrides: Partial<Entry> & Pick<Entry, 'type' | 'title'>): Entry {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    allDay: false,
    status: 'pending',
    exportToCalendar: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('generateIcsForEntries', () => {
  it('produces a VCALENDAR containing one VEVENT per entry with a startAt', () => {
    const appt = makeEntry({
      type: 'appointment',
      title: 'Dentist',
      startAt: new Date(2026, 5, 10, 14, 0).getTime(),
    });
    const noDate = makeEntry({ type: 'task', title: 'No date task', startAt: undefined });

    const { icsContent } = generateIcsForEntries([appt, noDate]);

    expect(icsContent).toContain('BEGIN:VCALENDAR');
    expect(icsContent).toContain('SUMMARY:Dentist');
    expect(icsContent).not.toContain('No date task');
  });

  it('adds a 60-minute-before alarm for an appointment', () => {
    const appt = makeEntry({
      type: 'appointment',
      title: 'Dentist',
      startAt: new Date(2026, 5, 10, 14, 0).getTime(),
    });
    const { icsContent } = generateIcsForEntries([appt]);
    expect(icsContent).toContain('BEGIN:VALARM');
    expect(icsContent).toContain('TRIGGER:-PT1H');
  });

  it('adds two alarms (1 day and 3 hours before) for travel', () => {
    const travel = makeEntry({
      type: 'travel',
      title: 'Flight to Denver',
      startAt: new Date(2026, 6, 1, 8, 0).getTime(),
      payload: { origin: 'YEG', destination: 'DEN' },
    });
    const { icsContent } = generateIcsForEntries([travel]);
    expect(icsContent).toContain('TRIGGER:-PT24H');
    expect(icsContent).toContain('TRIGGER:-PT3H');
  });

  it('uses an absolute 6pm-the-day-before trigger for assignments', () => {
    const due = new Date(2026, 8, 15, 23, 59); // Sept 15 2026, due end of day
    const assignment = makeEntry({
      type: 'assignment',
      title: 'Essay due',
      startAt: due.getTime(),
      allDay: true,
      payload: { subject: 'History' },
    });
    const { icsContent } = generateIcsForEntries([assignment]);
    // Absolute triggers are computed in the browser's local timezone (the
    // user's own device) and serialized as UTC; this test suite runs in UTC,
    // so the local wall-clock time and the serialized UTC time coincide.
    expect(icsContent).toContain('TRIGGER;VALUE=DATE-TIME:20260914T180000Z');
  });

  it('uses the prep offset as a relative alarm for meals', () => {
    const meal = makeEntry({
      type: 'meal',
      title: 'Chili',
      startAt: new Date(2026, 4, 3, 18, 0).getTime(),
      payload: { mealSlot: 'dinner', prepStartOffsetMin: 45 },
    });
    const { icsContent } = generateIcsForEntries([meal]);
    expect(icsContent).toContain('TRIGGER:-PT45M');
  });

  it('adds no alarm for a meal with no prep offset set', () => {
    const meal = makeEntry({
      type: 'meal',
      title: 'Leftovers',
      startAt: new Date(2026, 4, 3, 18, 0).getTime(),
      payload: { mealSlot: 'dinner' },
    });
    const { icsContent } = generateIcsForEntries([meal]);
    expect(icsContent).not.toContain('BEGIN:VALARM');
  });

  it('carries the RRULE through for a recurring entry', () => {
    const workShift = makeEntry({
      type: 'work_shift',
      title: 'Morning shift',
      startAt: new Date(2026, 4, 4, 8, 0).getTime(),
      recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
    });
    const { icsContent } = generateIcsForEntries([workShift]);
    expect(icsContent).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR');
  });
});
