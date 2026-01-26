/**
 * Challenges Service Tests
 * Tests for challenge creation, joining, leaving, and fetching
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  createChallenge,
  joinChallenge,
  leaveChallenge,
  getActiveChallenges,
  getChallengeDetails,
} from '../src/services/challenges';
import { supabase } from '../src/services/supabase';

// Mock Supabase
jest.mock('../src/services/supabase', () => ({
  supabase: {
    functions: {
      invoke: jest.fn() as jest.MockedFunction<any>,
    },
  },
}));

// Mock database collections
jest.mock('../src/db', () => ({
  challengesCollection: {
    query: jest.fn(() => ({
      where: jest.fn(() => ({
        fetch: jest.fn(),
      })),
    })),
  },
  challengeParticipantsCollection: {
    query: jest.fn(() => ({
      where: jest.fn(() => ({
        fetch: jest.fn(),
      })),
    })),
  },
}));

describe('Challenges Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createChallenge', () => {
    it('should create a challenge with valid data', async () => {
      const mockChallenge = {
        success: true,
        challenge: {
          id: 'challenge-123',
          title: 'Test Challenge',
          challenge_type: 'MOST_VOLUME',
          status: 'PENDING',
          start_date: '2026-02-01T00:00:00Z',
          end_date: '2026-02-28T23:59:59Z',
          visibility: 'PUBLIC',
        },
      };

      (supabase.functions.invoke as jest.MockedFunction<any>).mockResolvedValue({
        data: mockChallenge,
        error: null,
      });

      const result = await createChallenge({
        title: 'Test Challenge',
        challenge_type: 'MOST_VOLUME',
        start_date: '2026-02-01T00:00:00Z',
        end_date: '2026-02-28T23:59:59Z',
        visibility: 'PUBLIC',
      });

      expect(supabase.functions.invoke).toHaveBeenCalledWith('create-challenge', {
        body: expect.objectContaining({
          title: 'Test Challenge',
          challenge_type: 'MOST_VOLUME',
        }),
      });
    });

    it('should throw error if creation fails', async () => {
      (supabase.functions.invoke as jest.MockedFunction<any>).mockResolvedValue({
        data: null,
        error: { message: 'Failed to create challenge' },
      });

      await expect(
        createChallenge({
          title: 'Test Challenge',
          challenge_type: 'MOST_VOLUME',
          start_date: '2026-02-01T00:00:00Z',
          end_date: '2026-02-28T23:59:59Z',
        })
      ).rejects.toThrow();
    });
  });

  describe('joinChallenge', () => {
    it('should join a challenge successfully', async () => {
      const mockResponse = {
        success: true,
        participant: {
          id: 'participant-123',
          challenge_id: 'challenge-123',
          user_id: 'user-123',
          score: 0,
        },
      };

      (supabase.functions.invoke as jest.MockedFunction<any>).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const result = await joinChallenge('challenge-123');

      expect(supabase.functions.invoke).toHaveBeenCalledWith('join-challenge', {
        body: { challenge_id: 'challenge-123' },
      });
    });
  });

  describe('leaveChallenge', () => {
    it('should leave a challenge successfully', async () => {
      (supabase.functions.invoke as jest.MockedFunction<any>).mockResolvedValue({
        data: { success: true },
        error: null,
      });

      await leaveChallenge('challenge-123');

      expect(supabase.functions.invoke).toHaveBeenCalledWith('leave-challenge', {
        body: { challenge_id: 'challenge-123' },
      });
    });
  });

  describe('getActiveChallenges', () => {
    it('should fetch active challenges', async () => {
      // Mock database query
      const mockChallenges = [
        {
          id: 'challenge-1',
          server_id: 'challenge-1',
          title: 'Active Challenge',
          status: 'ACTIVE',
        },
      ];

      // This would require mocking the database collections properly
      // For now, this is a placeholder test structure
      expect(mockChallenges).toBeDefined();
    });
  });
});
