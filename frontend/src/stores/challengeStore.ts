/**
 * Challenge Store
 * Phase 2G: Social & Competition - Challenge System
 * 
 * Global state management for challenges
 */

import { create } from 'zustand';
import type Challenge from '../db/models/Challenge';
import type ChallengeParticipant from '../db/models/ChallengeParticipant';
import {
  getActiveChallenges,
  getUserChallenges,
  getChallengeDetails,
  createChallenge,
  joinChallenge,
  leaveChallenge,
  type CreateChallengeInput,
} from '../services/challenges';
import { useAuthStore } from './authStore';
import { syncDatabase } from '../db/sync';
import { logError } from '../utils/errorHandler';

interface ChallengeStore {
  // State
  activeChallenges: Challenge[];
  myChallenges: Challenge[];
  currentChallenge: Challenge | null;
  currentChallengeParticipants: ChallengeParticipant[];
  userParticipant: ChallengeParticipant | null;
  loading: boolean;
  error: string | null;

  // Actions
  loadActiveChallenges: () => Promise<void>;
  loadMyChallenges: () => Promise<void>;
  loadChallengeDetails: (challengeId: string) => Promise<void>;
  createChallenge: (data: CreateChallengeInput) => Promise<Challenge>;
  joinChallenge: (challengeId: string) => Promise<void>;
  leaveChallenge: (challengeId: string) => Promise<void>;
  refreshChallenge: (challengeId: string) => Promise<void>;
  clearError: () => void;
}

export const useChallengeStore = create<ChallengeStore>((set, get) => ({
  // Initial state
  activeChallenges: [],
  myChallenges: [],
  currentChallenge: null,
  currentChallengeParticipants: [],
  userParticipant: null,
  loading: false,
  error: null,

  // Load active challenges
  loadActiveChallenges: async () => {
    set({ loading: true, error: null });
    try {
      const challenges = await getActiveChallenges();
      set({ activeChallenges: challenges, loading: false });
    } catch (error) {
      logError(error, 'challengeStore_loadActiveChallenges');
      set({
        error: error instanceof Error ? error.message : 'Failed to load challenges',
        loading: false,
      });
    }
  },

  // Load user's challenges
  loadMyChallenges: async () => {
    const { user } = useAuthStore.getState();
    if (!user?.id) {
      set({ myChallenges: [], loading: false });
      return;
    }

    set({ loading: true, error: null });
    try {
      const challenges = await getUserChallenges(user.id);
      set({ myChallenges: challenges, loading: false });
    } catch (error) {
      logError(error, 'challengeStore_loadMyChallenges');
      set({
        error: error instanceof Error ? error.message : 'Failed to load challenges',
        loading: false,
      });
    }
  },

  // Load challenge details
  loadChallengeDetails: async (challengeId: string) => {
    const { user } = useAuthStore.getState();
    if (!user?.id) {
      set({ error: 'User not authenticated', loading: false });
      return;
    }

    set({ loading: true, error: null });
    try {
      const details = await getChallengeDetails(challengeId, user.id);
      set({
        currentChallenge: details.challenge,
        currentChallengeParticipants: details.participants,
        userParticipant: details.userParticipant,
        loading: false,
      });
    } catch (error) {
      logError(error, 'challengeStore_loadChallengeDetails');
      set({
        error: error instanceof Error ? error.message : 'Failed to load challenge',
        loading: false,
      });
    }
  },

  // Create challenge
  createChallenge: async (data: CreateChallengeInput) => {
    set({ loading: true, error: null });
    try {
      const challenge = await createChallenge(data);
      
      // Sync to get the challenge in local DB
      await syncDatabase();
      
      // Refresh active challenges
      await get().loadActiveChallenges();
      
      set({ loading: false });
      return challenge;
    } catch (error) {
      logError(error, 'challengeStore_createChallenge');
      set({
        error: error instanceof Error ? error.message : 'Failed to create challenge',
        loading: false,
      });
      throw error;
    }
  },

  // Join challenge
  joinChallenge: async (challengeId: string) => {
    set({ loading: true, error: null });
    try {
      await joinChallenge(challengeId);
      
      // Sync to update local DB
      await syncDatabase();
      
      // Refresh challenge details if currently viewing
      const { currentChallenge } = get();
      if (currentChallenge?.serverId === challengeId) {
        await get().loadChallengeDetails(challengeId);
      }
      
      // Refresh active challenges
      await get().loadActiveChallenges();
      
      set({ loading: false });
    } catch (error) {
      logError(error, 'challengeStore_joinChallenge');
      set({
        error: error instanceof Error ? error.message : 'Failed to join challenge',
        loading: false,
      });
      throw error;
    }
  },

  // Leave challenge
  leaveChallenge: async (challengeId: string) => {
    set({ loading: true, error: null });
    try {
      await leaveChallenge(challengeId);
      
      // Sync to update local DB
      await syncDatabase();
      
      // Refresh challenge details if currently viewing
      const { currentChallenge } = get();
      if (currentChallenge?.serverId === challengeId) {
        await get().loadChallengeDetails(challengeId);
      }
      
      // Refresh active challenges
      await get().loadActiveChallenges();
      
      set({ loading: false });
    } catch (error) {
      logError(error, 'challengeStore_leaveChallenge');
      set({
        error: error instanceof Error ? error.message : 'Failed to leave challenge',
        loading: false,
      });
      throw error;
    }
  },

  // Refresh challenge
  refreshChallenge: async (challengeId: string) => {
    await syncDatabase();
    await get().loadChallengeDetails(challengeId);
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },
}));
