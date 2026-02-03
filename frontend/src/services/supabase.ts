import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

// Supabase configuration
// Replace these with your actual Supabase project URL and publishable key
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'YOUR_SUPABASE_PUBLISHABLE_KEY';

// Custom storage adapter for Expo SecureStore
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

// Create Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Auth helper functions
export const signUp = async (email: string, password: string, username: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
      },
    },
  });

  if (error) throw error;
  return data;
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
};

// Subscribe to auth state changes
export const onAuthStateChange = (callback: (event: string, session: unknown) => void) => {
  return supabase.auth.onAuthStateChange(callback);
};

// Social login (OAuth) helper function
type OAuthProvider = 'google' | 'facebook' | 'apple';

export const signInWithOAuth = async (provider: OAuthProvider) => {
  const redirectUrl = Linking.createURL('auth-callback');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true,
    },
  });

  if (error) throw error;
  if (!data.url) throw new Error('No OAuth URL returned');

  const result = await WebBrowser.openAuthSessionAsync(
    data.url,
    redirectUrl
  );

  if (result.type === 'success') {
    // Parse tokens from redirect URL
    // Supabase redirects with tokens in hash fragment: #access_token=...&refresh_token=...
    const url = result.url;
    const hashIndex = url.indexOf('#');
    const queryIndex = url.indexOf('?');

    // Extract hash fragment or query string
    const fragment = hashIndex !== -1 ? url.substring(hashIndex + 1) :
      queryIndex !== -1 ? url.substring(queryIndex + 1) : '';

    const params = new URLSearchParams(fragment);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken && refreshToken) {
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (sessionError) throw sessionError;
    } else {
      throw new Error('No tokens found in OAuth redirect');
    }
  } else if (result.type === 'cancel') {
    throw new Error('OAuth sign-in was cancelled');
  } else {
    throw new Error('OAuth sign-in failed');
  }

  return supabase.auth.getSession();
};

export default supabase;
