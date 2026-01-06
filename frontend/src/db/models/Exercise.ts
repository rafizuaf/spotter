import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text, relation } from '@nozbe/watermelondb/decorators';

export default class Exercise extends Model {
  static table = 'exercises';

  static associations = {
    equipment_bases: { type: 'belongs_to' as const, key: 'equipment_base_id' },
    users: { type: 'belongs_to' as const, key: 'created_by_user_id' },
  };

  @text('server_id') serverId!: string;
  @text('name') name!: string;
  @text('muscle_group') muscleGroup?: string;
  @text('equipment_base_id') equipmentBaseId?: string;
  @text('video_url') videoUrl?: string;
  @text('instructions') instructions?: string;
  @field('is_custom') isCustom!: boolean;
  @text('created_by_user_id') createdByUserId?: string;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @date('deleted_at') deletedAt?: Date;
}
