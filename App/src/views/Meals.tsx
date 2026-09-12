import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db';
import type { Entry, MealPayload, MealSlot } from '../data/db';
import { useEntryFormStore } from '../store/useEntryFormStore';
import { formatDateLabel } from '../components/entryMeta';

const SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];

function startOfWeek(offset: number): Date {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
  monday.setDate(monday.getDate() + offset * 7);
  return monday;
}

export function Meals() {
  const [weekOffset, setWeekOffset] = useState(0);
  const openForCreate = useEntryFormStore((s) => s.openForCreate);
  const openForEdit = useEntryFormStore((s) => s.openForEdit);

  const weekStart = startOfWeek(weekOffset);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const meals = useLiveQuery(async () => {
    return db.entries
      .where('type')
      .equals('meal')
      .and((e) => (e.startAt ?? 0) >= weekStart.getTime() && (e.startAt ?? 0) < weekEnd.getTime())
      .toArray();
  }, [weekStart.getTime()]);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  function mealFor(day: Date, slot: MealSlot): Entry | undefined {
    return (meals ?? []).find((m) => {
      if (m.startAt == null) return false;
      const mDate = new Date(m.startAt);
      const sameDay =
        mDate.getFullYear() === day.getFullYear() &&
        mDate.getMonth() === day.getMonth() &&
        mDate.getDate() === day.getDate();
      return sameDay && (m.payload as MealPayload | undefined)?.mealSlot === slot;
    });
  }

  return (
    <div>
      <div className="range-nav">
        <button type="button" className="icon-button" onClick={() => setWeekOffset((w) => w - 1)}>
          ‹
        </button>
        <div>
          <div className="range-label">
            {weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} –{' '}
            {new Date(weekEnd.getTime() - 86400000).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </div>
          <button type="button" className="link-btn" onClick={() => setWeekOffset(0)}>
            This week
          </button>
        </div>
        <button type="button" className="icon-button" onClick={() => setWeekOffset((w) => w + 1)}>
          ›
        </button>
      </div>

      <div className="meal-grid">
        {days.map((day) => (
          <div className="meal-day-card" key={day.toISOString()}>
            <div className="meal-day-title">{formatDateLabel(day.getTime())}</div>
            {SLOTS.map((slot) => {
              const meal = mealFor(day, slot);
              return (
                <div
                  className="meal-slot-row"
                  key={slot}
                  onClick={() =>
                    meal
                      ? openForEdit(meal.id)
                      : openForCreate({ type: 'meal', startAt: day.getTime() })
                  }
                >
                  <span className="meal-slot-label">{slot}</span>
                  <span className="meal-slot-title">
                    {meal ? meal.title : <span className="text-muted">+ Add</span>}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
