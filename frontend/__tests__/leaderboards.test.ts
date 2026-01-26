/**
 * Leaderboards Service Tests
 * Tests for leaderboard fetching and caching
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { getLeaderboard } from '../src/services/leaderboards';
import { supabase } from '../src/services/supabase';

// Mock Supabase
jest.mock('../src/services/supabase', () => ({
  supabase: {
    functions: {
      invoke: jest.fn() as jest.MockedFunction<any>,
    },
  },
}));

describe('Leaderboards Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getLeaderboard', () => {
    it('should fetch leaderboard with valid code', async () => {
      const mockLeaderboard = {
        success: true,
        leaderboard: {
          code: 'WEEKLY_VOLUME',
          title: 'Weekly Volume',
          entries: [
            {
              rank: 1,
              user_id: 'user-1',
              score: 15000,
              username: 'user1',
              avatar_url: null,
              level: 10,
            },
            {
              rank: 2,
              user_id: 'user-2',
              score: 12000,
              username: 'user2',
              avatar_url: null,
              level: 8,
            },
          ],
        },
      };

      (supabase.functions.invoke as jest.MockedFunction<any>).mockResolvedValue({
        data: mockLeaderboard,
        error: null,
      });

      const result = await getLeaderboard('WEEKLY_VOLUME');

      expect(supabase.functions.invoke).toHaveBeenCalledWith('get-leaderboard', {
        body: { code: 'WEEKLY_VOLUME', limit: 100 },
      });

      expect(result).toBeDefined();
      expect(result.entries).toHaveLength(2);
      expect(result.entries[0].rank).toBe(1);
    });

    it('should handle errors gracefully', async () => {
      (supabase.functions.invoke as jest.MockedFunction<any>).mockResolvedValue({
        data: null,
        error: { message: 'Leaderboard not found' },
      });

      await expect(getLeaderboard('INVALID_CODE' as any)).rejects.toThrow();
    });
  });

});
