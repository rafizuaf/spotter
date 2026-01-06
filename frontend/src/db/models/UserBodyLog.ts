import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text } from '@nozbe/watermelondb/decorators';

export default class UserBodyLog extends Model {
  static table = 'user_body_logs';

  @text('server_id') serverId!: string;
  @text('user_id') userId!: string;
  @date('logged_at') loggedAt!: Date;
  @field('weight_kg') weightKg?: number;
  @field('body_fat_pct') bodyFatPct?: number;
  @field('muscle_mass_kg') muscleMassKg?: number;
  @field('neck_cm') neckCm?: number;
  @field('shoulders_cm') shouldersCm?: number;
  @field('chest_cm') chestCm?: number;
  @field('waist_cm') waistCm?: number;
  @field('hips_cm') hipsCm?: number;
  @field('bicep_left_cm') bicepLeftCm?: number;
  @field('bicep_right_cm') bicepRightCm?: number;
  @field('thigh_left_cm') thighLeftCm?: number;
  @field('thigh_right_cm') thighRightCm?: number;
  @field('calf_left_cm') calfLeftCm?: number;
  @field('calf_right_cm') calfRightCm?: number;
  @text('photo_front_url') photoFrontUrl?: string;
  @text('photo_back_url') photoBackUrl?: string;
  @text('photo_side_url') photoSideUrl?: string;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @date('deleted_at') deletedAt?: Date;
}
