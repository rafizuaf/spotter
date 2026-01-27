/**
 * Rankings Service
 * Ranking badges & profile rankings
 *
 * Provides user leaderboard rankings from local DB and helpers for ranking badges.
 */

import { Q } from '@nozbe/watermelondb';
import {
  leaderboardEntriesCollection,
  leaderboardsCollection,
} from '../db';
import type Leaderboard from '../db/models/Leaderboard';
import type LeaderboardEntry from '../db/models/LeaderboardEntry';

export interface UserRanking {
  leaderboardCode: string;
  leaderboardTitle: string;
  rank: number;
  score: number;
  totalParticipants: number;
  percentile: number;
}

const RANKING_BADGE_REGEX = /^TOP_(\d+)_(.+)$/;

/**
 * Fetch user's leaderboard rankings from local DB.
 * Joins entries with leaderboards and computes percentile.
 */
export async function getUserRankings(userId: string): Promise<UserRanking[]> {
  const entries = (await leaderboardEntriesCollection
    .query(Q.where('user_id', userId))
    .fetch()) as LeaderboardEntry[];

  if (entries.length === 0) return [];

  const leaderboardIds = [...new Set(entries.map((e) => e.leaderboardId))];
  const leaderboards = (await leaderboardsCollection
    .query(Q.where('id', Q.oneOf(leaderboardIds)))
    .fetch()) as Leaderboard[];

  const lbMap = new Map(leaderboards.map((lb) => [lb.id, lb]));

  const result: UserRanking[] = [];
  for (const entry of entries) {
    const lb = lbMap.get(entry.leaderboardId);
    if (!lb) continue;

    const total = lb.lastTotalParticipants ?? 0;
    const percentile = total > 0 ? (entry.rank / total) * 100 : 0;

    result.push({
      leaderboardCode: lb.code,
      leaderboardTitle: lb.title,
      rank: entry.rank,
      score: entry.score,
      totalParticipants: total,
      percentile,
    });
  }

  // Sort by rank (best first)
  result.sort((a, b) => a.rank - b.rank);
  return result;
}

/**
 * True if the achievement code is a ranking badge (TOP_X_LEADERBOARD_CODE).
 */
export function isRankingBadge(code: string): boolean {
  return /^TOP_\d+_/.test(code);
}

/**
 * Parse ranking badge code into threshold and leaderboard code.
 * Returns null for non-ranking codes.
 */
export function parseRankingBadge(
  code: string
): { threshold: number; leaderboardCode: string } | null {
  const m = code.match(RANKING_BADGE_REGEX);
  if (!m) return null;
  const threshold = parseInt(m[1], 10);
  const leaderboardCode = m[2];
  return isNaN(threshold) || !leaderboardCode ? null : { threshold, leaderboardCode };
}

export interface RankingBadgeIcon {
  emoji: string;
  color: string;
  label: string;
}

/**
 * Medal style and label for a given percentile threshold (1, 5, 10, 25).
 */
export function getRankingBadgeIcon(threshold: number): RankingBadgeIcon {
  switch (threshold) {
    case 1:
      return { emoji: '🥇', color: '#FFD700', label: 'Top 1%' };
    case 5:
      return { emoji: '🥈', color: '#C0C0C0', label: 'Top 5%' };
    case 10:
      return { emoji: '🥉', color: '#CD7F32', label: 'Top 10%' };
    case 25:
      return { emoji: '🏅', color: '#4A90D9', label: 'Top 25%' };
    default:
      return { emoji: '🏅', color: '#a0a0a0', label: `Top ${threshold}%` };
  }
}
