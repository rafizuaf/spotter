import { create } from 'zustand';
import { supabase, signIn, signUp, signOut, getSession } from '../services/supabase';
import { initializePurchases, resetPurchases } from '../services/purchases';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  initialize: async () => {
    try {
      set({ isLoading: true });

      // Get current session
      const session = await getSession();

      if (session) {
        set({
          user: session.user,
          session,
          isInitialized: true,
          isLoading: false,
        });
      } else {
        set({
          user: null,
          session: null,
          isInitialized: true,
          isLoading: false,
        });
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange((event, session) => {
        set({
          user: session?.user ?? null,
          session,
        });
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({
        isInitialized: true,
        isLoading: false,
        error: 'Failed to initialize authentication',
      });
    }
  },

  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });

      const { user, session } = await signIn(email, password);

      // Initialize RevenueCat after successful login
      if (user?.id) {
        initializePurchases(user.id).catch((error) => {
          console.error('Failed to initialize RevenueCat after login:', error);
          // Don't block login if RevenueCat fails
        });
      }

      set({
        user,
        session,
        isLoading: false,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Login failed';
      set({
        isLoading: false,
        error: message,
      });
      throw error;
    }
  },

  register: async (email: string, password: string, username: string) => {
    try {
      set({ isLoading: true, error: null });

      const { user, session } = await signUp(email, password, username);

      // Initialize RevenueCat after successful registration
      if (user?.id) {
        initializePurchases(user.id).catch((error) => {
          console.error('Failed to initialize RevenueCat after registration:', error);
          // Don't block registration if RevenueCat fails
        });
      }

      set({
        user,
        session,
        isLoading: false,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      set({
        isLoading: false,
        error: message,
      });
      throw error;
    }
  },

  logout: async () => {
    try {
      set({ isLoading: true, error: null });

      // Reset RevenueCat before signing out
      resetPurchases().catch((error) => {
        console.error('Failed to reset RevenueCat on logout:', error);
        // Don't block logout if RevenueCat fails
      });

      await signOut();

      set({
        user: null,
        session: null,
        isLoading: false,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Logout failed';
      set({
        isLoading: false,
        error: message,
      });
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));

export default useAuthStore;
