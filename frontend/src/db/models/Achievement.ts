import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text } from '@nozbe/watermelondb/decorators';

export default class Achievement extends Model {
  static table = 'achievements';

  @text('code') code!: string; // PK in backend, unique identifier
  @text('title') title!: string;
  @text('description') description!: string;
  @text('icon_url') iconUrl?: string;
  @field('threshold_value') thresholdValue?: number;
  @text('relevant_muscle_group') relevantMuscleGroup?: string;
  @readonly @date('created_at') createdAt!: Date;
}
