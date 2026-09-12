import { db } from '../db';
import type { Entry, EntryStatus, EntryType } from '../db';

export type NewEntry = Omit<Entry, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
};

function now(): number {
  return Date.now();
}

/** Create a new entry. Generates an id and timestamps if not supplied. */
export async function createEntry(input: NewEntry): Promise<Entry> {
  const timestamp = now();
  const entry: Entry = {
    ...input,
    id: input.id ?? crypto.randomUUID(),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await db.entries.add(entry);
  return entry;
}

/** Read a single entry by id. */
export async function getEntry(id: string): Promise<Entry | undefined> {
  return db.entries.get(id);
}

/** Update an existing entry (partial patch). Bumps updatedAt. */
export async function updateEntry(
  id: string,
  patch: Partial<Omit<Entry, 'id' | 'createdAt'>>,
): Promise<Entry | undefined> {
  const existing = await db.entries.get(id);
  if (!existing) return undefined;
  const updated: Entry = {
    ...existing,
    ...patch,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: now(),
  };
  await db.entries.put(updated);
  return updated;
}

/** Delete an entry by id. */
export async function deleteEntry(id: string): Promise<void> {
  await db.entries.delete(id);
}

/** List every entry, optionally sorted by startAt ascending (entries without startAt last). */
export async function listAllEntries(): Promise<Entry[]> {
  const all = await db.entries.toArray();
  return sortByStartAt(all);
}

/** List entries of a given type. */
export async function listEntriesByType(type: EntryType): Promise<Entry[]> {
  const results = await db.entries.where('type').equals(type).toArray();
  return sortByStartAt(results);
}

/** List entries with a startAt within [startMs, endMs). Entries without startAt are excluded. */
export async function listEntriesByDateRange(
  startMs: number,
  endMs: number,
): Promise<Entry[]> {
  const results = await db.entries
    .where('startAt')
    .between(startMs, endMs, true, false)
    .toArray();
  return sortByStartAt(results);
}

/** List entries by status. */
export async function listEntriesByStatus(status: EntryStatus): Promise<Entry[]> {
  const results = await db.entries.where('status').equals(status).toArray();
  return sortByStartAt(results);
}

/**
 * List entries flagged for calendar export, restricted to the "upcoming" window:
 * recurring entries are always included (their RRULE needs the original startAt
 * as DTSTART to expand correctly, regardless of how far in the past it is), and
 * non-recurring entries are included only if their startAt is today or later.
 */
export async function listExportableEntries(): Promise<Entry[]> {
  const all = await db.entries.toArray();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayMs = startOfToday.getTime();
  return sortByStartAt(
    all.filter((e) => {
      if (!e.exportToCalendar) return false;
      if (e.recurrenceRule) return true;
      return e.startAt != null && e.startAt >= todayMs;
    }),
  );
}

/** List entries linked to a given entry id (either direction is not tracked; this checks linkedEntryIds). */
export async function listLinkedEntries(entryId: string): Promise<Entry[]> {
  const all = await db.entries.toArray();
  return all.filter((e) => e.linkedEntryIds?.includes(entryId));
}

function sortByStartAt(entries: Entry[]): Entry[] {
  return [...entries].sort((a, b) => {
    if (a.startAt == null && b.startAt == null) return 0;
    if (a.startAt == null) return 1;
    if (b.startAt == null) return -1;
    return a.startAt - b.startAt;
  });
}
