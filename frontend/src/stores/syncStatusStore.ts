import { create } from 'zustand';

/**
 * B2: Sync status store for tracking background sync errors
 * Used by Optimistic UI to show "Saved locally; sync pending" messages
 */
interface SyncStatusState {
  lastError: string | null;
  setLastError: (error: string | null) => void;
  clearError: () => void;
}

export const useSyncStatusStore = create<SyncStatusState>((set) => ({
  lastError: null,
  setLastError: (error: string | null) => set({ lastError: error }),
  clearError: () => set({ lastError: null }),
}));
