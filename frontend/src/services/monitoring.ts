/**
 * Monitoring Service
 * 
 * Centralized monitoring for errors, performance, and analytics
 * 
 * B8: Integrated with structured logger (logger.ts)
 */

import * as Sentry from '@sentry/react-native';
import { logger } from '../utils/logger';

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
    logger.info('Monitoring initialized in development mode');
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
  // B8: Use structured logger instead of console.error
  logger.error('Error logged to monitoring', error, context);
  
  // Sentry capture is handled by logger.error() in production
  if (!__DEV__) {
    Sentry.captureException(error, {
      extra: context,
    });
  }
}

/**
 * Log performance metric
 */
export function logPerformance(metric: PerformanceMetric): void {
  // B8: Use structured logger
  logger.info(`Performance: ${metric.name}`, {
    duration: metric.duration,
    ...metric.metadata,
  });
  
  // Sentry breadcrumb is handled by logger.info() in production
  if (!__DEV__) {
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
}

/**
 * Track analytics event
 * 
 * Supports multiple analytics providers:
 * - Sentry (always enabled for breadcrumbs)
 * - Optional: Amplitude, Mixpanel, etc. (configure via env vars)
 */
export function trackEvent(event: AnalyticsEvent): void {
  // B8: Use structured logger
  logger.info(`Analytics: ${event.name}`, event.properties);
  
  // Sentry breadcrumb is handled by logger.info() in production
  if (!__DEV__) {
    Sentry.addBreadcrumb({
      category: 'analytics',
      message: event.name,
      level: 'info',
      data: event.properties,
    });
  }

  // Optional: Integrate with third-party analytics services
  // Example: Amplitude, Mixpanel, etc.
  // Uncomment and configure as needed:
  
  // const amplitudeApiKey = process.env.EXPO_PUBLIC_AMPLITUDE_API_KEY;
  // if (amplitudeApiKey) {
  //   // Initialize Amplitude and track event
  //   // Amplitude.getInstance().logEvent(event.name, event.properties);
  // }

  // const mixpanelToken = process.env.EXPO_PUBLIC_MIXPANEL_TOKEN;
  // if (mixpanelToken) {
  //   // Initialize Mixpanel and track event
  //   // Mixpanel.track(event.name, event.properties);
  // }
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
