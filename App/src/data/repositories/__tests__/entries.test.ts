import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../db';
import type { Entry } from '../../db';
import { listExportableEntries } from '../entries';

function makeEntry(overrides: Partial<Entry> & Pick<Entry, 'type' | 'title'>): Entry {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    allDay: false,
    status: 'pending',
    exportToCalendar: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

beforeEach(async () => {
  await db.entries.clear();
});

describe('listExportableEntries', () => {
  it('excludes non-recurring entries whose startAt is in the past', async () => {
    await db.entries.bulkAdd([
      makeEntry({
        type: 'appointment',
        title: 'Old appointment',
        startAt: Date.now() - 7 * 86400000,
        exportToCalendar: true,
      }),
      makeEntry({
        type: 'appointment',
        title: 'Future appointment',
        startAt: Date.now() + 7 * 86400000,
        exportToCalendar: true,
      }),
    ]);

    const result = await listExportableEntries();
    expect(result.map((e) => e.title)).toEqual(['Future appointment']);
  });

  it('includes recurring entries regardless of their original startAt', async () => {
    await db.entries.add(
      makeEntry({
        type: 'work_shift',
        title: 'Weekly shift',
        startAt: Date.now() - 30 * 86400000,
        recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO',
        exportToCalendar: true,
      }),
    );

    const result = await listExportableEntries();
    expect(result.map((e) => e.title)).toEqual(['Weekly shift']);
  });

  it('excludes entries not flagged for export', async () => {
    await db.entries.add(
      makeEntry({
        type: 'task',
        title: 'Unflagged',
        startAt: Date.now() + 86400000,
        exportToCalendar: false,
      }),
    );

    expect(await listExportableEntries()).toHaveLength(0);
  });
});
