import { create } from 'zustand';
import type { EntryType } from '../data/db';

interface EntryFormState {
  isOpen: boolean;
  /** Set when editing an existing entry; undefined when creating a new one. */
  editingEntryId?: string;
  /** Pre-selected type when creating a new entry (e.g. from a section's "Add" button). */
  presetType?: EntryType;
  /** Pre-selected start date (unix ms) when creating from a specific Agenda slot. */
  presetStartAt?: number;
  openForCreate: (options?: { type?: EntryType; startAt?: number }) => void;
  openForEdit: (entryId: string) => void;
  close: () => void;
}

export const useEntryFormStore = create<EntryFormState>((set) => ({
  isOpen: false,
  editingEntryId: undefined,
  presetType: undefined,
  presetStartAt: undefined,
  openForCreate: (options) =>
    set({
      isOpen: true,
      editingEntryId: undefined,
      presetType: options?.type,
      presetStartAt: options?.startAt,
    }),
  openForEdit: (entryId) =>
    set({ isOpen: true, editingEntryId: entryId, presetType: undefined, presetStartAt: undefined }),
  close: () =>
    set({ isOpen: false, editingEntryId: undefined, presetType: undefined, presetStartAt: undefined }),
}));
