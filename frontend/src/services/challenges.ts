/**
 * Challenges Service
 * Phase 2G: Social & Competition - Challenge System
 * 
 * Handles challenge creation, joining, leaving, and fetching
 */

import { supabase } from './supabase';
import { challengesCollection, challengeParticipantsCollection } from '../db';
import { Q } from '@nozbe/watermelondb';
import type Challenge from '../db/models/Challenge';
import type ChallengeParticipant from '../db/models/ChallengeParticipant';
import type {
  ChallengeType,
  ChallengeStatus,
  ChallengeVisibility,
} from '../db/models/Challenge';

export interface CreateChallengeInput {
  title: string;
  description?: string;
  challenge_type: ChallengeType;
  target_value?: number;
  start_date: string; // ISO string
  end_date: string; // ISO string
  visibility?: ChallengeVisibility;
  max_participants?: number;
}

export interface CreateChallengeResponse {
  success: boolean;
  challenge: {
    id: string;
    title: string;
    challenge_type: string;
    status: string;
    start_date: string;
    end_date: string;
    visibility: string;
  };
}

export interface ChallengeWithParticipants {
  challenge: Challenge;
  participants: ChallengeParticipant[];
  userParticipant?: ChallengeParticipant;
  participantCount: number;
}

export interface ChallengeFilters {
  status?: ChallengeStatus[];
  visibility?: ChallengeVisibility[];
  challenge_type?: ChallengeType[];
  created_by_id?: string;
}

/**
 * Create a new challenge
 */
export async function createChallenge(
  data: CreateChallengeInput
): Promise<Challenge> {
  try {
    const { data: response, error } = await supabase.functions.invoke(
      'create-challenge',
      {
        body: {
          title: data.title,
          description: data.description,
          challenge_type: data.challenge_type,
          target_value: data.target_value,
          start_date: data.start_date,
          end_date: data.end_date,
          visibility: data.visibility || 'FOLLOWERS',
          max_participants: data.max_participants || 50,
        },
      }
    );

    if (error) {
      throw error;
    }

    const result = response as CreateChallengeResponse;

    // Sync will handle the actual database update
    // For now, trigger a sync to get the new challenge
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Fetch the created challenge from local DB (after sync)
    const challenges = await challengesCollection
      .query(Q.where('server_id', result.challenge.id))
      .fetch();

    if (challenges.length > 0) {
      return challenges[0] as Challenge;
    }

    throw new Error('Challenge created but not found in local database');
  } catch (error) {
    console.error('Error creating challenge:', error);
    throw error;
  }
}

/**
 * Join a challenge
 */
export async function joinChallenge(challengeId: string): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('join-challenge', {
      body: {
        challenge_id: challengeId,
      },
    });

    if (error) {
      throw error;
    }

    // Sync will update local DB
  } catch (error) {
    console.error('Error joining challenge:', error);
    throw error;
  }
}

/**
 * Leave a challenge
 */
export async function leaveChallenge(challengeId: string): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('leave-challenge', {
      body: {
        challenge_id: challengeId,
      },
    });

    if (error) {
      throw error;
    }

    // Sync will update local DB (soft delete participant)
  } catch (error) {
    console.error('Error leaving challenge:', error);
    throw error;
  }
}

/**
 * Get challenges with optional filters
 */
export async function getChallenges(
  filters?: ChallengeFilters
): Promise<Challenge[]> {
  let query = challengesCollection.query(
    Q.where('deleted_at', null),
    Q.sortBy('created_at', Q.desc)
  );

  if (filters?.status && filters.status.length > 0) {
    query = query.extend(
      Q.where('status', Q.oneOf(filters.status))
    ) as typeof query;
  }

  if (filters?.visibility && filters.visibility.length > 0) {
    query = query.extend(
      Q.where('visibility', Q.oneOf(filters.visibility))
    ) as typeof query;
  }

  if (filters?.challenge_type && filters.challenge_type.length > 0) {
    query = query.extend(
      Q.where('challenge_type', Q.oneOf(filters.challenge_type))
    ) as typeof query;
  }

  if (filters?.created_by_id) {
    query = query.extend(
      Q.where('created_by_id', filters.created_by_id)
    ) as typeof query;
  }

  const challenges = await query.fetch();
  return challenges as Challenge[];
}

/**
 * Get challenge details with participants
 */
export async function getChallengeDetails(
  challengeId: string,
  userId: string
): Promise<ChallengeWithParticipants> {
  // Get challenge
  const challenges = await challengesCollection
    .query(Q.where('server_id', challengeId), Q.where('deleted_at', null))
    .fetch();

  if (challenges.length === 0) {
    throw new Error('Challenge not found');
  }

  const challenge = challenges[0] as Challenge;

  // Get participants
  const participants = await challengeParticipantsCollection
    .query(
      Q.where('challenge_id', challenge.id),
      Q.where('deleted_at', null),
      Q.sortBy('rank', Q.asc),
      Q.take(50) // Top 50 participants
    )
    .fetch();

  const typedParticipants = participants as ChallengeParticipant[];

  // Get user's participation
  const userParticipant = typedParticipants.find(
    (p) => p.userId === userId
  );

  return {
    challenge,
    participants: typedParticipants,
    userParticipant,
    participantCount: typedParticipants.length,
  };
}

/**
 * Get user's challenges (challenges user created or is participating in)
 */
export async function getUserChallenges(
  userId: string
): Promise<Challenge[]> {
  // Get challenges user created
  const createdChallenges = await challengesCollection
    .query(
      Q.where('created_by_id', userId),
      Q.where('deleted_at', null),
      Q.sortBy('created_at', Q.desc)
    )
    .fetch();

  // Get challenges user is participating in
  const participations = await challengeParticipantsCollection
    .query(
      Q.where('user_id', userId),
      Q.where('deleted_at', null)
    )
    .fetch();

  const challengeIds = participations.map((p) => p.challengeId);
  const participatedChallenges =
    challengeIds.length > 0
      ? await challengesCollection
        .query(
          Q.where('id', Q.oneOf(challengeIds)),
          Q.where('deleted_at', null)
        )
        .fetch()
      : [];

  // Combine and deduplicate
  const allChallenges = [
    ...(createdChallenges as Challenge[]),
    ...(participatedChallenges as Challenge[]),
  ];

  const uniqueChallenges = Array.from(
    new Map(allChallenges.map((c) => [c.id, c])).values()
  );

  return uniqueChallenges.sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );
}

/**
 * Get active challenges (PENDING or ACTIVE status)
 */
export async function getActiveChallenges(): Promise<Challenge[]> {
  return getChallenges({
    status: ['PENDING', 'ACTIVE'],
  });
}
