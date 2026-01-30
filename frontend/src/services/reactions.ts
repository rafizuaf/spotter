/**
 * Reactions Service
 * Phase 2G: Social & Competition - Feed Reactions
 * 
 * Handles post reactions (like, fire, muscle, clap) via edge function
 * and updates local WatermelonDB for offline-first support.
 */

import { supabase } from './supabase';
import { database, postReactionsCollection, socialPostsCollection } from '../db';
import { Q } from '@nozbe/watermelondb';
import { v4 as uuid } from 'uuid';
import { logError } from '../utils/errorHandler';
import type PostReaction from '../db/models/PostReaction';
import type { ReactionType } from '../db/models/PostReaction';
import type SocialPost from '../db/models/SocialPost';

export interface ReactToPostResponse {
  success: boolean;
  action: 'added' | 'removed';
  reaction_type: ReactionType;
  reaction_counts: {
    like: number;
    fire: number;
    muscle: number;
    clap: number;
  };
}

/**
 * Toggle reaction on a social post
 * Optimistically updates local DB, then syncs with server
 */
export async function reactToPost(
  postId: string,
  reactionType: ReactionType
): Promise<ReactToPostResponse> {
  try {
    // Call edge function
    const { data, error } = await supabase.functions.invoke('react-to-post', {
      body: {
        social_post_id: postId,
        reaction_type: reactionType,
      },
    });

    if (error) {
      throw error;
    }

    const response = data as ReactToPostResponse;

    // Get current user ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Update local WatermelonDB
    await database.write(async () => {
      // Update or create reaction record
      const existingReactions = await postReactionsCollection
        .query(
          Q.where('social_post_id', postId),
          Q.where('user_id', user.id),
          Q.where('reaction_type', reactionType)
        )
        .fetch();

      if (existingReactions.length > 0) {
        const reaction = existingReactions[0] as PostReaction;
        await reaction.update((r) => {
          r.deletedAt = response.action === 'removed' ? new Date() : null;
          r.updatedAt = new Date();
        });
      } else if (response.action === 'added') {
        // Create new reaction
        await postReactionsCollection.create((r: PostReaction) => {
          r.serverId = uuid(); // Temporary, will be replaced on sync
          r.socialPostId = postId;
          r.userId = user.id;
          r.reactionType = reactionType;
          r.createdAt = new Date();
          r.updatedAt = new Date();
          r.deletedAt = null;
        });
      }

      // Update social post reaction counts
      const posts = await socialPostsCollection
        .query(Q.where('server_id', postId))
        .fetch();

      if (posts.length > 0) {
        const post = posts[0] as SocialPost;
        await post.update((p) => {
          p.reactionCountLike = response.reaction_counts.like;
          p.reactionCountFire = response.reaction_counts.fire;
          p.reactionCountMuscle = response.reaction_counts.muscle;
          p.reactionCountClap = response.reaction_counts.clap;
          p.updatedAt = new Date();
        });
      }
    });

    return response;
  } catch (error) {
    logError(error, 'reactions_reactToPost');
    throw error;
  }
}

/**
 * Get all reactions for a post
 */
export async function getPostReactions(postId: string): Promise<PostReaction[]> {
  const reactions = await postReactionsCollection
    .query(
      Q.where('social_post_id', postId),
      Q.where('deleted_at', null),
      Q.sortBy('created_at', Q.desc)
    )
    .fetch();

  return reactions as PostReaction[];
}

/**
 * Get user's reaction to a post (if any)
 */
export async function getUserReaction(
  postId: string,
  userId: string
): Promise<PostReaction | null> {
  const reactions = await postReactionsCollection
    .query(
      Q.where('social_post_id', postId),
      Q.where('user_id', userId),
      Q.where('deleted_at', null)
    )
    .fetch();

  return reactions.length > 0 ? (reactions[0] as PostReaction) : null;
}

/**
 * Get user's reaction type for a post (if any)
 */
export async function getUserReactionType(
  postId: string,
  userId: string
): Promise<ReactionType | null> {
  const reaction = await getUserReaction(postId, userId);
  return reaction ? reaction.reactionType : null;
}

/**
 * Batch load user reactions for multiple posts
 * Optimized to avoid N+1 queries
 */
export async function getUserReactionsForPosts(
  postIds: string[],
  userId: string
): Promise<Map<string, ReactionType>> {
  if (postIds.length === 0) {
    return new Map();
  }

  const reactions = await postReactionsCollection
    .query(
      Q.where('social_post_id', Q.oneOf(postIds)),
      Q.where('user_id', userId),
      Q.where('deleted_at', null)
    )
    .fetch();

  const reactionMap = new Map<string, ReactionType>();
  reactions.forEach((reaction) => {
    const typedReaction = reaction as PostReaction;
    reactionMap.set(typedReaction.socialPostId, typedReaction.reactionType);
  });

  return reactionMap;
}
