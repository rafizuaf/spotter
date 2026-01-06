import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text } from '@nozbe/watermelondb/decorators';

export default class EquipmentBase extends Model {
  static table = 'equipment_bases';

  @text('server_id') serverId!: string;
  @text('name') name!: string;
  @field('standard_weight_kg') standardWeightKg?: number;
  @text('standard_unit') standardUnit!: string;
  @readonly @date('created_at') createdAt!: Date;
}
