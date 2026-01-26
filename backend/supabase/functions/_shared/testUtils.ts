/**
 * Test Utilities for Edge Functions
 * 
 * Helper functions for testing edge functions
 */

import { createClient } from "jsr:@supabase/supabase-js";

/**
 * Create a mock Supabase client for testing
 */
export function createMockSupabaseClient() {
  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      }),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
    functions: {
      invoke: jest.fn().mockResolvedValue({ data: {}, error: null }),
    },
  };
}

/**
 * Create a mock request for testing
 */
export function createMockRequest(
  method: string = 'POST',
  body?: unknown,
  headers?: Record<string, string>
): Request {
  return new Request('http://localhost', {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}
