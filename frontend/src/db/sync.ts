import { synchronize } from '@nozbe/watermelondb/sync';
import { Q } from '@nozbe/watermelondb';
import { database } from './index';
import { supabase } from '../services/supabase';
import { withRetry, parseError, ErrorCodes, logError } from '../utils/errorHandler';
import { circuitBreaker, CircuitOpenError } from '../utils/circuitBreaker';
import { v4 as uuid } from 'uuid';

// B4: Correlation ID header name
const CORRELATION_ID_HEADER = 'X-Correlation-ID';

/**
 * B4: Generate correlation ID for request tracing
 */
function generateCorrelationId(): string {
  return uuid();
}

/**
 * B9: Check backend health before sync (optional)
 * 
 * Returns true if backend is healthy (200 response), false otherwise.
 * Can be called before sync to avoid unnecessary requests when backend is down.
 * 
 * @returns Promise<boolean> - true if healthy, false if degraded/unavailable
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('health', {
      method: 'POST',
    });

    if (error) {
      logError(error, 'health_check');
      return false;
    }

    // Check if status is "ok"
    return data?.status === 'ok';
  } catch (error) {
    logError(error, 'health_check');
    return false;
  }
}

// A4: Table tiers for optimized sync
// CRITICAL: Always sync (core workout data, user settings)
const CRITICAL_TABLES = [
  'workouts',
  'workout_sets',
  'routines',
  'routine_exercises',
  'user_settings',
  'user_entitlements',
  'users',
  'exercises',
  'equipment_bases',
];

// BACKGROUND: Sync every 5 min or on-demand (gamification, social)
const BACKGROUND_TABLES = [
  'user_levels',
  'user_badges',
  'user_xp_logs',
  'notifications',
  'social_posts',
  'follows',
  'user_blocks',
  'post_reactions',
  'challenges',
  'challenge_participants',
  'leaderboards',
  'leaderboard_entries',
  'workout_partners',
  'workout_partner_invitations',
  'feature_flags', // B10: Feature flags (read-only, pull-only)
];

// ON_DEMAND: Sync when feature opened (programs, body tracking, etc.)
const ON_DEMAND_TABLES = [
  'beginner_programs',
  'beginner_program_days',
  'user_program_enrollments',
  'user_program_day_progress',
  'advanced_programs',
  'advanced_program_days',
  'user_advanced_program_enrollments',
  'user_training_maxes',
  'achievements',
  'user_body_logs',
  'push_devices',
  'user_activity_weeks',
  'user_streak_logs',
];

// All tables (for full sync)
const ALL_TABLES = [
  ...CRITICAL_TABLES,
  ...BACKGROUND_TABLES,
  ...ON_DEMAND_TABLES,
];

// Legacy: Keep SYNC_TABLES for backward compatibility (deprecated, use tiered functions)
const SYNC_TABLES = ALL_TABLES;

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

// A4: Sync options for tiered sync functions
export interface SyncOptions {
  idempotencyKey?: string;
}

/**
 * Pull changes from server
 * A4: Accepts table list for tiered sync
 */
async function pullChanges({ 
  lastPulledAt, 
  correlationId, 
  tables = ALL_TABLES 
}: { 
  lastPulledAt: number | null; 
  correlationId?: string;
  tables?: string[];
}): Promise<SyncPullResponse> {
  const { data, error } = await supabase.functions.invoke('sync-pull', {
    body: {
      lastPulledAt,
      tables,
    },
    // B4: Pass correlation ID as header
    ...(correlationId && { headers: { [CORRELATION_ID_HEADER]: correlationId } }),
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
async function pushChanges({ changes, lastPulledAt, idempotencyKey, correlationId }: SyncPushPayload & { correlationId?: string }): Promise<void> {
  const { error } = await supabase.functions.invoke('sync-push', {
    body: {
      changes,
      lastPulledAt,
      ...(idempotencyKey && { idempotencyKey }), // A6: Include idempotency key if provided
    },
    // B4: Pass correlation ID as header
    ...(correlationId && { headers: { [CORRELATION_ID_HEADER]: correlationId } }),
  });

  if (error) {
    logError(error, 'sync_push');
    throw error;
  }
}

/**
 * A4: Sync critical tables (workouts, sets, routines, settings)
 * Used for immediate sync after workout completion
 */
export async function syncCritical(options?: SyncOptions): Promise<void> {
  return syncTables(CRITICAL_TABLES, options);
}

/**
 * A4: Sync background tables (gamification, social)
 * Used for periodic background sync (every 5 min)
 */
export async function syncBackground(options?: SyncOptions): Promise<void> {
  return syncTables(BACKGROUND_TABLES, options);
}

/**
 * A4: Sync on-demand tables (programs, body tracking)
 * Called when user opens specific features
 */
export async function syncOnDemand(tables: string[], options?: SyncOptions): Promise<void> {
  // Validate tables are in ON_DEMAND_TABLES
  const invalidTables = tables.filter(t => !ON_DEMAND_TABLES.includes(t));
  if (invalidTables.length > 0) {
    throw new Error(`Invalid on-demand tables: ${invalidTables.join(', ')}`);
  }
  return syncTables(tables, options);
}

/**
 * A4: Sync all tables (full sync)
 * Used for pull-to-refresh or initial sync
 */
export async function syncAll(options?: SyncOptions): Promise<void> {
  return syncTables(ALL_TABLES, options);
}

/**
 * A4: Internal helper to sync specific tables
 */
async function syncTables(tables: string[], options?: SyncOptions): Promise<void> {
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
    // B4: Generate correlation ID for this sync operation
    const correlationId = generateCorrelationId();
    
    // A6: Capture idempotencyKey from options
    const idempotencyKey = options?.idempotencyKey;

    await withRetry(
      async () => {
        await synchronize({
          database,
          pullChanges: async ({ lastPulledAt }) => {
            const lastPulled: number | null = lastPulledAt !== undefined ? lastPulledAt : null;
            // A4: Pass table list to pullChanges
            const response = await pullChanges({ 
              lastPulledAt: lastPulled, 
              correlationId,
              tables 
            });
            return {
              changes: response.changes,
              timestamp: response.timestamp !== undefined ? response.timestamp : Date.now(),
            };
          },
          pushChanges: async ({ changes, lastPulledAt }) => {
            // A6: Pass idempotencyKey via closure
            // B4: Pass correlation ID to pushChanges
            await pushChanges({ changes, lastPulledAt, idempotencyKey, correlationId });
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
    if (!(error instanceof CircuitOpenError)) {
      circuitBreaker.recordFailure();
    }

    const appError = parseError(error);
    logError(appError, 'sync_database');
    throw appError;
  }
}

/**
 * Main sync function (backward compatibility)
 * A4: Now calls syncAll() - use syncCritical(), syncBackground(), or syncOnDemand() for better performance
 * 
 * @deprecated Use syncCritical(), syncBackground(), syncOnDemand(), or syncAll() instead
 * @param options - Optional sync options
 * @param options.idempotencyKey - Optional idempotency key for deduplicating duplicate requests (A6)
 */
export async function syncDatabase(options?: SyncOptions): Promise<void> {
  // A4: Default to syncAll for backward compatibility
  return syncAll(options);
}

/**
 * Check if we have pending local changes
 * 
 * A5: Optimized to use fetchCount() instead of fetching all records.
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

    // A5: Use fetchCount() with indexed query instead of fetching all records
    // Short-circuit on first table with unsynced records
    for (const tableName of syncableTables) {
      const collection = database.collections.get(tableName);
      
      // Check for records without server_id (newly created, not yet synced)
      // WatermelonDB: server_id is null or empty string for local-only records
      // Use Q.or to check both null and empty string cases
      const count = await collection
        .query(
          Q.where('deleted_at', null), // Exclude soft-deleted records
          Q.or(
            Q.where('server_id', null),
            Q.where('server_id', '')
          )
        )
        .fetchCount();
      
      if (count > 0) {
        return true; // Found unsynced record
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
