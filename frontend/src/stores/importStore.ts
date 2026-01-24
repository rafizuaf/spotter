/**
 * Phase 2D: Background import state.
 */

import { create } from 'zustand';
import { commitImport } from '../services/importers';
import { syncDatabase } from '../db/sync';
import type { ParsedWorkout, ImportResult } from '../services/importers';

interface ImportState {
  isImporting: boolean;
  lastImportResult: ImportResult | null;
  lastImportError: string | null;

  startBackgroundImport: (
    workouts: ParsedWorkout[],
    userId: string,
    createMissing: boolean
  ) => void;
  clearImportResult: () => void;
}

export const useImportStore = create<ImportState>((set) => ({
  isImporting: false,
  lastImportResult: null,
  lastImportError: null,

  startBackgroundImport: (workouts, userId, createMissing) => {
    set({
      isImporting: true,
      lastImportResult: null,
      lastImportError: null,
    });

    (async () => {
      try {
        const importResult = await commitImport(workouts, userId, createMissing);
        if (!importResult.success) {
          set({
            isImporting: false,
            lastImportError: importResult.errors.join(' ') || 'Import failed.',
          });
          return;
        }
        await syncDatabase();
        set({
          isImporting: false,
          lastImportResult: importResult,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        set({
          isImporting: false,
          lastImportError: msg,
        });
      }
    })();
  },

  clearImportResult: () => {
    set({ lastImportResult: null, lastImportError: null });
  },
}));
