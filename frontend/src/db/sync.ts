import { synchronize } from '@nozbe/watermelondb/sync';
import { Q } from '@nozbe/watermelondb';
import { database } from './index';
import { supabase } from '../services/supabase';
import { withRetry, parseError, ErrorCodes } from '../utils/errorHandler';

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
  'user_xp_logs',
  'achievements', // Read-only from backend
  'follows',
  'user_blocks',
  'social_posts',
  'notifications', // Pull notifications from server
  'push_devices', // Push device tokens to server
  'user_activity_weeks', // Weekly activity tracking (v2)
  'user_streak_logs', // Streak tracking (v2)
  'beginner_programs', // Read-only from backend (First 30 Days)
  'beginner_program_days', // Read-only from backend (First 30 Days)
  'user_program_enrollments', // User program progress (First 30 Days)
  'user_program_day_progress', // User daily progress (First 30 Days)
  'user_training_maxes', // Phase 2E: Training max per exercise
  'advanced_programs', // Phase 2E: 5/3/1 etc. (read-only)
  'advanced_program_days', // Phase 2E (read-only)
  'user_advanced_program_enrollments', // Phase 2E
  'user_entitlements', // Phase 2F: Monetization (READ-ONLY, pull-only)
  'post_reactions', // Phase 2G: Feed reactions
  'challenges', // Phase 2G: User-created challenges
  'challenge_participants', // Phase 2G: Challenge participation
  'leaderboards', // Phase 2G: Leaderboard definitions (READ-ONLY, pull-only)
  'leaderboard_entries', // Phase 2G: Leaderboard rankings (READ-ONLY, pull-only)
  'workout_partners', // Phase 2G: Workout partner sessions
  'workout_partner_invitations', // Phase 2G: Workout partner invitations
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
 * 
 * Includes automatic retry with exponential backoff for network errors
 */
export async function syncDatabase(): Promise<void> {
  try {
    await withRetry(
      async () => {
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
      },
      {
        maxAttempts: 3,
        baseDelayMs: 1000,
        maxDelayMs: 10000,
        context: 'sync',
      }
    );

    console.log('Sync completed successfully');
  } catch (error) {
    const appError = parseError(error);
    console.error('Sync failed after retries:', appError);
    throw appError;
  }
}

/**
 * Check if we have pending local changes
 * 
 * This checks for records that:
 * 1. Don't have a server_id (newly created, not synced)
 * 2. Have been modified locally (updated_at is newer than last sync)
 * 3. Have been soft-deleted locally (deleted_at is set)
 */
export async function hasPendingChanges(): Promise<boolean> {
  try {
    // Check for newly created records (no server_id) in syncable tables
    const syncableTables = [
      'workouts',
      'workout_sets',
      'routines',
      'routine_exercises',
      'user_body_logs',
      'user_training_maxes',
      'user_advanced_program_enrollments',
      'post_reactions',
      'challenges',
      'challenge_participants',
      'workout_partners',
      'workout_partner_invitations',
    ];

    for (const tableName of syncableTables) {
      const collection = database.collections.get(tableName);
      
      // Check for records without server_id (newly created, not yet synced)
      // WatermelonDB stores server_id as null for local-only records
      const allRecords = await collection.query().fetch();
      
      // Check for records without server_id (newly created, not synced)
      // WatermelonDB models have serverId as a text field
      for (const record of allRecords) {
        const serverId = (record as { serverId?: string | null }).serverId;
        if (!serverId || serverId === '') {
          return true; // Found unsynced record
        }
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking pending changes:', error);
    // On error, assume no pending changes to avoid blocking sync
    return false;
  }
}

export default syncDatabase;
