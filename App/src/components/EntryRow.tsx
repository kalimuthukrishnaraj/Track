import type { Entry } from '../data/db';
import { ENTRY_TYPE_META, formatDateTimeRange } from './entryMeta';
import { useEntryFormStore } from '../store/useEntryFormStore';

interface EntryRowProps {
  entry: Entry;
  onToggleDone?: (entry: Entry) => void;
  showCheckbox?: boolean;
  subtitleOverride?: string;
}

export function EntryRow({ entry, onToggleDone, showCheckbox, subtitleOverride }: EntryRowProps) {
  const openForEdit = useEntryFormStore((s) => s.openForEdit);
  const meta = ENTRY_TYPE_META[entry.type];
  const isOverdue =
    entry.status === 'pending' &&
    entry.startAt != null &&
    entry.startAt < Date.now() &&
    !entry.allDay;

  return (
    <div className="entry-row" onClick={() => openForEdit(entry.id)}>
      {showCheckbox ? (
        <button
          type="button"
          className={`checkbox${entry.status === 'done' ? ' checked' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleDone?.(entry);
          }}
          aria-label={entry.status === 'done' ? 'Mark as not done' : 'Mark as done'}
        >
          {entry.status === 'done' ? '✓' : ''}
        </button>
      ) : (
        <span className="entry-type-dot" style={{ background: meta.color }} />
      )}
      <div className="entry-row-body">
        <div className={`entry-row-title${entry.status === 'done' ? ' done' : ''}`}>
          {entry.title}
        </div>
        <div className={`entry-row-meta${isOverdue ? ' overdue' : ''}`}>
          {subtitleOverride ??
            `${meta.label} · ${formatDateTimeRange(entry.startAt, entry.endAt, entry.allDay)}`}
        </div>
      </div>
    </div>
  );
}
