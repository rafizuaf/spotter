import { synchronize } from '@nozbe/watermelondb/sync';
import { database } from './index';
import { supabase } from '../services/supabase';

// Tables to sync
const SYNC_TABLES = [
  'users',
  'user_settings',
  'equipment_bases',
  'exercises',
  'routines',
  'routine_exercises',
  'workouts',
  'workout_sets',
  'user_body_logs',
  'user_levels',
  'user_badges',
];

interface SyncPullResponse {
  changes: Record<string, {
    created: unknown[];
    updated: unknown[];
    deleted: string[];
  }>;
  timestamp?: number;
}

interface SyncPushPayload {
  changes: Record<string, {
    created: unknown[];
    updated: unknown[];
    deleted: string[];
  }>;
  lastPulledAt: number | null;
}

/**
 * Pull changes from server
 */
async function pullChanges({ lastPulledAt }: { lastPulledAt: number | null }): Promise<SyncPullResponse> {
  const { data, error } = await supabase.functions.invoke('sync-pull', {
    body: {
      lastPulledAt,
      tables: SYNC_TABLES,
    },
  });

  if (error) {
    console.error('Sync pull error:', error);
    throw error;
  }

  return data as SyncPullResponse;
}

/**
 * Push local changes to server
 */
async function pushChanges({ changes, lastPulledAt }: SyncPushPayload): Promise<void> {
  const { error } = await supabase.functions.invoke('sync-push', {
    body: {
      changes,
      lastPulledAt,
    },
  });

  if (error) {
    console.error('Sync push error:', error);
    throw error;
  }
}

/**
 * Main sync function
 * Call this to sync local database with server
 */
export async function syncDatabase(): Promise<void> {
  try {
    await synchronize({
      database,
      pullChanges: async ({ lastPulledAt }) => {
        const lastPulled: number | null = lastPulledAt !== undefined ? lastPulledAt : null;
        const response = await pullChanges({ lastPulledAt: lastPulled });
        return {
          changes: response.changes,
          timestamp: response.timestamp !== undefined ? response.timestamp : Date.now(),
        };
      },
      pushChanges: async ({ changes, lastPulledAt }) => {
        await pushChanges({ changes, lastPulledAt });
      },
      migrationsEnabledAtVersion: 1,
    });

    console.log('Sync completed successfully');
  } catch (error) {
    console.error('Sync failed:', error);
    throw error;
  }
}

/**
 * Check if we have pending local changes
 */
export async function hasPendingChanges(): Promise<boolean> {
  // WatermelonDB tracks changes internally
  // This is a simplified check - in production you might want more granular control
  return false;
}

export default syncDatabase;
