import { schemaMigrations, createTable } from '@nozbe/watermelondb/Schema/migrations';

export default schemaMigrations({
  migrations: [
    {
      toVersion: 5,
      steps: [
        createTable({
          name: 'user_training_maxes',
          columns: [
            { name: 'server_id', type: 'string', isIndexed: true },
            { name: 'user_id', type: 'string', isIndexed: true },
            { name: 'exercise_id', type: 'string', isIndexed: true },
            { name: 'training_max_kg', type: 'number' },
            { name: 'one_rep_max_kg', type: 'number', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
            { name: 'deleted_at', type: 'number', isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 6,
      steps: [
        createTable({
          name: 'advanced_programs',
          columns: [
            { name: 'server_id', type: 'string', isIndexed: true },
            { name: 'code', type: 'string', isIndexed: true },
            { name: 'title', type: 'string' },
            { name: 'description', type: 'string', isOptional: true },
            { name: 'duration_weeks', type: 'number' },
            { name: 'workouts_per_week', type: 'number' },
            { name: 'is_active', type: 'boolean' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
            { name: 'deleted_at', type: 'number', isOptional: true },
          ],
        }),
        createTable({
          name: 'advanced_program_days',
          columns: [
            { name: 'server_id', type: 'string', isIndexed: true },
            { name: 'program_id', type: 'string', isIndexed: true },
            { name: 'week_number', type: 'number' },
            { name: 'day_number', type: 'number' },
            { name: 'day_title', type: 'string' },
            { name: 'exercises', type: 'string' },
            { name: 'order_index', type: 'number', isIndexed: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
            { name: 'deleted_at', type: 'number', isOptional: true },
          ],
        }),
        createTable({
          name: 'user_advanced_program_enrollments',
          columns: [
            { name: 'server_id', type: 'string', isIndexed: true },
            { name: 'user_id', type: 'string', isIndexed: true },
            { name: 'program_id', type: 'string', isIndexed: true },
            { name: 'current_week', type: 'number' },
            { name: 'current_day', type: 'number' },
            { name: 'started_at', type: 'number' },
            { name: 'completed_at', type: 'number', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
            { name: 'deleted_at', type: 'number', isOptional: true },
          ],
        }),
      ],
    },
    {
      // Phase 2F: Monetization - User Entitlements
      // SECURITY: This table is READ-ONLY for users (pull-only, no push)
      toVersion: 7,
      steps: [
        createTable({
          name: 'user_entitlements',
          columns: [
            { name: 'server_id', type: 'string', isIndexed: true },
            { name: 'user_id', type: 'string', isIndexed: true },
            { name: 'tier', type: 'string' }, // 'FREE' | 'PRO' | 'ELITE'
            { name: 'is_trial', type: 'boolean' },
            { name: 'trial_ends_at', type: 'number', isOptional: true },
            { name: 'valid_until', type: 'number', isOptional: true },
            { name: 'source', type: 'string' }, // 'STRIPE' | 'REVENUECAT' | 'MANUAL_GIFT' | 'LIFETIME'
            { name: 'updated_at', type: 'number' },
          ],
        }),
      ],
    },
    {
      // Phase 2F Security: Remove legacy subscription fields from users table
      // These fields have been migrated to user_entitlements table (server-controlled, secure)
      // Note: WatermelonDB will ignore these columns automatically when they're removed from schema
      toVersion: 8,
      steps: [
        // No explicit steps needed - columns removed from schema definition
        // WatermelonDB will automatically ignore subscription_tier, is_trial_period, subscription_expires_at
        // when reading from the users table. The columns remain in SQLite but are unused.
      ],
    },
    {
      // Phase 2G: Social & Competition
      // Adds post reactions, challenges, and leaderboards
      toVersion: 9,
      steps: [
        createTable({
          name: 'post_reactions',
          columns: [
            { name: 'server_id', type: 'string', isIndexed: true },
            { name: 'social_post_id', type: 'string', isIndexed: true },
            { name: 'user_id', type: 'string', isIndexed: true },
            { name: 'reaction_type', type: 'string' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
            { name: 'deleted_at', type: 'number', isOptional: true },
          ],
        }),
        createTable({
          name: 'challenges',
          columns: [
            { name: 'server_id', type: 'string', isIndexed: true },
            { name: 'created_by_id', type: 'string', isIndexed: true },
            { name: 'title', type: 'string' },
            { name: 'description', type: 'string', isOptional: true },
            { name: 'challenge_type', type: 'string' },
            { name: 'target_value', type: 'number', isOptional: true },
            { name: 'start_date', type: 'number' },
            { name: 'end_date', type: 'number' },
            { name: 'status', type: 'string' },
            { name: 'visibility', type: 'string' },
            { name: 'max_participants', type: 'number' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
            { name: 'deleted_at', type: 'number', isOptional: true },
          ],
        }),
        createTable({
          name: 'challenge_participants',
          columns: [
            { name: 'server_id', type: 'string', isIndexed: true },
            { name: 'challenge_id', type: 'string', isIndexed: true },
            { name: 'user_id', type: 'string', isIndexed: true },
            { name: 'status', type: 'string' },
            { name: 'current_score', type: 'number' },
            { name: 'rank', type: 'number', isOptional: true },
            { name: 'joined_at', type: 'number' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
            { name: 'deleted_at', type: 'number', isOptional: true },
          ],
        }),
        createTable({
          name: 'leaderboards',
          columns: [
            { name: 'server_id', type: 'string', isIndexed: true },
            { name: 'code', type: 'string', isIndexed: true },
            { name: 'title', type: 'string' },
            { name: 'description', type: 'string', isOptional: true },
            { name: 'metric_type', type: 'string' },
            { name: 'time_period', type: 'string' },
            { name: 'is_active', type: 'boolean' },
            { name: 'display_order', type: 'number' },
            { name: 'icon_name', type: 'string' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        createTable({
          name: 'leaderboard_entries',
          columns: [
            { name: 'server_id', type: 'string', isIndexed: true },
            { name: 'leaderboard_id', type: 'string', isIndexed: true },
            { name: 'user_id', type: 'string', isIndexed: true },
            { name: 'rank', type: 'number' },
            { name: 'score', type: 'number' },
            { name: 'period_start', type: 'number' },
            { name: 'period_end', type: 'number' },
            { name: 'computed_at', type: 'number' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
      ],
    },
    {
      // Phase 2G: Workout Partners
      toVersion: 10,
      steps: [
        createTable({
          name: 'workout_partners',
          columns: [
            { name: 'server_id', type: 'string', isIndexed: true },
            { name: 'workout_id', type: 'string', isIndexed: true },
            { name: 'user_id', type: 'string', isIndexed: true },
            { name: 'partner_user_id', type: 'string', isIndexed: true },
            { name: 'status', type: 'string' },
            { name: 'joined_at', type: 'number' },
            { name: 'left_at', type: 'number', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
            { name: 'deleted_at', type: 'number', isOptional: true },
          ],
        }),
        createTable({
          name: 'workout_partner_invitations',
          columns: [
            { name: 'server_id', type: 'string', isIndexed: true },
            { name: 'workout_id', type: 'string', isIndexed: true },
            { name: 'inviter_user_id', type: 'string', isIndexed: true },
            { name: 'invitee_user_id', type: 'string', isIndexed: true },
            { name: 'status', type: 'string' },
            { name: 'expires_at', type: 'number' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
            { name: 'deleted_at', type: 'number', isOptional: true },
          ],
        }),
      ],
    },
  ],
});
