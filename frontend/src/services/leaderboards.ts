/**
 * Leaderboards Service
 * Phase 2G: Social & Competition - Leaderboards
 * 
 * Handles leaderboard fetching and caching
 */

import { supabase } from './supabase';
import { leaderboardsCollection, leaderboardEntriesCollection } from '../db';
import { Q } from '@nozbe/watermelondb';
import type Leaderboard from '../db/models/Leaderboard';
import type LeaderboardEntry from '../db/models/LeaderboardEntry';
import type { LeaderboardCode } from '../db/models/Leaderboard';

export interface LeaderboardEntryWithUser {
  rank: number;
  user_id: string;
  username: string;
  avatar_url: string | null;
  level: number;
  score: number;
  is_current_user: boolean;
}

export interface LeaderboardResponse {
  leaderboard: {
    code: string;
    title: string;
    description: string | null;
    metric_type: string;
    time_period: string;
  };
  entries: LeaderboardEntryWithUser[];
  user_entry: LeaderboardEntryWithUser | null;
  period: {
    start: string;
    end: string;
  };
  computed_at: string;
}

/**
 * Get leaderboard entries for a specific leaderboard
 */
export async function getLeaderboard(
  code: LeaderboardCode,
  limit: number = 50
): Promise<LeaderboardResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('get-leaderboard', {
      body: {
        leaderboard_code: code,
        limit: Math.min(Math.max(1, limit), 100), // Clamp between 1 and 100
      },
    });

    if (error) {
      throw error;
    }

    return data as LeaderboardResponse;
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    throw error;
  }
}

/**
 * Get all active leaderboards from local database
 */
export async function getAllLeaderboards(): Promise<Leaderboard[]> {
  const leaderboards = await leaderboardsCollection
    .query(
      Q.where('is_active', true),
      Q.sortBy('display_order', Q.asc)
    )
    .fetch();

  return leaderboards as Leaderboard[];
}

/**
 * Get user's rank for a specific leaderboard
 */
export async function getUserRank(
  code: LeaderboardCode,
  userId: string
): Promise<number | null> {
  try {
    const response = await getLeaderboard(code, 100);
    const userEntry = response.user_entry;
    return userEntry ? userEntry.rank : null;
  } catch (error) {
    console.error('Error getting user rank:', error);
    return null;
  }
}

/**
 * Get leaderboard entries from local database (cached)
 */
export async function getCachedLeaderboardEntries(
  leaderboardId: string
): Promise<LeaderboardEntry[]> {
  const entries = await leaderboardEntriesCollection
    .query(
      Q.where('leaderboard_id', leaderboardId),
      Q.sortBy('rank', Q.asc),
      Q.take(100)
    )
    .fetch();

  return entries as LeaderboardEntry[];
}
