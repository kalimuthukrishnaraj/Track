import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db';
import type { Entry } from '../data/db';
import { AGENDA_ENTRY_TYPES, ENTRY_TYPE_META, formatDateLabel, formatTime } from '../components/entryMeta';
import { getAgendaRange, useAgendaStore, type AgendaViewMode } from '../store/useAgendaStore';
import { expandOccurrences } from '../domain/recurrence';
import { useEntryFormStore } from '../store/useEntryFormStore';

interface Occurrence {
  entry: Entry;
  occurrenceStart: number;
}

function rangeLabel(anchorDate: number, mode: AgendaViewMode): string {
  const [start, end] = getAgendaRange(anchorDate, mode);
  if (mode === 'day') return formatDateLabel(start.getTime());
  if (mode === 'week') {
    const last = new Date(end.getTime() - 86400000);
    return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${last.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
  }
  return start.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export function Agenda() {
  const { viewMode, anchorDate, setViewMode, goToToday, stepForward, stepBackward } =
    useAgendaStore();
  const openForCreate = useEntryFormStore((s) => s.openForCreate);
  const openForEdit = useEntryFormStore((s) => s.openForEdit);

  const [rangeStart, rangeEnd] = getAgendaRange(anchorDate, viewMode);

  const occurrences = useLiveQuery(async (): Promise<Occurrence[]> => {
    const all = await db.entries
      .filter((e) => AGENDA_ENTRY_TYPES.includes(e.type) && e.startAt != null)
      .toArray();

    const result: Occurrence[] = [];
    for (const entry of all) {
      if (entry.recurrenceRule) {
        for (const date of expandOccurrences(entry, rangeStart, rangeEnd)) {
          result.push({ entry, occurrenceStart: date.getTime() });
        }
      } else {
        const start = entry.startAt as number;
        if (start >= rangeStart.getTime() && start < rangeEnd.getTime()) {
          result.push({ entry, occurrenceStart: start });
        }
      }
    }
    return result.sort((a, b) => a.occurrenceStart - b.occurrenceStart);
  }, [rangeStart.getTime(), rangeEnd.getTime()]);

  const grouped = groupByDay(occurrences ?? []);

  return (
    <div>
      <div className="view-toggle">
        {(['day', 'week', 'month'] as AgendaViewMode[]).map((mode) => (
          <button
            key={mode}
            className={viewMode === mode ? 'active' : ''}
            onClick={() => setViewMode(mode)}
          >
            {mode[0].toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>

      <div className="range-nav">
        <button type="button" className="icon-button" onClick={stepBackward} aria-label="Previous">
          ‹
        </button>
        <div>
          <div className="range-label">{rangeLabel(anchorDate, viewMode)}</div>
          <button type="button" className="link-btn" onClick={goToToday}>
            Today
          </button>
        </div>
        <button type="button" className="icon-button" onClick={stepForward} aria-label="Next">
          ›
        </button>
      </div>

      {occurrences == null ? (
        <p className="text-muted">Loading…</p>
      ) : grouped.length === 0 ? (
        <div className="empty-state">
          <p>Nothing scheduled in this range.</p>
          <button type="button" className="btn btn-primary" onClick={() => openForCreate({})}>
            Add an entry
          </button>
        </div>
      ) : (
        grouped.map(([dayMs, dayOccurrences]) => (
          <div key={dayMs}>
            <div className="section-title">{formatDateLabel(dayMs)}</div>
            <div className="entry-list">
              {dayOccurrences.map(({ entry, occurrenceStart }) => {
                const meta = ENTRY_TYPE_META[entry.type];
                return (
                  <div
                    key={`${entry.id}-${occurrenceStart}`}
                    className="entry-row"
                    onClick={() => openForEdit(entry.id)}
                  >
                    <span className="entry-type-dot" style={{ background: meta.color }} />
                    <div className="entry-row-body">
                      <div className="entry-row-title">{entry.title}</div>
                      <div className="entry-row-meta">
                        {meta.label} · {entry.allDay ? 'All day' : formatTime(occurrenceStart, false)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function groupByDay(occurrences: Occurrence[]): [number, Occurrence[]][] {
  const map = new Map<number, Occurrence[]>();
  for (const occ of occurrences) {
    const d = new Date(occ.occurrenceStart);
    d.setHours(0, 0, 0, 0);
    const key = d.getTime();
    const list = map.get(key) ?? [];
    list.push(occ);
    map.set(key, list);
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]);
}
