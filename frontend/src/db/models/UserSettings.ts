import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text, json } from '@nozbe/watermelondb/decorators';

const sanitizeJSON = (raw: unknown) => {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw || {};
};

export default class UserSettings extends Model {
  static table = 'user_settings';

  @text('server_id') serverId!: string;
  @text('user_id') userId!: string;
  @date('date_of_birth') dateOfBirth?: Date;
  @text('gender') gender?: string;
  @field('height_cm') heightCm?: number;
  @text('weight_unit_preference') weightUnitPreference!: string;
  @text('distance_unit_preference') distanceUnitPreference!: string;
  @text('theme_preference') themePreference!: string;
  @field('keep_screen_awake') keepScreenAwake!: boolean;
  @field('timer_auto_start') timerAutoStart!: boolean;
  @field('timer_vibration_enabled') timerVibrationEnabled!: boolean;
  @field('timer_sound_enabled') timerSoundEnabled!: boolean;
  @field('input_mode_plate_math') inputModePlateMath!: boolean;
  @text('preferred_rpe_system') preferredRpeSystem!: string;
  @field('sync_to_health_kit') syncToHealthKit!: boolean;
  @text('auto_play_music_service') autoPlayMusicService?: string;
  @json('active_injuries', sanitizeJSON) activeInjuries!: unknown[];
  @text('default_workout_visibility') defaultWorkoutVisibility!: string;
  @json('notification_preferences', sanitizeJSON) notificationPreferences!: Record<string, unknown>;
  @json('equipment_overrides', sanitizeJSON) equipmentOverrides!: Record<string, unknown>;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @date('deleted_at') deletedAt?: Date;
}
