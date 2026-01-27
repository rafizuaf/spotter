/**
 * Ranking Badges Tests
 * Tests for isRankingBadge, parseRankingBadge, getRankingBadgeIcon
 * and percentile / rank-cutoff logic used by ranking badges.
 */

import {
  isRankingBadge,
  parseRankingBadge,
  getRankingBadgeIcon,
} from '../src/services/rankings';

describe('Ranking Badges', () => {
  describe('isRankingBadge', () => {
    it('returns true for TOP_1_WEEKLY_VOLUME', () => {
      expect(isRankingBadge('TOP_1_WEEKLY_VOLUME')).toBe(true);
    });

    it('returns true for TOP_25_ALL_TIME_XP', () => {
      expect(isRankingBadge('TOP_25_ALL_TIME_XP')).toBe(true);
    });

    it('returns false for WEEKLY_3_x4', () => {
      expect(isRankingBadge('WEEKLY_3_x4')).toBe(false);
    });

    it('returns false for PR_FIRST', () => {
      expect(isRankingBadge('PR_FIRST')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isRankingBadge('')).toBe(false);
    });

    it('returns true for other TOP_X_ codes', () => {
      expect(isRankingBadge('TOP_5_MONTHLY_PRS')).toBe(true);
      expect(isRankingBadge('TOP_10_ALL_TIME_WORKOUTS')).toBe(true);
    });
  });

  describe('parseRankingBadge', () => {
    it('extracts threshold and leaderboard code for TOP_1_WEEKLY_VOLUME', () => {
      const result = parseRankingBadge('TOP_1_WEEKLY_VOLUME');
      expect(result).not.toBeNull();
      expect(result!.threshold).toBe(1);
      expect(result!.leaderboardCode).toBe('WEEKLY_VOLUME');
    });

    it('extracts threshold and leaderboard code for TOP_25_ALL_TIME_XP', () => {
      const result = parseRankingBadge('TOP_25_ALL_TIME_XP');
      expect(result).not.toBeNull();
      expect(result!.threshold).toBe(25);
      expect(result!.leaderboardCode).toBe('ALL_TIME_XP');
    });

    it('returns null for non-ranking codes', () => {
      expect(parseRankingBadge('WEEKLY_3_x4')).toBeNull();
      expect(parseRankingBadge('PR_FIRST')).toBeNull();
      expect(parseRankingBadge('')).toBeNull();
      expect(parseRankingBadge('TOP_')).toBeNull();
    });

    it('handles TOP_5_MONTHLY_PRS', () => {
      const result = parseRankingBadge('TOP_5_MONTHLY_PRS');
      expect(result).toEqual({ threshold: 5, leaderboardCode: 'MONTHLY_PRS' });
    });
  });

  describe('getRankingBadgeIcon', () => {
    it('returns gold for threshold 1', () => {
      const icon = getRankingBadgeIcon(1);
      expect(icon.emoji).toBe('🥇');
      expect(icon.color).toBe('#FFD700');
      expect(icon.label).toBe('Top 1%');
    });

    it('returns silver for threshold 5', () => {
      const icon = getRankingBadgeIcon(5);
      expect(icon.emoji).toBe('🥈');
      expect(icon.color).toBe('#C0C0C0');
      expect(icon.label).toBe('Top 5%');
    });

    it('returns bronze for threshold 10', () => {
      const icon = getRankingBadgeIcon(10);
      expect(icon.emoji).toBe('🥉');
      expect(icon.color).toBe('#CD7F32');
      expect(icon.label).toBe('Top 10%');
    });

    it('returns blue medal for threshold 25', () => {
      const icon = getRankingBadgeIcon(25);
      expect(icon.emoji).toBe('🏅');
      expect(icon.color).toBe('#4A90D9');
      expect(icon.label).toBe('Top 25%');
    });

    it('returns generic for unknown threshold', () => {
      const icon = getRankingBadgeIcon(50);
      expect(icon.emoji).toBe('🏅');
      expect(icon.label).toBe('Top 50%');
    });
  });

  describe('percentile calculation', () => {
    it('computes percentile as (rank / total) * 100 when total > 0', () => {
      const percent = (rank: number, total: number) =>
        total > 0 ? (rank / total) * 100 : 0;
      expect(percent(5, 100)).toBe(5);
      expect(percent(1, 1)).toBe(100);
      expect(percent(25, 100)).toBe(25);
      expect(percent(1, 10)).toBe(10);
    });

    it('returns 0 when total === 0', () => {
      const percent = (rank: number, total: number) =>
        total > 0 ? (rank / total) * 100 : 0;
      expect(percent(1, 0)).toBe(0);
      expect(percent(0, 0)).toBe(0);
    });
  });

  describe('rank cutoff calculation', () => {
    it('computes cutoff as Math.max(1, Math.floor(total * percent / 100))', () => {
      const cutoff = (total: number, percent: number) =>
        Math.max(1, Math.floor((total * percent) / 100));
      expect(cutoff(100, 1)).toBe(1);
      expect(cutoff(100, 5)).toBe(5);
      expect(cutoff(100, 25)).toBe(25);
      expect(cutoff(10, 1)).toBe(1);
      expect(cutoff(1, 1)).toBe(1);
    });

    it('handles total 0 and single participant', () => {
      const cutoff = (total: number, percent: number) =>
        Math.max(1, Math.floor((total * percent) / 100));
      expect(cutoff(0, 1)).toBe(1);
      expect(cutoff(1, 25)).toBe(1);
    });
  });
});
