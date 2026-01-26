/**
 * SubscriptionStore Tests
 * 
 * Tests for subscription tier management
 */

import { useSubscriptionStore } from '../src/stores/subscriptionStore';

// Mock dependencies
jest.mock('../src/services/purchases', () => ({
  getOfferings: jest.fn(),
  purchasePackage: jest.fn(),
  restorePurchases: jest.fn(),
}));

jest.mock('../src/db/sync', () => ({
  syncDatabase: jest.fn().mockResolvedValue(undefined),
}));

describe('SubscriptionStore', () => {
  beforeEach(() => {
    // Reset store state
    useSubscriptionStore.setState({
      tier: 'FREE',
      isLoading: false,
      error: null,
    });
  });

  describe('Tier Management', () => {
    it('should initialize with FREE tier', () => {
      const store = useSubscriptionStore.getState();
      expect(store.tier).toBe('FREE');
    });

    it('should check tier access', () => {
      const store = useSubscriptionStore.getState();
      // Store doesn't have setTier - tier comes from server
      // Test canAccess instead
      expect(store.canAccess('FREE')).toBe(true);
    });
  });

  describe('Tier Limits', () => {
    it('should use TIER_LIMITS constants', () => {
      // Test that TIER_LIMITS are correctly defined
      const { TIER_LIMITS } = require('../src/stores/subscriptionStore');
      
      expect(TIER_LIMITS.FREE.maxRoutines).toBe(3);
      expect(TIER_LIMITS.FREE.maxCustomExercises).toBe(7);
      expect(TIER_LIMITS.PRO.maxRoutines).toBe(10);
      expect(TIER_LIMITS.ELITE.maxRoutines).toBe(Infinity);
    });
  });
});
