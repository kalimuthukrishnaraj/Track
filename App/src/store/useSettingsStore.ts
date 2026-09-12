import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { EntryType } from '../data/db';
import { EXPORT_DEFAULTS } from '../constants/exportDefaults';

interface SettingsState {
  /** Per-type default for whether newly created entries export to calendar. */
  exportDefaults: Record<EntryType, boolean>;
  setExportDefault: (type: EntryType, value: boolean) => void;
  resetExportDefaults: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      exportDefaults: { ...EXPORT_DEFAULTS },
      setExportDefault: (type, value) =>
        set((state) => ({
          exportDefaults: { ...state.exportDefaults, [type]: value },
        })),
      resetExportDefaults: () => set({ exportDefaults: { ...EXPORT_DEFAULTS } }),
    }),
    { name: 'track-settings' },
  ),
);
