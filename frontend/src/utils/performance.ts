/**
 * Performance Optimization Utilities
 *
 * Provides memoization, debouncing, and other performance utilities
 * for the Spotter app.
 */

/**
 * Creates a memoized version of an expensive function
 * Uses a Map cache with configurable max size and TTL
 */
export function memoize<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => TResult,
  options: {
    maxSize?: number;
    ttlMs?: number;
    keyFn?: (...args: TArgs) => string;
  } = {}
): (...args: TArgs) => TResult {
  const { maxSize = 100, ttlMs = 5 * 60 * 1000, keyFn } = options;

  const cache = new Map<
    string,
    { value: TResult; timestamp: number }
  >();

  return (...args: TArgs): TResult => {
    const key = keyFn ? keyFn(...args) : JSON.stringify(args);
    const now = Date.now();
    const cached = cache.get(key);

    // Return cached value if valid
    if (cached && now - cached.timestamp < ttlMs) {
      return cached.value;
    }

    // Compute new value
    const value = fn(...args);

    // Evict oldest entries if cache is full
    if (cache.size >= maxSize) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey !== undefined) {
        cache.delete(oldestKey);
      }
    }

    cache.set(key, { value, timestamp: now });
    return value;
  };
}

/**
 * Creates a debounced version of a function
 * Useful for search inputs and expensive callbacks
 */
export function debounce<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  delayMs: number
): (...args: TArgs) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: TArgs) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delayMs);
  };
}

/**
 * Creates a throttled version of a function
 * Ensures function is called at most once per specified interval
 */
export function throttle<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  limitMs: number
): (...args: TArgs) => void {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: TArgs) => {
    const now = Date.now();
    const remaining = limitMs - (now - lastCall);

    if (remaining <= 0) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      lastCall = now;
      fn(...args);
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        fn(...args);
        timeoutId = null;
      }, remaining);
    }
  };
}

/**
 * Batch multiple state updates into a single update
 * Useful for reducing re-renders when updating multiple related states
 */
export function batchUpdates<T>(
  updates: Array<() => T>,
  onComplete?: (results: T[]) => void
): void {
  // React Native automatically batches updates in event handlers
  // This utility is for explicit batching in async code
  const results: T[] = [];
  for (const update of updates) {
    results.push(update());
  }
  onComplete?.(results);
}

/**
 * Calculate 1RM (One Rep Max) using Epley formula
 * Memoized for performance with repeated calculations
 */
export const calculate1RM = memoize(
  (weightKg: number, reps: number): number => {
    if (reps <= 0 || weightKg <= 0) return 0;
    if (reps === 1) return weightKg;
    // Epley formula: 1RM = w(1 + r/30)
    return weightKg * (1 + reps / 30);
  },
  { maxSize: 500, ttlMs: 60 * 60 * 1000 } // Cache for 1 hour
);

/**
 * Calculate Wilks score
 * Memoized for performance
 */
export const calculateWilks = memoize(
  (totalKg: number, bodyweightKg: number, isMale: boolean): number => {
    if (totalKg <= 0 || bodyweightKg <= 0) return 0;

    // Wilks coefficient calculation
    const x = bodyweightKg;
    let coeff: number;

    if (isMale) {
      const a = -216.0475144;
      const b = 16.2606339;
      const c = -0.002388645;
      const d = -0.00113732;
      const e = 7.01863e-6;
      const f = -1.291e-8;
      coeff = 500 / (a + b * x + c * x ** 2 + d * x ** 3 + e * x ** 4 + f * x ** 5);
    } else {
      const a = 594.31747775582;
      const b = -27.23842536447;
      const c = 0.82112226871;
      const d = -0.00930733913;
      const e = 4.731582e-5;
      const f = -9.054e-8;
      coeff = 500 / (a + b * x + c * x ** 2 + d * x ** 3 + e * x ** 4 + f * x ** 5);
    }

    return totalKg * coeff;
  },
  { maxSize: 200, ttlMs: 60 * 60 * 1000 }
);

/**
 * Format relative time (e.g., "2 hours ago")
 * Memoized with short TTL for frequently displayed timestamps
 */
export const formatRelativeTime = memoize(
  (date: Date | string | number): string => {
    const now = Date.now();
    const timestamp = new Date(date).getTime();
    const diffMs = now - timestamp;

    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);

    if (months > 0) return `${months}mo ago`;
    if (weeks > 0) return `${weeks}w ago`;
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  },
  { maxSize: 100, ttlMs: 60 * 1000 } // Cache for 1 minute
);

/**
 * Format duration in seconds to readable string
 */
export const formatDuration = memoize(
  (seconds: number): string => {
    if (seconds < 0) return '0:00';

    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  },
  { maxSize: 200, ttlMs: 60 * 60 * 1000 }
);

/**
 * Convert weight between kg and lbs
 * Memoized for repeated conversions
 */
export const convertWeight = memoize(
  (value: number, from: 'kg' | 'lbs', to: 'kg' | 'lbs'): number => {
    if (from === to) return value;
    if (from === 'kg' && to === 'lbs') return value * 2.20462;
    return value / 2.20462; // lbs to kg
  },
  { maxSize: 500, ttlMs: 24 * 60 * 60 * 1000 } // Cache for 24 hours
);

/**
 * Performance measurement utility
 * Measures execution time of async functions
 */
export async function measurePerformance<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  if (__DEV__) {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    console.log(`[Perf] ${name}: ${duration.toFixed(2)}ms`);
    return result;
  }
  return fn();
}

/**
 * Chunk an array for batch processing
 * Useful for processing large datasets without blocking UI
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Process array in batches with delay to prevent UI blocking
 */
export async function processInBatches<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  options: { batchSize?: number; delayMs?: number } = {}
): Promise<R[]> {
  const { batchSize = 10, delayMs = 0 } = options;
  const chunks = chunkArray(items, batchSize);
  const results: R[] = [];

  for (const chunk of chunks) {
    const chunkResults = await Promise.all(chunk.map(processor));
    results.push(...chunkResults);
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}
