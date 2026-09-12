import { create } from 'zustand';

export type AgendaViewMode = 'day' | 'week' | 'month';

interface AgendaState {
  viewMode: AgendaViewMode;
  anchorDate: number; // unix ms, start-of-day local
  setViewMode: (mode: AgendaViewMode) => void;
  goToToday: () => void;
  goToDate: (ms: number) => void;
  stepForward: () => void;
  stepBackward: () => void;
}

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function addByViewMode(ms: number, mode: AgendaViewMode, direction: 1 | -1): number {
  const d = new Date(ms);
  if (mode === 'day') d.setDate(d.getDate() + direction);
  else if (mode === 'week') d.setDate(d.getDate() + 7 * direction);
  else d.setMonth(d.getMonth() + direction);
  return startOfDay(d.getTime());
}

export const useAgendaStore = create<AgendaState>((set, get) => ({
  viewMode: 'week',
  anchorDate: startOfDay(Date.now()),
  setViewMode: (mode) => set({ viewMode: mode }),
  goToToday: () => set({ anchorDate: startOfDay(Date.now()) }),
  goToDate: (ms) => set({ anchorDate: startOfDay(ms) }),
  stepForward: () =>
    set({ anchorDate: addByViewMode(get().anchorDate, get().viewMode, 1) }),
  stepBackward: () =>
    set({ anchorDate: addByViewMode(get().anchorDate, get().viewMode, -1) }),
}));

/** Compute the [rangeStart, rangeEnd) covering the current view mode. */
export function getAgendaRange(anchorDate: number, mode: AgendaViewMode): [Date, Date] {
  const start = new Date(anchorDate);
  if (mode === 'day') {
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return [start, end];
  }
  if (mode === 'week') {
    // Week starts on the anchor's Monday.
    const day = start.getDay(); // 0=Sun..6=Sat
    const diffToMonday = (day + 6) % 7;
    const weekStart = new Date(start);
    weekStart.setDate(start.getDate() - diffToMonday);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    return [weekStart, weekEnd];
  }
  // month
  const monthStart = new Date(start.getFullYear(), start.getMonth(), 1);
  const monthEnd = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  return [monthStart, monthEnd];
}
