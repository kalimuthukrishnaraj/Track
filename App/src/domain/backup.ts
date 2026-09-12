import { db } from '../data/db';
import type { Entry } from '../data/db';

const BACKUP_SCHEMA_VERSION = 1;

export interface BackupFile {
  schemaVersion: number;
  exportedAt: number;
  entries: Entry[];
}

/** Serialize every entry in the database to a JSON backup string. */
export async function exportBackup(): Promise<string> {
  const entries = await db.entries.toArray();
  const backup: BackupFile = {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: Date.now(),
    entries,
  };
  return JSON.stringify(backup, null, 2);
}

/** Trigger a browser download of the current backup as a JSON file. */
export async function downloadBackup(): Promise<void> {
  const json = await exportBackup();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const pad = (n: number) => String(n).padStart(2, '0');
  const d = new Date();
  a.href = url;
  a.download = `track-backup-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export class InvalidBackupError extends Error {}

/** Parse and validate a backup JSON string. Throws InvalidBackupError if malformed. */
export function parseBackup(json: string): BackupFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new InvalidBackupError('File is not valid JSON.');
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('entries' in parsed) ||
    !Array.isArray((parsed as { entries: unknown }).entries)
  ) {
    throw new InvalidBackupError('File does not look like a Track backup.');
  }

  const backup = parsed as BackupFile;
  for (const entry of backup.entries) {
    if (!entry || typeof entry !== 'object' || !('id' in entry) || !('type' in entry)) {
      throw new InvalidBackupError('Backup contains a malformed entry.');
    }
  }

  return backup;
}

/**
 * Restore a backup, REPLACING all current entries. Callers must confirm
 * with the user first, since this is destructive (per architecture.md
 * Phase 5: "a restore action ... with a confirmation step since it
 * overwrites current data").
 */
export async function restoreBackup(json: string): Promise<{ restoredCount: number }> {
  const backup = parseBackup(json);
  await db.transaction('rw', db.entries, async () => {
    await db.entries.clear();
    await db.entries.bulkAdd(backup.entries);
  });
  return { restoredCount: backup.entries.length };
}

/** Read a File (from an <input type="file">) as text. */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
