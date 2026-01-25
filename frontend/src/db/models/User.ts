import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text } from '@nozbe/watermelondb/decorators';

export default class User extends Model {
  static table = 'users';

  @text('server_id') serverId!: string;
  @text('username') username!: string;
  @text('avatar_url') avatarUrl?: string;
  @text('bio') bio?: string;
  @text('website_link') websiteLink?: string;
  @text('account_status') accountStatus!: string;
  @date('terms_accepted_at') termsAcceptedAt?: Date;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @date('deleted_at') deletedAt?: Date;
}
