import { create } from 'zustand';
import type { EntryStatus } from '../data/db';

export type TaskStatusFilter = EntryStatus | 'all';
export type TaskDueFilter = 'all' | 'overdue' | 'today' | 'upcoming' | 'no_due_date';

interface TaskFilterState {
  status: TaskStatusFilter;
  due: TaskDueFilter;
  search: string;
  setStatus: (status: TaskStatusFilter) => void;
  setDue: (due: TaskDueFilter) => void;
  setSearch: (search: string) => void;
  reset: () => void;
}

export const useTaskFilterStore = create<TaskFilterState>((set) => ({
  status: 'pending',
  due: 'all',
  search: '',
  setStatus: (status) => set({ status }),
  setDue: (due) => set({ due }),
  setSearch: (search) => set({ search }),
  reset: () => set({ status: 'pending', due: 'all', search: '' }),
}));
