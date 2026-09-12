import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEntryFormStore } from '../store/useEntryFormStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { db } from '../data/db';
import type {
  Entry,
  EntryStatus,
  EntryType,
  MealSlot,
} from '../data/db';
import {
  createEntry,
  deleteEntry,
  getEntry,
  updateEntry,
} from '../data/repositories/entries';
import { ALL_ENTRY_TYPES, ENTRY_TYPE_META } from './entryMeta';
import { buildRecurrenceRule, describeRecurrence } from '../domain/recurrence';
import { downloadIcsForEntries } from '../domain/calendarExport';

type RecurrenceFreq = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

interface FormState {
  type: EntryType;
  title: string;
  hasDate: boolean;
  allDay: boolean;
  startDate: string; // yyyy-mm-dd
  startTime: string; // HH:mm
  hasEndTime: boolean;
  endTime: string;
  status: EntryStatus;
  category: string;
  tags: string;
  notes: string;
  exportToCalendar: boolean;
  recurrenceFreq: RecurrenceFreq;
  recurrenceInterval: number;
  // payload fields (superset, only relevant ones read per type)
  priority: 'low' | 'med' | 'high';
  location: string;
  subject: string;
  course: string;
  provider: string;
  mealSlot: MealSlot;
  recipeUrl: string;
  prepStartOffsetMin: string;
  quantity: string;
  listName: string;
  checked: boolean;
  origin: string;
  destination: string;
  confirmationCode: string;
  ingredientsDraft: string;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function msToDateInput(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function msToTimeInput(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function combineDateTime(dateStr: string, timeStr: string): number | undefined {
  if (!dateStr) return undefined;
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!timeStr) return new Date(y, m - 1, d).getTime();
  const [h, min] = timeStr.split(':').map(Number);
  return new Date(y, m - 1, d, h, min).getTime();
}

function todayDateInput(): string {
  return msToDateInput(Date.now());
}

function emptyForm(type: EntryType, presetStartAt: number | undefined, exportDefault: boolean): FormState {
  const now = presetStartAt ?? Date.now();
  return {
    type,
    title: '',
    hasDate: type !== 'shopping_item',
    allDay: type === 'assignment',
    startDate: msToDateInput(now),
    startTime: msToTimeInput(now),
    hasEndTime: false,
    endTime: msToTimeInput(now),
    status: 'pending',
    category: '',
    tags: '',
    notes: '',
    exportToCalendar: exportDefault,
    recurrenceFreq: 'NONE',
    recurrenceInterval: 1,
    priority: 'med',
    location: '',
    subject: '',
    course: '',
    provider: '',
    mealSlot: 'dinner',
    recipeUrl: '',
    prepStartOffsetMin: '',
    quantity: '',
    listName: 'Groceries',
    checked: false,
    origin: '',
    destination: '',
    confirmationCode: '',
    ingredientsDraft: '',
  };
}

function formStateFromEntry(entry: Entry): FormState {
  const payload = (entry.payload ?? {}) as Record<string, unknown>;
  return {
    type: entry.type,
    title: entry.title,
    hasDate: entry.startAt != null,
    allDay: entry.allDay,
    startDate: entry.startAt != null ? msToDateInput(entry.startAt) : todayDateInput(),
    startTime: entry.startAt != null ? msToTimeInput(entry.startAt) : '09:00',
    hasEndTime: entry.endAt != null,
    endTime: entry.endAt != null ? msToTimeInput(entry.endAt) : '10:00',
    status: entry.status,
    category: entry.category ?? '',
    tags: entry.tags?.join(', ') ?? '',
    notes: entry.notes ?? '',
    exportToCalendar: entry.exportToCalendar,
    recurrenceFreq: 'NONE',
    recurrenceInterval: 1,
    priority: (payload.priority as FormState['priority']) ?? 'med',
    location: (payload.location as string) ?? '',
    subject: (payload.subject as string) ?? '',
    course: (payload.course as string) ?? '',
    provider: (payload.provider as string) ?? '',
    mealSlot: (payload.mealSlot as MealSlot) ?? 'dinner',
    recipeUrl: (payload.recipeUrl as string) ?? '',
    prepStartOffsetMin:
      payload.prepStartOffsetMin != null ? String(payload.prepStartOffsetMin) : '',
    quantity: (payload.quantity as string) ?? '',
    listName: (payload.listName as string) ?? 'Groceries',
    checked: Boolean(payload.checked),
    origin: (payload.origin as string) ?? '',
    destination: (payload.destination as string) ?? '',
    confirmationCode: (payload.confirmationCode as string) ?? '',
    ingredientsDraft: '',
  };
}

function buildPayload(form: FormState): Entry['payload'] {
  switch (form.type) {
    case 'task':
      return { priority: form.priority };
    case 'work_shift':
      return { location: form.location || undefined };
    case 'assignment':
      return { subject: form.subject || undefined, course: form.course || undefined };
    case 'appointment':
      return { location: form.location || undefined, provider: form.provider || undefined };
    case 'meal':
      return {
        mealSlot: form.mealSlot,
        recipeUrl: form.recipeUrl || undefined,
        prepStartOffsetMin: form.prepStartOffsetMin ? Number(form.prepStartOffsetMin) : undefined,
      };
    case 'shopping_item':
      return { quantity: form.quantity || undefined, listName: form.listName, checked: form.checked };
    case 'errand':
      return { location: form.location || undefined };
    case 'travel':
      return {
        origin: form.origin || undefined,
        destination: form.destination || undefined,
        confirmationCode: form.confirmationCode || undefined,
      };
    default:
      return undefined;
  }
}

export function EntryFormModal() {
  const isOpen = useEntryFormStore((s) => s.isOpen);
  const editingEntryId = useEntryFormStore((s) => s.editingEntryId);
  const presetType = useEntryFormStore((s) => s.presetType);
  const presetStartAt = useEntryFormStore((s) => s.presetStartAt);
  const close = useEntryFormStore((s) => s.close);
  const exportDefaults = useSettingsStore((s) => s.exportDefaults);

  const editingEntry = useLiveQuery(
    () => (editingEntryId ? db.entries.get(editingEntryId) : undefined),
    [editingEntryId],
  );

  const [pickedType, setPickedType] = useState<EntryType | null>(presetType ?? null);
  const [form, setForm] = useState<FormState | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setForm(null);
      setPickedType(null);
      return;
    }
    if (editingEntryId) {
      if (editingEntry) setForm(formStateFromEntry(editingEntry));
    } else {
      const type = presetType ?? pickedType;
      if (type) {
        setForm(emptyForm(type, presetStartAt, exportDefaults[type]));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingEntryId, editingEntry, presetType]);

  const linkedShoppingItems = useLiveQuery(async () => {
    if (!editingEntryId) return [];
    return db.entries
      .filter((e) => e.type === 'shopping_item' && (e.linkedEntryIds?.includes(editingEntryId) ?? false))
      .toArray();
  }, [editingEntryId]);

  const recurrencePreview = useMemo(() => {
    if (!form || form.recurrenceFreq === 'NONE' || !form.hasDate) return null;
    const startAt = combineDateTime(form.startDate, form.allDay ? '' : form.startTime);
    if (startAt == null) return null;
    const rule = buildRecurrenceRule(new Date(startAt), {
      freq: form.recurrenceFreq,
      interval: form.recurrenceInterval,
    });
    return describeRecurrence(rule, startAt);
  }, [form]);

  if (!isOpen) return null;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleTypePick(type: EntryType) {
    setPickedType(type);
    setForm(emptyForm(type, presetStartAt, exportDefaults[type]));
  }

  function buildEntryFromForm(f: FormState): Omit<Entry, 'id' | 'createdAt' | 'updatedAt'> {
    const startAt = f.hasDate
      ? combineDateTime(f.startDate, f.allDay ? '' : f.startTime)
      : undefined;
    const endAt =
      f.hasDate && !f.allDay && f.hasEndTime ? combineDateTime(f.startDate, f.endTime) : undefined;

    const recurrenceRule =
      f.recurrenceFreq !== 'NONE' && startAt != null
        ? buildRecurrenceRule(new Date(startAt), {
            freq: f.recurrenceFreq,
            interval: f.recurrenceInterval,
          })
        : undefined;

    return {
      type: f.type,
      title: f.title.trim() || ENTRY_TYPE_META[f.type].label,
      startAt,
      endAt,
      allDay: f.allDay,
      recurrenceRule,
      category: f.category.trim() || undefined,
      tags: f.tags ? f.tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      status: f.status,
      notes: f.notes.trim() || undefined,
      exportToCalendar: f.exportToCalendar,
      payload: buildPayload(f),
    };
  }

  async function handleSave() {
    if (!form) return;
    const base = buildEntryFromForm(form);
    if (editingEntryId) {
      await updateEntry(editingEntryId, base);
    } else {
      await createEntry(base);
    }
    close();
  }

  async function handleExportSingle() {
    if (!form) return;
    const base = buildEntryFromForm(form);
    // Persist first so the exported entry reflects unsaved edits, and so it
    // has a stable id/timestamps for the .ics UID.
    const saved = editingEntryId
      ? await updateEntry(editingEntryId, base)
      : await createEntry(base);
    if (!saved) return;
    if (saved.startAt == null) return;
    downloadIcsForEntries([saved]);
    if (!editingEntryId) {
      // was a create — switch the form into "editing" mode by closing;
      // the entry now exists and can be reopened from its list.
      close();
    }
  }

  async function handleDelete() {
    if (!editingEntryId) return;
    if (!window.confirm('Delete this entry? This cannot be undone.')) return;
    await deleteEntry(editingEntryId);
    close();
  }

  async function handleAddIngredients() {
    if (!form || !editingEntryId) return;
    const lines = form.ingredientsDraft
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    for (const line of lines) {
      await createEntry({
        type: 'shopping_item',
        title: line,
        allDay: true,
        status: 'pending',
        exportToCalendar: false,
        linkedEntryIds: [editingEntryId],
        payload: { listName: 'Groceries', checked: false },
      });
    }
    update('ingredientsDraft', '');
  }

  const showTypePicker = !editingEntryId && !presetType && !pickedType;

  return (
    <div className="modal-backdrop" onClick={close}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{editingEntryId ? 'Edit entry' : 'New entry'}</h2>
          <button type="button" className="icon-button" onClick={close} aria-label="Close">
            ✕
          </button>
        </div>

        {showTypePicker && (
          <div className="type-grid">
            {ALL_ENTRY_TYPES.map((type) => (
              <button key={type} type="button" onClick={() => handleTypePick(type)}>
                <span>{ENTRY_TYPE_META[type].icon}</span>
                <span>{ENTRY_TYPE_META[type].label}</span>
              </button>
            ))}
          </div>
        )}

        {form && (
          <>
            {!editingEntryId && (
              <div className="form-field">
                <label>Type</label>
                <select
                  value={form.type}
                  onChange={(e) => {
                    const type = e.target.value as EntryType;
                    setPickedType(type);
                    setForm(emptyForm(type, presetStartAt, exportDefaults[type]));
                  }}
                >
                  {ALL_ENTRY_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {ENTRY_TYPE_META[type].label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-field">
              <label>Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
                placeholder={ENTRY_TYPE_META[form.type].label}
                autoFocus
              />
            </div>

            <div className="form-field checkbox-field">
              <input
                type="checkbox"
                id="hasDate"
                checked={form.hasDate}
                onChange={(e) => update('hasDate', e.target.checked)}
              />
              <label htmlFor="hasDate">Has a date</label>
            </div>

            {form.hasDate && (
              <>
                <div className="form-row">
                  <div className="form-field">
                    <label>Date</label>
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => update('startDate', e.target.value)}
                    />
                  </div>
                  {!form.allDay && (
                    <div className="form-field">
                      <label>Time</label>
                      <input
                        type="time"
                        value={form.startTime}
                        onChange={(e) => update('startTime', e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div className="form-field checkbox-field">
                  <input
                    type="checkbox"
                    id="allDay"
                    checked={form.allDay}
                    onChange={(e) => update('allDay', e.target.checked)}
                  />
                  <label htmlFor="allDay">All day</label>
                </div>

                {!form.allDay && (
                  <div className="form-field checkbox-field">
                    <input
                      type="checkbox"
                      id="hasEndTime"
                      checked={form.hasEndTime}
                      onChange={(e) => update('hasEndTime', e.target.checked)}
                    />
                    <label htmlFor="hasEndTime">Add end time</label>
                  </div>
                )}
                {!form.allDay && form.hasEndTime && (
                  <div className="form-field">
                    <label>End time</label>
                    <input
                      type="time"
                      value={form.endTime}
                      onChange={(e) => update('endTime', e.target.value)}
                    />
                  </div>
                )}

                <div className="form-field">
                  <label>Repeats</label>
                  <select
                    value={form.recurrenceFreq}
                    onChange={(e) => update('recurrenceFreq', e.target.value as RecurrenceFreq)}
                  >
                    <option value="NONE">Does not repeat</option>
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                  {recurrencePreview && (
                    <span className="text-muted">{recurrencePreview}</span>
                  )}
                </div>
              </>
            )}

            {/* Type-specific fields */}
            {form.type === 'task' && (
              <div className="form-field">
                <label>Priority</label>
                <select value={form.priority} onChange={(e) => update('priority', e.target.value as FormState['priority'])}>
                  <option value="low">Low</option>
                  <option value="med">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            )}

            {(form.type === 'work_shift' || form.type === 'errand') && (
              <div className="form-field">
                <label>Location</label>
                <input type="text" value={form.location} onChange={(e) => update('location', e.target.value)} />
              </div>
            )}

            {form.type === 'assignment' && (
              <div className="form-row">
                <div className="form-field">
                  <label>Subject</label>
                  <input type="text" value={form.subject} onChange={(e) => update('subject', e.target.value)} />
                </div>
                <div className="form-field">
                  <label>Course</label>
                  <input type="text" value={form.course} onChange={(e) => update('course', e.target.value)} />
                </div>
              </div>
            )}

            {form.type === 'appointment' && (
              <div className="form-row">
                <div className="form-field">
                  <label>Location</label>
                  <input type="text" value={form.location} onChange={(e) => update('location', e.target.value)} />
                </div>
                <div className="form-field">
                  <label>Provider</label>
                  <input type="text" value={form.provider} onChange={(e) => update('provider', e.target.value)} />
                </div>
              </div>
            )}

            {form.type === 'meal' && (
              <>
                <div className="form-field">
                  <label>Meal slot</label>
                  <select value={form.mealSlot} onChange={(e) => update('mealSlot', e.target.value as MealSlot)}>
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                    <option value="snack">Snack</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>Recipe URL</label>
                  <input type="url" value={form.recipeUrl} onChange={(e) => update('recipeUrl', e.target.value)} />
                </div>
                <div className="form-field">
                  <label>Prep reminder (minutes before)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.prepStartOffsetMin}
                    onChange={(e) => update('prepStartOffsetMin', e.target.value)}
                    placeholder="e.g. 30"
                  />
                </div>
                {editingEntryId && (
                  <div className="form-field">
                    <label>Add ingredients to shopping list</label>
                    <textarea
                      value={form.ingredientsDraft}
                      onChange={(e) => update('ingredientsDraft', e.target.value)}
                      placeholder={'One ingredient per line'}
                    />
                    <button type="button" className="btn btn-block" onClick={handleAddIngredients}>
                      Add to shopping list
                    </button>
                    {linkedShoppingItems && linkedShoppingItems.length > 0 && (
                      <div className="text-muted">
                        Linked shopping items: {linkedShoppingItems.map((i) => i.title).join(', ')}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {form.type === 'shopping_item' && (
              <>
                <div className="form-row">
                  <div className="form-field">
                    <label>List name</label>
                    <input type="text" value={form.listName} onChange={(e) => update('listName', e.target.value)} />
                  </div>
                  <div className="form-field">
                    <label>Quantity</label>
                    <input type="text" value={form.quantity} onChange={(e) => update('quantity', e.target.value)} />
                  </div>
                </div>
                <div className="form-field checkbox-field">
                  <input
                    type="checkbox"
                    id="checked"
                    checked={form.checked}
                    onChange={(e) => update('checked', e.target.checked)}
                  />
                  <label htmlFor="checked">Already in cart</label>
                </div>
              </>
            )}

            {form.type === 'travel' && (
              <>
                <div className="form-row">
                  <div className="form-field">
                    <label>Origin</label>
                    <input type="text" value={form.origin} onChange={(e) => update('origin', e.target.value)} />
                  </div>
                  <div className="form-field">
                    <label>Destination</label>
                    <input type="text" value={form.destination} onChange={(e) => update('destination', e.target.value)} />
                  </div>
                </div>
                <div className="form-field">
                  <label>Confirmation code</label>
                  <input
                    type="text"
                    value={form.confirmationCode}
                    onChange={(e) => update('confirmationCode', e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="form-field">
              <label>Category</label>
              <input type="text" value={form.category} onChange={(e) => update('category', e.target.value)} />
            </div>

            <div className="form-field">
              <label>Tags (comma separated)</label>
              <input type="text" value={form.tags} onChange={(e) => update('tags', e.target.value)} />
            </div>

            <div className="form-field">
              <label>Notes</label>
              <textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} />
            </div>

            {editingEntryId && (
              <div className="form-field">
                <label>Status</label>
                <select value={form.status} onChange={(e) => update('status', e.target.value as EntryStatus)}>
                  <option value="pending">Pending</option>
                  <option value="done">Done</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            )}

            {form.hasDate && (
              <>
                <div className="settings-row">
                  <span>Include in calendar export</span>
                  <button
                    type="button"
                    className={`toggle${form.exportToCalendar ? ' on' : ''}`}
                    onClick={() => update('exportToCalendar', !form.exportToCalendar)}
                    aria-label="Toggle calendar export"
                  />
                </div>
                <button type="button" className="btn btn-block" onClick={handleExportSingle}>
                  Save & export this entry (.ics)
                </button>
              </>
            )}

            <div className="btn-row">
              {editingEntryId && (
                <button type="button" className="btn btn-danger" onClick={handleDelete}>
                  Delete
                </button>
              )}
              <button type="button" className="btn btn-primary" onClick={handleSave}>
                Save
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export async function toggleEntryDone(entry: Entry): Promise<void> {
  const fresh = await getEntry(entry.id);
  if (!fresh) return;
  await updateEntry(entry.id, { status: fresh.status === 'done' ? 'pending' : 'done' });
}
