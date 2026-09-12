import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db';
import type { Entry } from '../data/db';
import { EntryRow } from '../components/EntryRow';
import { toggleEntryDone } from '../components/EntryFormModal';
import { useTaskFilterStore, type TaskDueFilter, type TaskStatusFilter } from '../store/useTaskFilterStore';
import { useEntryFormStore } from '../store/useEntryFormStore';

const STATUS_OPTIONS: { value: TaskStatusFilter; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'done', label: 'Done' },
  { value: 'all', label: 'All' },
];

const DUE_OPTIONS: { value: TaskDueFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'today', label: 'Today' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'no_due_date', label: 'No due date' },
];

function matchesDueFilter(entry: Entry, filter: TaskDueFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'no_due_date') return entry.startAt == null;
  if (entry.startAt == null) return false;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfTomorrow = startOfToday + 86400000;

  if (filter === 'overdue') return entry.startAt < startOfToday && entry.status !== 'done';
  if (filter === 'today') return entry.startAt >= startOfToday && entry.startAt < startOfTomorrow;
  if (filter === 'upcoming') return entry.startAt >= startOfTomorrow;
  return true;
}

export function Tasks() {
  const { status, due, search, setStatus, setDue, setSearch } = useTaskFilterStore();
  const openForCreate = useEntryFormStore((s) => s.openForCreate);

  const entries = useLiveQuery(async () => {
    const all = await db.entries.where('type').anyOf(['task', 'errand']).toArray();
    return all;
  }, []);

  const filtered = (entries ?? [])
    .filter((e) => status === 'all' || e.status === status)
    .filter((e) => matchesDueFilter(e, due))
    .filter((e) => !search || e.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (a.startAt ?? Infinity) - (b.startAt ?? Infinity));

  return (
    <div>
      <div className="form-field">
        <input
          type="text"
          placeholder="Search tasks and errands…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="chip-row">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`chip${status === opt.value ? ' active' : ''}`}
            onClick={() => setStatus(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="chip-row">
        {DUE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`chip${due === opt.value ? ' active' : ''}`}
            onClick={() => setDue(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <p>No tasks or errands match.</p>
          <button type="button" className="btn btn-primary" onClick={() => openForCreate({ type: 'task' })}>
            Add a task
          </button>
        </div>
      ) : (
        <div className="entry-list">
          {filtered.map((entry) => (
            <EntryRow key={entry.id} entry={entry} showCheckbox onToggleDone={toggleEntryDone} />
          ))}
        </div>
      )}
    </div>
  );
}
