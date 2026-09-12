import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db';
import type { Entry, ShoppingItemPayload } from '../data/db';
import { toggleEntryDone } from '../components/EntryFormModal';
import { useEntryFormStore } from '../store/useEntryFormStore';

function listNameOf(entry: Entry): string {
  return (entry.payload as ShoppingItemPayload | undefined)?.listName || 'Groceries';
}

export function Shopping() {
  const openForCreate = useEntryFormStore((s) => s.openForCreate);
  const openForEdit = useEntryFormStore((s) => s.openForEdit);

  const items = useLiveQuery(
    () => db.entries.where('type').equals('shopping_item').toArray(),
    [],
  );

  const grouped = new Map<string, Entry[]>();
  for (const item of items ?? []) {
    const list = grouped.get(listNameOf(item)) ?? [];
    list.push(item);
    grouped.set(listNameOf(item), list);
  }
  for (const list of grouped.values()) {
    list.sort((a, b) => Number(a.status === 'done') - Number(b.status === 'done'));
  }

  const sortedLists = [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div>
      {sortedLists.length === 0 ? (
        <div className="empty-state">
          <p>Your shopping lists are empty.</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => openForCreate({ type: 'shopping_item' })}
          >
            Add an item
          </button>
        </div>
      ) : (
        sortedLists.map(([listName, listItems]) => (
          <div key={listName}>
            <div className="section-title">
              {listName} · {listItems.filter((i) => i.status !== 'done').length} left
            </div>
            <div className="entry-list">
              {listItems.map((item) => {
                const payload = item.payload as ShoppingItemPayload | undefined;
                return (
                  <div
                    key={item.id}
                    className="entry-row"
                    onClick={() => openForEdit(item.id)}
                  >
                    <button
                      type="button"
                      className={`checkbox${item.status === 'done' ? ' checked' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleEntryDone(item);
                      }}
                      aria-label={item.status === 'done' ? 'Mark as not bought' : 'Mark as bought'}
                    >
                      {item.status === 'done' ? '✓' : ''}
                    </button>
                    <div className="entry-row-body">
                      <div className={`entry-row-title${item.status === 'done' ? ' done' : ''}`}>
                        {item.title}
                      </div>
                      {payload?.quantity && <div className="entry-row-meta">{payload.quantity}</div>}
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
