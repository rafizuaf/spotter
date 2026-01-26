/**
 * PostReaction Model
 * Phase 2G: Social & Competition - Feed Reactions
 *
 * Represents a user's reaction (like, fire, muscle, clap) on a social post.
 * Supports toggle behavior - same reaction can be added/removed.
 */

import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly } from '@nozbe/watermelondb/decorators';

export type ReactionType = 'LIKE' | 'FIRE' | 'MUSCLE' | 'CLAP';

export default class PostReaction extends Model {
  static table = 'post_reactions';

  // Server ID for sync
  @text('server_id') serverId!: string;

  // Foreign key to social_posts
  @text('social_post_id') socialPostId!: string;

  // User who reacted
  @text('user_id') userId!: string;

  // Type of reaction
  @text('reaction_type') reactionType!: ReactionType;

  // Timestamps
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @date('deleted_at') deletedAt?: Date | null;

  /**
   * Check if this reaction is active (not soft-deleted)
   */
  get isActive(): boolean {
    return this.deletedAt === null || this.deletedAt === undefined;
  }

  /**
   * Get emoji for this reaction type
   */
  get emoji(): string {
    const emojiMap: Record<ReactionType, string> = {
      LIKE: '❤️',
      FIRE: '🔥',
      MUSCLE: '💪',
      CLAP: '👏',
    };
    return emojiMap[this.reactionType] || '❤️';
  }

  /**
   * Get label for this reaction type
   */
  get label(): string {
    const labelMap: Record<ReactionType, string> = {
      LIKE: 'Like',
      FIRE: 'Fire',
      MUSCLE: 'Muscle',
      CLAP: 'Clap',
    };
    return labelMap[this.reactionType] || 'Like';
  }
}

/**
 * Reaction type utilities
 */
export const REACTION_TYPES: ReactionType[] = ['LIKE', 'FIRE', 'MUSCLE', 'CLAP'];

export const REACTION_EMOJI: Record<ReactionType, string> = {
  LIKE: '❤️',
  FIRE: '🔥',
  MUSCLE: '💪',
  CLAP: '👏',
};

export const REACTION_LABELS: Record<ReactionType, string> = {
  LIKE: 'Like',
  FIRE: 'Fire',
  MUSCLE: 'Strong',
  CLAP: 'Applause',
};
