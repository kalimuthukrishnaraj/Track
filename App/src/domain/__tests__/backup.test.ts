import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../data/db';
import type { Entry } from '../../data/db';
import { exportBackup, InvalidBackupError, parseBackup, restoreBackup } from '../backup';

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

describe('exportBackup / restoreBackup round trip', () => {
  it('restores every entry losslessly after export', async () => {
    const entries = [
      makeEntry({ type: 'task', title: 'Buy milk', payload: { priority: 'low' } }),
      makeEntry({
        type: 'shopping_item',
        title: 'Eggs',
        payload: { listName: 'Groceries', checked: false, quantity: '1 dozen' },
      }),
      makeEntry({
        type: 'travel',
        title: 'Flight',
        startAt: Date.now() + 86400000,
        payload: { origin: 'YEG', destination: 'DEN' },
      }),
    ];
    await db.entries.bulkAdd(entries);

    const json = await exportBackup();
    await db.entries.clear();
    expect(await db.entries.count()).toBe(0);

    const { restoredCount } = await restoreBackup(json);
    expect(restoredCount).toBe(3);

    const restored = await db.entries.toArray();
    expect(restored).toHaveLength(3);
    const titles = restored.map((e) => e.title).sort();
    expect(titles).toEqual(['Buy milk', 'Eggs', 'Flight']);

    const eggs = restored.find((e) => e.title === 'Eggs');
    expect(eggs?.payload).toEqual({ listName: 'Groceries', checked: false, quantity: '1 dozen' });
  });

  it('replaces existing entries rather than merging with them', async () => {
    await db.entries.add(makeEntry({ type: 'task', title: 'Old entry' }));
    const json = await exportBackup(); // backup contains only "Old entry"

    await db.entries.add(makeEntry({ type: 'task', title: 'Newer entry' }));
    expect(await db.entries.count()).toBe(2);

    await restoreBackup(json);
    const remaining = await db.entries.toArray();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].title).toBe('Old entry');
  });
});

describe('parseBackup validation', () => {
  it('rejects invalid JSON', () => {
    expect(() => parseBackup('not json')).toThrow(InvalidBackupError);
  });

  it('rejects JSON that has no entries array', () => {
    expect(() => parseBackup(JSON.stringify({ foo: 'bar' }))).toThrow(InvalidBackupError);
  });

  it('rejects a backup whose entries are malformed', () => {
    expect(() =>
      parseBackup(JSON.stringify({ entries: [{ notAnEntry: true }] })),
    ).toThrow(InvalidBackupError);
  });

  it('accepts a well-formed backup', () => {
    const entry = makeEntry({ type: 'errand', title: 'Post office' });
    const backup = parseBackup(
      JSON.stringify({ schemaVersion: 1, exportedAt: Date.now(), entries: [entry] }),
    );
    expect(backup.entries).toHaveLength(1);
  });
});
