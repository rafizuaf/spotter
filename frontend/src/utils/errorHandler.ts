/**
 * Centralized error handling utilities
 */

export interface AppError {
  code: string;
  message: string;
  userMessage: string;
  originalError?: unknown;
}

// Error codes for different scenarios
export const ErrorCodes = {
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  SERVER_ERROR: 'SERVER_ERROR',

  // Auth errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',

  // Database errors
  DB_ERROR: 'DB_ERROR',
  SYNC_ERROR: 'SYNC_ERROR',
  NOT_FOUND: 'NOT_FOUND',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  REQUIRED_FIELD: 'REQUIRED_FIELD',

  // Generic
  UNKNOWN: 'UNKNOWN',
} as const;

// User-friendly messages for each error code
const USER_MESSAGES: Record<string, string> = {
  [ErrorCodes.NETWORK_ERROR]: 'Unable to connect. Please check your internet connection.',
  [ErrorCodes.TIMEOUT]: 'Request timed out. Please try again.',
  [ErrorCodes.SERVER_ERROR]: 'Something went wrong on our end. Please try again later.',
  [ErrorCodes.UNAUTHORIZED]: 'Please log in to continue.',
  [ErrorCodes.SESSION_EXPIRED]: 'Your session has expired. Please log in again.',
  [ErrorCodes.INVALID_CREDENTIALS]: 'Invalid email or password.',
  [ErrorCodes.DB_ERROR]: 'Failed to save data. Please try again.',
  [ErrorCodes.SYNC_ERROR]: 'Failed to sync data. Your changes will be saved locally.',
  [ErrorCodes.NOT_FOUND]: 'The requested item was not found.',
  [ErrorCodes.VALIDATION_ERROR]: 'Please check your input and try again.',
  [ErrorCodes.REQUIRED_FIELD]: 'Please fill in all required fields.',
  [ErrorCodes.UNKNOWN]: 'Something went wrong. Please try again.',
};

/**
 * Parse an error into a standardized AppError format
 */
export function parseError(error: unknown): AppError {
  // Already an AppError
  if (isAppError(error)) {
    return error;
  }

  // Network/fetch errors
  if (error instanceof TypeError && error.message.includes('Network')) {
    return createAppError(ErrorCodes.NETWORK_ERROR, error.message, error);
  }

  // Supabase errors
  if (isSupabaseError(error)) {
    const supabaseError = error as { code?: string; message?: string };

    if (supabaseError.code === 'PGRST301' || supabaseError.message?.includes('JWT')) {
      return createAppError(ErrorCodes.SESSION_EXPIRED, supabaseError.message || '', error);
    }

    if (supabaseError.code === '23505') {
      return createAppError(ErrorCodes.VALIDATION_ERROR, 'This record already exists', error);
    }

    return createAppError(ErrorCodes.SERVER_ERROR, supabaseError.message || '', error);
  }

  // Standard Error object
  if (error instanceof Error) {
    // Check for common error patterns
    if (error.message.includes('timeout')) {
      return createAppError(ErrorCodes.TIMEOUT, error.message, error);
    }

    if (error.message.includes('unauthorized') || error.message.includes('401')) {
      return createAppError(ErrorCodes.UNAUTHORIZED, error.message, error);
    }

    return createAppError(ErrorCodes.UNKNOWN, error.message, error);
  }

  // String error
  if (typeof error === 'string') {
    return createAppError(ErrorCodes.UNKNOWN, error, error);
  }

  // Unknown error type
  return createAppError(ErrorCodes.UNKNOWN, 'An unknown error occurred', error);
}

/**
 * Create an AppError object
 */
export function createAppError(
  code: string,
  message: string,
  originalError?: unknown
): AppError {
  return {
    code,
    message,
    userMessage: USER_MESSAGES[code] || USER_MESSAGES[ErrorCodes.UNKNOWN],
    originalError,
  };
}

/**
 * Type guard for AppError
 */
export function isAppError(error: unknown): error is AppError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'userMessage' in error
  );
}

/**
 * Type guard for Supabase errors
 */
function isSupabaseError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    ('code' in error || 'message' in error) &&
    !('userMessage' in error)
  );
}

/**
 * Log error to console (and potentially to a monitoring service)
 */
export function logError(error: unknown, context?: string): void {
  const appError = parseError(error);

  console.error(`[Error${context ? ` - ${context}` : ''}]`, {
    code: appError.code,
    message: appError.message,
    userMessage: appError.userMessage,
    originalError: appError.originalError,
  });

  // TODO: Send to error monitoring service (Sentry, etc.)
}

/**
 * Wrap an async function with error handling
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context?: string
): Promise<{ success: true; data: T } | { success: false; error: AppError }> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    logError(error, context);
    return { success: false, error: parseError(error) };
  }
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    context?: string;
  } = {}
): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 1000, maxDelayMs = 10000, context } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      logError(error, `${context || 'retry'} - attempt ${attempt}/${maxAttempts}`);

      if (attempt < maxAttempts) {
        // Exponential backoff with jitter
        const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
        const jitter = Math.random() * 0.3 * delay;
        await new Promise((resolve) => setTimeout(resolve, delay + jitter));
      }
    }
  }

  throw lastError;
}
