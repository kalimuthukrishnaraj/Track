import Dexie, { type Table } from 'dexie';

export type EntryType =
  | 'task'
  | 'work_shift'
  | 'assignment'
  | 'appointment'
  | 'meal'
  | 'shopping_item'
  | 'errand'
  | 'travel';

export type EntryStatus = 'pending' | 'done' | 'cancelled';

export interface TaskPayload {
  priority?: 'low' | 'med' | 'high';
}

export interface WorkShiftPayload {
  location?: string;
}

export interface AssignmentPayload {
  subject?: string;
  course?: string;
}

export interface AppointmentPayload {
  location?: string;
  provider?: string;
}

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealPayload {
  mealSlot: MealSlot;
  recipeUrl?: string;
  prepStartOffsetMin?: number;
}

export interface ShoppingItemPayload {
  quantity?: string;
  listName: string;
  checked: boolean;
}

export interface ErrandPayload {
  location?: string;
}

export interface TravelPayload {
  origin?: string;
  destination?: string;
  confirmationCode?: string;
}

export type EntryPayload =
  | TaskPayload
  | WorkShiftPayload
  | AssignmentPayload
  | AppointmentPayload
  | MealPayload
  | ShoppingItemPayload
  | ErrandPayload
  | TravelPayload
  | Record<string, unknown>;

export interface Entry {
  id: string; // uuid v4
  type: EntryType;
  title: string;
  startAt?: number; // unix ms, UTC
  endAt?: number; // unix ms, UTC
  allDay: boolean;
  recurrenceRule?: string; // RFC5545 RRULE string
  category?: string;
  tags?: string[];
  status: EntryStatus;
  notes?: string;
  linkedEntryIds?: string[];
  payload?: EntryPayload;
  exportToCalendar: boolean; // whether this entry is included in .ics export
  createdAt: number;
  updatedAt: number;
}

export class TrackDB extends Dexie {
  entries!: Table<Entry, string>;

  constructor() {
    super('track');
    this.version(1).stores({
      entries: 'id, type, startAt, status',
    });
  }
}

export const db = new TrackDB();
