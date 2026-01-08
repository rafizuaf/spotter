/**
 * Accessibility Utilities
 *
 * Provides utilities for improving app accessibility
 * including screen reader support, labels, and keyboard navigation.
 */

import { AccessibilityInfo, Platform } from 'react-native';

/**
 * Accessibility label generators for common UI patterns
 */
export const a11yLabels = {
  /**
   * Generate label for a button
   */
  button: (action: string): string => action,

  /**
   * Generate label for a workout card
   */
  workoutCard: (
    name: string,
    date: string,
    stats: { sets: number; exercises: number; duration: string }
  ): string =>
    `Workout: ${name}, completed ${date}. ${stats.sets} sets, ${stats.exercises} exercises, ${stats.duration} duration.`,

  /**
   * Generate label for a set
   */
  set: (
    exerciseName: string,
    weight: string,
    reps: number,
    isPR: boolean
  ): string => {
    const prText = isPR ? ', Personal Record!' : '';
    return `${exerciseName}, ${weight} for ${reps} reps${prText}`;
  },

  /**
   * Generate label for level progress
   */
  levelProgress: (
    level: number,
    xp: number,
    xpToNext: number
  ): string => {
    const progress = Math.round((xp / (xp + xpToNext)) * 100);
    return `Level ${level}, ${progress}% progress to next level, ${xp} XP earned, ${xpToNext} XP needed`;
  },

  /**
   * Generate label for a badge
   */
  badge: (
    title: string,
    description: string,
    earned: boolean,
    earnedDate?: string
  ): string => {
    if (earned && earnedDate) {
      return `Badge: ${title}, ${description}. Earned on ${earnedDate}`;
    }
    return `Badge: ${title}, ${description}. Not yet earned.`;
  },

  /**
   * Generate label for user profile
   */
  userProfile: (
    username: string,
    level: number,
    workouts: number,
    isFollowing?: boolean
  ): string => {
    const followText = isFollowing !== undefined
      ? `, ${isFollowing ? 'following' : 'not following'}`
      : '';
    return `${username}, Level ${level}, ${workouts} workouts${followText}`;
  },

  /**
   * Generate label for notification
   */
  notification: (
    type: string,
    title: string,
    time: string,
    isRead: boolean
  ): string => {
    const readText = isRead ? '' : ', unread';
    return `${type} notification${readText}: ${title}, ${time}`;
  },

  /**
   * Generate label for feed post
   */
  feedPost: (
    username: string,
    headline: string,
    time: string
  ): string => `${username}: ${headline}, ${time}`,

  /**
   * Generate label for input field
   */
  input: (fieldName: string, value: string, hint?: string): string => {
    const hintText = hint ? `, ${hint}` : '';
    const valueText = value ? `, current value: ${value}` : '';
    return `${fieldName}${hintText}${valueText}`;
  },

  /**
   * Generate label for toggle/switch
   */
  toggle: (name: string, isOn: boolean): string =>
    `${name}, ${isOn ? 'on' : 'off'}`,

  /**
   * Generate label for chart
   */
  chart: (
    dataType: string,
    trend: 'up' | 'down' | 'stable',
    latestValue: string
  ): string => {
    const trendText =
      trend === 'up'
        ? 'trending up'
        : trend === 'down'
        ? 'trending down'
        : 'stable';
    return `${dataType} chart, ${trendText}, latest value: ${latestValue}`;
  },
};

/**
 * Props helper for accessible buttons
 */
export interface AccessibleButtonProps {
  accessibilityLabel: string;
  accessibilityHint?: string;
  accessibilityRole: 'button';
  accessible: true;
}

export function getButtonA11yProps(
  label: string,
  hint?: string
): AccessibleButtonProps {
  return {
    accessible: true,
    accessibilityRole: 'button',
    accessibilityLabel: label,
    accessibilityHint: hint,
  };
}

/**
 * Props helper for accessible links
 */
export interface AccessibleLinkProps {
  accessibilityLabel: string;
  accessibilityHint?: string;
  accessibilityRole: 'link';
  accessible: true;
}

export function getLinkA11yProps(
  label: string,
  hint?: string
): AccessibleLinkProps {
  return {
    accessible: true,
    accessibilityRole: 'link',
    accessibilityLabel: label,
    accessibilityHint: hint,
  };
}

/**
 * Props helper for accessible images
 */
export interface AccessibleImageProps {
  accessibilityLabel: string;
  accessibilityRole: 'image';
  accessible: true;
}

export function getImageA11yProps(description: string): AccessibleImageProps {
  return {
    accessible: true,
    accessibilityRole: 'image',
    accessibilityLabel: description,
  };
}

/**
 * Props helper for accessible headers
 */
export interface AccessibleHeaderProps {
  accessibilityRole: 'header';
  accessible: true;
}

export function getHeaderA11yProps(): AccessibleHeaderProps {
  return {
    accessible: true,
    accessibilityRole: 'header',
  };
}

/**
 * Props helper for accessible progress indicators
 */
export interface AccessibleProgressProps {
  accessibilityLabel: string;
  accessibilityValue: {
    min: number;
    max: number;
    now: number;
    text?: string;
  };
  accessibilityRole: 'progressbar';
  accessible: true;
}

export function getProgressA11yProps(
  label: string,
  current: number,
  max: number,
  min: number = 0
): AccessibleProgressProps {
  const percentage = Math.round(((current - min) / (max - min)) * 100);
  return {
    accessible: true,
    accessibilityRole: 'progressbar',
    accessibilityLabel: label,
    accessibilityValue: {
      min,
      max,
      now: current,
      text: `${percentage}%`,
    },
  };
}

/**
 * Announce a message to screen readers
 */
export function announceForAccessibility(message: string): void {
  AccessibilityInfo.announceForAccessibility(message);
}

/**
 * Check if screen reader is enabled
 */
export async function isScreenReaderEnabled(): Promise<boolean> {
  return AccessibilityInfo.isScreenReaderEnabled();
}

/**
 * Check if reduce motion is enabled
 */
export async function isReduceMotionEnabled(): Promise<boolean> {
  return AccessibilityInfo.isReduceMotionEnabled();
}

/**
 * Contrast ratios for WCAG compliance
 * AA: 4.5:1 for normal text, 3:1 for large text
 * AAA: 7:1 for normal text, 4.5:1 for large text
 */
export const contrastColors = {
  // High contrast text colors
  textPrimary: '#ffffff', // White on dark background
  textSecondary: '#94a3b8', // Slate gray - meets AA for large text
  textMuted: '#64748b', // Muted - for decorative only
  textError: '#f87171', // Red - high contrast
  textSuccess: '#4ade80', // Green - high contrast
  textWarning: '#fbbf24', // Yellow - high contrast

  // Background colors
  bgPrimary: '#0f172a', // Dark blue
  bgSecondary: '#1e293b', // Slightly lighter
  bgElevated: '#334155', // Cards/modals

  // Interactive colors
  interactive: '#6366f1', // Indigo primary
  interactiveHover: '#818cf8', // Lighter on hover
  interactivePressed: '#4f46e5', // Darker when pressed
};

/**
 * Minimum touch target sizes (44x44 points per Apple HIG / 48x48 per Android)
 */
export const minTouchTarget = {
  ios: 44,
  android: 48,
  current: Platform.OS === 'android' ? 48 : 44,
};

/**
 * Font size scaling support
 * These are base sizes that will scale with user's font settings
 */
export const fontSizes = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
};

/**
 * Live region props for dynamic content updates
 */
export interface LiveRegionProps {
  accessibilityLiveRegion: 'none' | 'polite' | 'assertive';
}

export function getLiveRegionProps(
  priority: 'none' | 'polite' | 'assertive' = 'polite'
): LiveRegionProps {
  return {
    accessibilityLiveRegion: priority,
  };
}

/**
 * State description for accessibility
 */
export interface AccessibilityStateProps {
  accessibilityState: {
    disabled?: boolean;
    selected?: boolean;
    checked?: boolean | 'mixed';
    busy?: boolean;
    expanded?: boolean;
  };
}

export function getStateA11yProps(state: {
  disabled?: boolean;
  selected?: boolean;
  checked?: boolean | 'mixed';
  busy?: boolean;
  expanded?: boolean;
}): AccessibilityStateProps {
  return {
    accessibilityState: state,
  };
}
