import { useRef, useState } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import { EXPORTABLE_TYPES } from '../constants/exportDefaults';
import { ENTRY_TYPE_META as META } from '../components/entryMeta';
import { listExportableEntries } from '../data/repositories/entries';
import { downloadIcsForEntries } from '../domain/calendarExport';
import { downloadBackup, readFileAsText, restoreBackup, InvalidBackupError } from '../domain/backup';

export function Settings() {
  const exportDefaults = useSettingsStore((s) => s.exportDefaults);
  const setExportDefault = useSettingsStore((s) => s.setExportDefault);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleExportCalendar() {
    const entries = await listExportableEntries();
    if (entries.length === 0) {
      showToast('No entries are flagged for calendar export yet.');
      return;
    }
    const { filename } = downloadIcsForEntries(entries);
    showToast(`Downloaded ${filename} — open it to add to Apple Calendar.`);
  }

  async function handleBackup() {
    await downloadBackup();
    showToast('Backup downloaded.');
  }

  async function handleRestoreClick() {
    fileInputRef.current?.click();
  }

  async function handleRestoreFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      if (
        !window.confirm(
          'Restoring will replace ALL current entries with the contents of this backup. Continue?',
        )
      ) {
        return;
      }
      const { restoredCount } = await restoreBackup(text);
      showToast(`Restored ${restoredCount} entries.`);
    } catch (err) {
      if (err instanceof InvalidBackupError) {
        showToast(err.message);
      } else {
        showToast('Restore failed.');
      }
    }
  }

  return (
    <div>
      <div className="settings-group">
        <div className="section-title">Calendar export</div>
        <p className="text-muted">
          Generates an .ics file with every entry flagged below. Open the downloaded file on your
          iPhone to add the events (and their reminders) to Apple Calendar. This is a manual,
          repeatable action — re-export whenever your schedule changes.
        </p>
        <button type="button" className="btn btn-primary btn-block" onClick={handleExportCalendar}>
          Export to Calendar (.ics)
        </button>

        <div className="section-title">Export defaults by type</div>
        {EXPORTABLE_TYPES.map((type) => (
          <div className="settings-row" key={type}>
            <span>
              {META[type].icon} {META[type].label}
            </span>
            <button
              type="button"
              className={`toggle${exportDefaults[type] ? ' on' : ''}`}
              onClick={() => setExportDefault(type, !exportDefaults[type])}
              aria-label={`Toggle default export for ${type}`}
            />
          </div>
        ))}
      </div>

      <div className="settings-group">
        <div className="section-title">Backup</div>
        <p className="text-muted">
          Your data lives only in this browser. Export a backup regularly, and keep it somewhere
          safe — it's the only way to recover your entries if this device is lost or reset.
        </p>
        <div className="btn-row">
          <button type="button" className="btn" onClick={handleBackup}>
            Export backup (JSON)
          </button>
          <button type="button" className="btn btn-danger" onClick={handleRestoreClick}>
            Restore from backup
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={handleRestoreFile}
        />
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
