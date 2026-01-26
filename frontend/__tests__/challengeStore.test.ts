/**
 * ChallengeStore Tests
 * 
 * Tests for challenge state management
 */

import { useChallengeStore } from '../src/stores/challengeStore';

// Mock dependencies
jest.mock('../src/services/challenges', () => ({
  createChallenge: jest.fn(),
  joinChallenge: jest.fn(),
  leaveChallenge: jest.fn(),
  getChallenges: jest.fn(),
}));

jest.mock('../src/db/sync', () => ({
  syncDatabase: jest.fn().mockResolvedValue(undefined),
}));

describe('ChallengeStore', () => {
  beforeEach(() => {
    // Store state is managed internally, no need to reset
  });

  describe('Challenge Management', () => {
    it('should initialize with empty challenges', () => {
      const store = useChallengeStore.getState();
      expect(store.activeChallenges).toEqual([]);
      expect(store.myChallenges).toEqual([]);
    });

    it('should load active challenges', async () => {
      const store = useChallengeStore.getState();
      // Mock the service call
      await store.loadActiveChallenges();
      // Verify loading state changes
      expect(store.loading).toBe(false);
    });
  });
});
