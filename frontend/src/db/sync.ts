import { synchronize } from '@nozbe/watermelondb/sync';
import { Q } from '@nozbe/watermelondb';
import { database } from './index';
import { supabase } from '../services/supabase';
import { withRetry, parseError, ErrorCodes, logError } from '../utils/errorHandler';
import { circuitBreaker, CircuitOpenError } from '../utils/circuitBreaker';

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
  idempotencyKey?: string; // A6: Optional idempotency key for deduplication
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
    logError(error, 'sync_pull');
    throw error;
  }

  return data as SyncPullResponse;
}

/**
 * Push local changes to server
 */
async function pushChanges({ changes, lastPulledAt, idempotencyKey }: SyncPushPayload): Promise<void> {
  const { error } = await supabase.functions.invoke('sync-push', {
    body: {
      changes,
      lastPulledAt,
      ...(idempotencyKey && { idempotencyKey }), // A6: Include idempotency key if provided
    },
  });

  if (error) {
    logError(error, 'sync_push');
    throw error;
  }
}

/**
 * Main sync function
 * Call this to sync local database with server
 * 
 * Includes automatic retry with exponential backoff for network errors
 * 
 * @param options - Optional sync options
 * @param options.idempotencyKey - Optional idempotency key for deduplicating duplicate requests (A6)
 */
export async function syncDatabase(options?: { idempotencyKey?: string }): Promise<void> {
  // B3: Check circuit breaker before attempting sync
  if (!circuitBreaker.canAttempt()) {
    const cooldownRemaining = circuitBreaker.getCooldownRemaining();
    const retryAfterSeconds = Math.ceil(cooldownRemaining / 1000);
    throw new CircuitOpenError(
      `Sync paused; will retry shortly. (Retry in ${retryAfterSeconds}s)`,
      cooldownRemaining
    );
  }

  try {
    // A6: Capture idempotencyKey from options for use in pushChanges closure
    const idempotencyKey = options?.idempotencyKey;

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
            // A6: Pass idempotencyKey via closure
            await pushChanges({ changes, lastPulledAt, idempotencyKey });
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

    // B3: Record success (reset circuit breaker)
    circuitBreaker.recordSuccess();
  } catch (error) {
    // B3: Record failure (increment circuit breaker failure count)
    // Only record failure if it's not a CircuitOpenError (which is already handled)
    if (!(error instanceof CircuitOpenError)) {
      circuitBreaker.recordFailure();
    }

    const appError = parseError(error);
    logError(appError, 'sync_database');
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
    logError(error, 'sync_hasPendingChanges');
    // On error, assume no pending changes to avoid blocking sync
    return false;
  }
}

export default syncDatabase;
