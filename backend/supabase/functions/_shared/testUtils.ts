/**
 * Test Utilities for Edge Functions
 * 
 * B6: Deno-compatible mocking utilities for testing Supabase Edge Functions
 * 
 * Replaces Jest-based mocks with Deno-compatible implementations
 */

/**
 * Deno-compatible mock function factory
 */
export function createMockFn<T = unknown>() {
  const calls: unknown[][] = [];
  let returnValue: T | undefined = undefined;
  let resolvedValue: Promise<T> | undefined = undefined;

  const fn = ((...args: unknown[]): T => {
    calls.push(args);
    if (resolvedValue !== undefined) {
      return resolvedValue as unknown as T;
    }
    return returnValue as T;
  }) as MockFn<T>;

  fn.calls = calls;
  fn._returnValue = returnValue;
  fn._resolvedValue = resolvedValue;

  fn.mockReturnValue = (value: T) => {
    returnValue = value;
    resolvedValue = undefined;
    return fn;
  };

  fn.mockResolvedValue = (value: T) => {
    resolvedValue = Promise.resolve(value);
    returnValue = undefined;
    return fn;
  };

  fn.mockRejectedValue = (error: unknown) => {
    resolvedValue = Promise.reject(error);
    returnValue = undefined;
    return fn;
  };

  fn.mockClear = () => {
    calls.length = 0;
    returnValue = undefined;
    resolvedValue = undefined;
  };

  return fn;
}

export interface MockFn<T = unknown> {
  (...args: unknown[]): T;
  calls: unknown[][];
  _returnValue: T | undefined;
  _resolvedValue: Promise<T> | undefined;
  mockReturnValue: (value: T) => MockFn<T>;
  mockResolvedValue: (value: T) => MockFn<T>;
  mockRejectedValue: (error: unknown) => MockFn<T>;
  mockClear: () => void;
}

/**
 * Mock Supabase client for testing
 */
export interface MockSupabaseClient {
  auth: {
    getUser: MockFn<{ data: { user: { id: string } | null } | null; error: { message: string } | null }>;
  };
  from: MockFn<MockQueryBuilder>;
  functions: {
    invoke: MockFn<{ data: unknown; error: { message: string } | null }>;
  };
}

export interface MockQueryBuilder {
  select: MockFn<MockQueryBuilder>;
  insert: MockFn<MockQueryBuilder>;
  update: MockFn<MockQueryBuilder>;
  upsert: MockFn<MockQueryBuilder>;
  delete: MockFn<MockQueryBuilder>;
  eq: MockFn<MockQueryBuilder>;
  in: MockFn<MockQueryBuilder>;
  single: MockFn<{ data: unknown | null; error: { message: string; code?: string } | null }>;
  limit: MockFn<MockQueryBuilder>;
  order: MockFn<MockQueryBuilder>;
}

/**
 * Create a mock Supabase client with configurable behavior
 */
export function createMockSupabaseClient(
  overrides?: Partial<MockSupabaseClient>
): MockSupabaseClient {
  const defaultGetUser = createMockFn<{ data: { user: { id: string } } | null; error: null }>();
  defaultGetUser.mockResolvedValue({
    data: { user: { id: 'test-user-id' } },
    error: null,
  });

  const defaultFrom = createMockFn<MockQueryBuilder>();
  const defaultQueryBuilder: MockQueryBuilder = {
    select: createMockFn<MockQueryBuilder>().mockReturnValue(defaultQueryBuilder),
    insert: createMockFn<MockQueryBuilder>().mockReturnValue(defaultQueryBuilder),
    update: createMockFn<MockQueryBuilder>().mockReturnValue(defaultQueryBuilder),
    upsert: createMockFn<MockQueryBuilder>().mockReturnValue(defaultQueryBuilder),
    delete: createMockFn<MockQueryBuilder>().mockReturnValue(defaultQueryBuilder),
    eq: createMockFn<MockQueryBuilder>().mockReturnValue(defaultQueryBuilder),
    in: createMockFn<MockQueryBuilder>().mockReturnValue(defaultQueryBuilder),
    single: createMockFn<{ data: unknown | null; error: { message: string; code?: string } | null }>()
      .mockResolvedValue({ data: null, error: null }),
    limit: createMockFn<MockQueryBuilder>().mockReturnValue(defaultQueryBuilder),
    order: createMockFn<MockQueryBuilder>().mockReturnValue(defaultQueryBuilder),
  };
  defaultFrom.mockReturnValue(defaultQueryBuilder);

  const defaultInvoke = createMockFn<{ data: unknown; error: null }>();
  defaultInvoke.mockResolvedValue({ data: {}, error: null });

  return {
    auth: {
      getUser: (overrides?.auth?.getUser as MockFn) || defaultGetUser,
    },
    from: (overrides?.from as MockFn) || defaultFrom,
    functions: {
      invoke: (overrides?.functions?.invoke as MockFn) || defaultInvoke,
    },
  };
}

/**
 * Create a mock Request object for testing
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

/**
 * Test user data factory
 */
export interface TestUser {
  id: string;
  email?: string;
  username?: string;
}

export function createTestUser(overrides?: Partial<TestUser>): TestUser {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    username: 'testuser',
    ...overrides,
  };
}

/**
 * Helper to create mock Supabase response
 */
export function createMockSupabaseResponse<T>(
  data: T | null = null,
  error: { message: string; code?: string } | null = null
): { data: T | null; error: { message: string; code?: string } | null } {
  return { data, error };
}

/**
 * Helper to create mock Supabase auth response
 */
export function createMockAuthResponse(
  userId: string | null = 'test-user-id',
  error: { message: string } | null = null
): { data: { user: { id: string } | null } | null; error: { message: string } | null } {
  return {
    data: userId ? { user: { id: userId } } : null,
    error,
  };
}
