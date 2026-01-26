/**
 * Monitoring Service
 * 
 * Centralized monitoring for errors, performance, and analytics
 */

import * as Sentry from '@sentry/react-native';

interface PerformanceMetric {
  name: string;
  duration: number;
  metadata?: Record<string, unknown>;
}

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, unknown>;
}

/**
 * Initialize monitoring (Sentry, analytics, etc.)
 */
export function initializeMonitoring(): void {
  if (__DEV__) {
    console.log('[Monitoring] Initialized in development mode');
    return;
  }

  const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      debug: false,
      environment: __DEV__ ? 'development' : 'production',
      beforeSend(event) {
        // Filter out sensitive data
        if (event.request) {
          delete (event.request as { cookies?: unknown }).cookies;
          if (event.request.headers) {
            delete (event.request.headers as { Authorization?: string }).Authorization;
          }
        }
        return event;
      },
    });
  }
}

/**
 * Log error to monitoring service
 */
export function logError(error: Error, context?: Record<string, unknown>): void {
  if (__DEV__) {
    console.error('[Error]', error, context);
    return;
  }

  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Log performance metric
 */
export function logPerformance(metric: PerformanceMetric): void {
  if (__DEV__) {
    console.log(`[Performance] ${metric.name}: ${metric.duration}ms`, metric.metadata);
    return;
  }

  Sentry.addBreadcrumb({
    category: 'performance',
    message: metric.name,
    level: 'info',
    data: {
      duration: metric.duration,
      ...metric.metadata,
    },
  });
}

/**
 * Track analytics event
 */
export function trackEvent(event: AnalyticsEvent): void {
  if (__DEV__) {
    console.log('[Analytics]', event.name, event.properties);
    return;
  }

  // TODO: Integrate with analytics service (Amplitude, Mixpanel, etc.)
  Sentry.addBreadcrumb({
    category: 'analytics',
    message: event.name,
    level: 'info',
    data: event.properties,
  });
}

/**
 * Set user context for monitoring
 */
export function setUserContext(userId: string, username?: string): void {
  if (__DEV__) return;

  Sentry.setUser({
    id: userId,
    username,
  });
}

/**
 * Clear user context
 */
export function clearUserContext(): void {
  if (__DEV__) return;

  Sentry.setUser(null);
}

/**
 * Measure async function performance
 */
export async function measurePerformance<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    logPerformance({ name, duration });
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logPerformance({ name, duration, metadata: { error: true } });
    throw error;
  }
}
