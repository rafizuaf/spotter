import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 11, // Ranking badges & profile rankings (show_profile_rankings, prominent_rank, last_total_participants)
  tables: [
    // ============================================
    // Users & Settings
    // ============================================
    tableSchema({
      name: 'users',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'username', type: 'string' },
        { name: 'avatar_url', type: 'string', isOptional: true },
        { name: 'bio', type: 'string', isOptional: true },
        { name: 'website_link', type: 'string', isOptional: true },
        { name: 'account_status', type: 'string' },
        { name: 'terms_accepted_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
      ],
    }),

    tableSchema({
      name: 'user_settings',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'date_of_birth', type: 'number', isOptional: true },
        { name: 'gender', type: 'string', isOptional: true },
        { name: 'height_cm', type: 'number', isOptional: true },
        { name: 'weight_unit_preference', type: 'string' },
        { name: 'distance_unit_preference', type: 'string' },
        { name: 'theme_preference', type: 'string' },
        { name: 'keep_screen_awake', type: 'boolean' },
        { name: 'timer_auto_start', type: 'boolean' },
        { name: 'timer_vibration_enabled', type: 'boolean' },
        { name: 'timer_sound_enabled', type: 'boolean' },
        { name: 'input_mode_plate_math', type: 'boolean' },
        { name: 'default_rest_time_seconds', type: 'number', isOptional: true },
        { name: 'preferred_rpe_system', type: 'string' },
        { name: 'sync_to_health_kit', type: 'boolean' },
        { name: 'auto_play_music_service', type: 'string', isOptional: true },
        { name: 'active_injuries', type: 'string' }, // JSON string
        { name: 'default_workout_visibility', type: 'string' },
        { name: 'notification_preferences', type: 'string' }, // JSON string
        { name: 'equipment_overrides', type: 'string' }, // JSON string
        { name: 'onboarding_completed', type: 'boolean' },
        { name: 'onboarding_persona', type: 'string', isOptional: true },
        { name: 'workout_mode', type: 'string' },
        { name: 'show_profile_rankings', type: 'boolean' },
        { name: 'prominent_rank_leaderboard_code', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
      ],
    }),

    // ============================================
    // Equipment & Exercises
    // ============================================
    tableSchema({
      name: 'equipment_bases',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'standard_weight_kg', type: 'number', isOptional: true },
        { name: 'standard_unit', type: 'string' },
        { name: 'created_at', type: 'number' },
      ],
    }),

    tableSchema({
      name: 'exercises',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'muscle_group', type: 'string', isOptional: true },
        { name: 'equipment_base_id', type: 'string', isOptional: true },
        { name: 'video_url', type: 'string', isOptional: true },
        { name: 'instructions', type: 'string', isOptional: true },
        { name: 'is_custom', type: 'boolean' },
        { name: 'created_by_user_id', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
      ],
    }),

    // ============================================
    // Routines
    // ============================================
    tableSchema({
      name: 'routines',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'is_public', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
      ],
    }),

    tableSchema({
      name: 'routine_exercises',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'routine_id', type: 'string', isIndexed: true },
        { name: 'exercise_id', type: 'string', isIndexed: true },
        { name: 'order_index', type: 'string' },
        { name: 'target_sets', type: 'number', isOptional: true },
        { name: 'target_reps', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
      ],
    }),

    // ============================================
    // Workouts & Sets
    // ============================================
    tableSchema({
      name: 'workouts',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'routine_origin_id', type: 'string', isOptional: true },
        { name: 'name', type: 'string', isOptional: true },
        { name: 'note', type: 'string', isOptional: true },
        { name: 'started_at', type: 'number' },
        { name: 'ended_at', type: 'number', isOptional: true },
        { name: 'local_timezone', type: 'string', isOptional: true },
        { name: 'visibility', type: 'string' },
        { name: 'wilks_score', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
      ],
    }),

    tableSchema({
      name: 'workout_sets',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'workout_id', type: 'string', isIndexed: true },
        { name: 'exercise_id', type: 'string', isIndexed: true },
        { name: 'weight_kg', type: 'number', isOptional: true },
        { name: 'weight_plate_amount', type: 'number', isOptional: true },
        { name: 'weight_base_amount', type: 'number', isOptional: true },
        { name: 'original_input_unit', type: 'string', isOptional: true },
        { name: 'original_input_value', type: 'number', isOptional: true },
        { name: 'reps', type: 'number', isOptional: true },
        { name: 'rpe', type: 'number', isOptional: true },
        { name: 'rir', type: 'number', isOptional: true },
        { name: 'is_failure', type: 'boolean' },
        { name: 'note', type: 'string', isOptional: true },
        { name: 'rest_time_seconds', type: 'number', isOptional: true },
        { name: 'duration_seconds', type: 'number', isOptional: true },
        { name: 'distance_meters', type: 'number', isOptional: true },
        { name: 'is_pr', type: 'boolean' },
        { name: 'set_order_index', type: 'number' },
        { name: 'superset_group_id', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
      ],
    }),

    // ============================================
    // Body Tracking
    // ============================================
    tableSchema({
      name: 'user_body_logs',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'logged_at', type: 'number' },
        { name: 'weight_kg', type: 'number', isOptional: true },
        { name: 'body_fat_pct', type: 'number', isOptional: true },
        { name: 'muscle_mass_kg', type: 'number', isOptional: true },
        { name: 'neck_cm', type: 'number', isOptional: true },
        { name: 'shoulders_cm', type: 'number', isOptional: true },
        { name: 'chest_cm', type: 'number', isOptional: true },
        { name: 'waist_cm', type: 'number', isOptional: true },
        { name: 'hips_cm', type: 'number', isOptional: true },
        { name: 'bicep_left_cm', type: 'number', isOptional: true },
        { name: 'bicep_right_cm', type: 'number', isOptional: true },
        { name: 'thigh_left_cm', type: 'number', isOptional: true },
        { name: 'thigh_right_cm', type: 'number', isOptional: true },
        { name: 'calf_left_cm', type: 'number', isOptional: true },
        { name: 'calf_right_cm', type: 'number', isOptional: true },
        { name: 'photo_front_url', type: 'string', isOptional: true },
        { name: 'photo_back_url', type: 'string', isOptional: true },
        { name: 'photo_side_url', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
      ],
    }),

    // ============================================
    // Social
    // ============================================
    tableSchema({
      name: 'follows',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'follower_id', type: 'string', isIndexed: true },
        { name: 'following_id', type: 'string', isIndexed: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
      ],
    }),

    tableSchema({
      name: 'user_blocks',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'blocker_id', type: 'string', isIndexed: true },
        { name: 'blocked_id', type: 'string', isIndexed: true },
        { name: 'created_at', type: 'number' },
      ],
    }),

    tableSchema({
      name: 'social_posts',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'workout_id', type: 'string', isOptional: true },
        { name: 'achievement_code', type: 'string', isOptional: true },
        { name: 'generated_headline', type: 'string' },
        { name: 'reaction_count_like', type: 'number' }, // Phase 2G: Cached reaction counts
        { name: 'reaction_count_fire', type: 'number' },
        { name: 'reaction_count_muscle', type: 'number' },
        { name: 'reaction_count_clap', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
      ],
    }),

    // ============================================
    // Gamification
    // ============================================
    tableSchema({
      name: 'achievements',
      columns: [
        { name: 'code', type: 'string', isIndexed: true },
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'icon_url', type: 'string', isOptional: true },
        { name: 'threshold_value', type: 'number', isOptional: true },
        { name: 'relevant_muscle_group', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),

    tableSchema({
      name: 'user_badges',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'achievement_code', type: 'string', isIndexed: true },
        { name: 'earned_at', type: 'number' },
        { name: 'is_rusty', type: 'boolean' },
        { name: 'last_maintained_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
      ],
    }),

    tableSchema({
      name: 'user_xp_logs',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'source_type', type: 'string' },
        { name: 'source_id', type: 'string' },
        { name: 'xp_amount', type: 'number' },
        { name: 'created_at', type: 'number' },
      ],
    }),

    tableSchema({
      name: 'user_levels',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'total_xp', type: 'number' },
        { name: 'level', type: 'number' },
        { name: 'xp_to_next_level', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // ============================================
    // Subscription Entitlements (Phase 2F)
    // SECURITY: This table is READ-ONLY on the server.
    // Sync: Pull-only (not in push allowed tables).
    // ============================================
    tableSchema({
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

    // ============================================
    // Notifications
    // ============================================
    tableSchema({
      name: 'notifications',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'recipient_id', type: 'string', isIndexed: true },
        { name: 'actor_id', type: 'string', isOptional: true },
        { name: 'type', type: 'string' },
        { name: 'metadata', type: 'string' }, // JSON string
        { name: 'title', type: 'string' },
        { name: 'body', type: 'string', isOptional: true },
        { name: 'read_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
      ],
    }),

    tableSchema({
      name: 'push_devices',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'expo_push_token', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
      ],
    }),

    // ============================================
    // Weekly Activity System (v2)
    // ============================================
    tableSchema({
      name: 'user_activity_weeks',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'week_start', type: 'string' }, // Date string YYYY-MM-DD
        { name: 'active_days', type: 'number' },
        { name: 'workouts_completed', type: 'number' },
        { name: 'total_sets', type: 'number' },
        { name: 'total_volume_kg', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    tableSchema({
      name: 'user_streak_logs',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'streak_type', type: 'string' },
        { name: 'streak_length', type: 'number' },
        { name: 'week_ended', type: 'string' }, // Date string YYYY-MM-DD
        { name: 'is_active', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // ============================================
    // First 30 Days Program (v3)
    // ============================================
    tableSchema({
      name: 'beginner_programs',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'code', type: 'string', isIndexed: true },
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'duration_weeks', type: 'number' },
        { name: 'workouts_per_week', type: 'number' },
        { name: 'target_persona', type: 'string', isOptional: true },
        { name: 'icon_name', type: 'string', isOptional: true },
        { name: 'is_active', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
      ],
    }),

    tableSchema({
      name: 'beginner_program_days',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'program_id', type: 'string', isIndexed: true },
        { name: 'week_number', type: 'number' },
        { name: 'day_number', type: 'number' },
        { name: 'day_title', type: 'string' },
        { name: 'lesson_title', type: 'string' },
        { name: 'lesson_content', type: 'string' },
        { name: 'exercises', type: 'string' }, // JSON string
        { name: 'order_index', type: 'number', isIndexed: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
      ],
    }),

    tableSchema({
      name: 'user_program_enrollments',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'program_id', type: 'string', isIndexed: true },
        { name: 'current_day_index', type: 'number' },
        { name: 'days_completed', type: 'number' },
        { name: 'started_at', type: 'number' },
        { name: 'completed_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
      ],
    }),

    tableSchema({
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

    tableSchema({
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

    tableSchema({
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

    tableSchema({
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

    tableSchema({
      name: 'user_program_day_progress',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'enrollment_id', type: 'string', isIndexed: true },
        { name: 'program_day_id', type: 'string', isIndexed: true },
        { name: 'workout_id', type: 'string', isOptional: true },
        { name: 'lesson_read_at', type: 'number', isOptional: true },
        { name: 'workout_completed_at', type: 'number', isOptional: true },
        { name: 'skipped', type: 'boolean' },
        { name: 'skip_reason', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
      ],
    }),

    // ============================================
    // Phase 2G: Social & Competition
    // ============================================
    tableSchema({
      name: 'post_reactions',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'social_post_id', type: 'string', isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'reaction_type', type: 'string' }, // 'LIKE' | 'FIRE' | 'MUSCLE' | 'CLAP'
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
      ],
    }),

    tableSchema({
      name: 'challenges',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'created_by_id', type: 'string', isIndexed: true },
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'challenge_type', type: 'string' }, // 'MOST_VOLUME' | 'MOST_WORKOUTS' | 'MOST_SETS' | 'FIRST_TO_TARGET'
        { name: 'target_value', type: 'number', isOptional: true },
        { name: 'start_date', type: 'number' },
        { name: 'end_date', type: 'number' },
        { name: 'status', type: 'string' }, // 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
        { name: 'visibility', type: 'string' }, // 'PUBLIC' | 'FOLLOWERS' | 'INVITE_ONLY'
        { name: 'max_participants', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
      ],
    }),

    tableSchema({
      name: 'challenge_participants',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'challenge_id', type: 'string', isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'status', type: 'string' }, // 'ACTIVE' | 'COMPLETED' | 'ABANDONED'
        { name: 'current_score', type: 'number' },
        { name: 'rank', type: 'number', isOptional: true },
        { name: 'joined_at', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
      ],
    }),

    tableSchema({
      name: 'leaderboards',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'code', type: 'string', isIndexed: true },
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'metric_type', type: 'string' }, // 'TOTAL_XP' | 'TOTAL_VOLUME' | 'WORKOUT_COUNT' | 'PR_COUNT'
        { name: 'time_period', type: 'string' }, // 'WEEKLY' | 'MONTHLY' | 'ALL_TIME'
        { name: 'is_active', type: 'boolean' },
        { name: 'display_order', type: 'number' },
        { name: 'icon_name', type: 'string' },
        { name: 'last_total_participants', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    tableSchema({
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

    // Phase 2G: Workout Partners
    tableSchema({
      name: 'workout_partners',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'workout_id', type: 'string', isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'partner_user_id', type: 'string', isIndexed: true },
        { name: 'status', type: 'string' }, // 'ACTIVE' | 'LEFT' | 'COMPLETED'
        { name: 'joined_at', type: 'number' },
        { name: 'left_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
      ],
    }),

    tableSchema({
      name: 'workout_partner_invitations',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'workout_id', type: 'string', isIndexed: true },
        { name: 'inviter_user_id', type: 'string', isIndexed: true },
        { name: 'invitee_user_id', type: 'string', isIndexed: true },
        { name: 'status', type: 'string' }, // 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED'
        { name: 'expires_at', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'deleted_at', type: 'number', isOptional: true },
      ],
    }),
  ],
});
