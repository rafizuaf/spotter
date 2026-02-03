/**
 * Structured Logger
 * 
 * B8: Provides debug/info/warn/error log levels with remote enable for production debugging.
 * Integrates with monitoring service (Sentry) for error tracking.
 */

import * as Sentry from '@sentry/react-native';
import { database } from '../db';
import type UserSettings from '../db/models/UserSettings';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  minLevel: LogLevel;
  enabledForUser?: string; // User ID for remote debug
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private config: LoggerConfig = {
    minLevel: __DEV__ ? 'debug' : 'info',
  };

  /**
   * Set logger configuration
   */
  setConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Enable debug logging for a specific user (remote debugging)
   */
  async enableDebugForUser(userId: string): Promise<void> {
    this.config.enabledForUser = userId;
    this.config.minLevel = 'debug';
    
    // Also update user_settings for persistence
    try {
      const userSettingsCollection = database.collections.get<UserSettings>('user_settings');
      const userSettings = await userSettingsCollection
        .query()
        .fetch();
      
      if (userSettings.length > 0) {
        const settings = userSettings[0];
        await database.write(async () => {
          await settings.update((record) => {
            record.debugLoggingEnabled = true;
          });
        });
      }
    } catch (error) {
      // If user_settings doesn't exist yet or update fails, continue anyway
      console.warn('[Logger] Failed to persist debug flag:', error);
    }
  }

  /**
   * Check if a log level should be output
   */
  private shouldLog(level: LogLevel, userId?: string): boolean {
    const levelValue = LOG_LEVELS[level];
    const minLevelValue = LOG_LEVELS[this.config.minLevel];
    
    // Always log if level is at or above minimum
    if (levelValue >= minLevelValue) {
      return true;
    }
    
    // In production, allow debug logs if enabled for specific user
    if (!__DEV__ && level === 'debug' && userId && this.config.enabledForUser === userId) {
      return true;
    }
    
    return false;
  }

  /**
   * Format log message with context
   */
  private formatMessage(level: LogLevel, message: string, context?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${level.toUpperCase()}] ${timestamp}`;
    
    if (context && Object.keys(context).length > 0) {
      return `${prefix} ${message} ${JSON.stringify(context)}`;
    }
    
    return `${prefix} ${message}`;
  }

  /**
   * Debug log (development only, or if enabled for user)
   */
  debug(message: string, context?: Record<string, unknown>, userId?: string): void {
    if (!this.shouldLog('debug', userId)) {
      return;
    }
    
    const formatted = this.formatMessage('debug', message, context);
    console.log(formatted);
    
    // Debug logs don't go to Sentry
  }

  /**
   * Info log
   */
  info(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog('info')) {
      return;
    }
    
    const formatted = this.formatMessage('info', message, context);
    console.log(formatted);
    
    // Send to Sentry as breadcrumb in production
    if (!__DEV__) {
      Sentry.addBreadcrumb({
        category: 'log',
        message,
        level: 'info',
        data: context,
      });
    }
  }

  /**
   * Warning log
   */
  warn(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog('warn')) {
      return;
    }
    
    const formatted = this.formatMessage('warn', message, context);
    console.warn(formatted);
    
    // Send to Sentry as breadcrumb in production
    if (!__DEV__) {
      Sentry.addBreadcrumb({
        category: 'log',
        message,
        level: 'warning',
        data: context,
      });
    }
  }

  /**
   * Error log
   */
  error(message: string, error?: unknown, context?: Record<string, unknown>): void {
    if (!this.shouldLog('error')) {
      return;
    }
    
    const formatted = this.formatMessage('error', message, context);
    console.error(formatted, error);
    
    // Send to Sentry in production
    if (!__DEV__) {
      const errorToLog = error instanceof Error 
        ? error 
        : new Error(message);
      
      Sentry.captureException(errorToLog, {
        extra: {
          message,
          ...context,
        },
      });
    }
  }
}

// Singleton instance
export const logger = new Logger();

// Initialize logger config from user_settings on app start (if available)
export async function initializeLogger(userId?: string): Promise<void> {
  if (!userId) {
    return;
  }
  
  try {
    const userSettingsCollection = database.collections.get<UserSettings>('user_settings');
    const userSettings = await userSettingsCollection
      .query()
      .fetch();
    
    if (userSettings.length > 0) {
      const settings = userSettings[0];
      if (settings.debugLoggingEnabled) {
        logger.enableDebugForUser(userId);
      }
    }
  } catch (error) {
    // If user_settings doesn't exist yet, continue with defaults
    console.warn('[Logger] Failed to initialize from user_settings:', error);
  }
}
