import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
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
        { name: 'subscription_tier', type: 'string' },
        { name: 'is_trial_period', type: 'boolean' },
        { name: 'subscription_expires_at', type: 'number', isOptional: true },
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
        { name: 'preferred_rpe_system', type: 'string' },
        { name: 'sync_to_health_kit', type: 'boolean' },
        { name: 'auto_play_music_service', type: 'string', isOptional: true },
        { name: 'active_injuries', type: 'string' }, // JSON string
        { name: 'default_workout_visibility', type: 'string' },
        { name: 'notification_preferences', type: 'string' }, // JSON string
        { name: 'equipment_overrides', type: 'string' }, // JSON string
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
  ],
});
