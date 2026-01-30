/**
 * Shortcuts Service
 * 
 * Handles deep linking from Siri/Google Assistant shortcuts
 * 
 * Note: Full implementation requires native code for intent definitions.
 * This service handles the deep link routing once the app is opened.
 */

import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { logError } from '../utils/errorHandler';

export interface ShortcutParams {
  action: 'start_workout' | 'log_set' | 'show_stats';
  routineId?: string;
  exerciseId?: string;
  exerciseName?: string;
  weight?: number;
  reps?: number;
}

/**
 * Parse deep link URL from shortcut
 * Format: spotter://shortcut?action=start_workout&routineId=123
 */
export function parseShortcutUrl(url: string): ShortcutParams | null {
  try {
    const parsed = Linking.parse(url);
    if (parsed.hostname !== 'shortcut') return null;

    const action = parsed.queryParams?.action as string;
    if (!action) return null;

    const params: ShortcutParams = {
      action: action as ShortcutParams['action'],
    };

    if (parsed.queryParams?.routineId) {
      params.routineId = parsed.queryParams.routineId as string;
    }

    if (parsed.queryParams?.exerciseId) {
      params.exerciseId = parsed.queryParams.exerciseId as string;
    }

    if (parsed.queryParams?.exerciseName) {
      params.exerciseName = parsed.queryParams.exerciseName as string;
    }

    if (parsed.queryParams?.weight) {
      params.weight = parseFloat(parsed.queryParams.weight as string);
    }

    if (parsed.queryParams?.reps) {
      params.reps = parseInt(parsed.queryParams.reps as string, 10);
    }

    return params;
  } catch (error) {
    logError(error, 'shortcuts_parseUrl');
    return null;
  }
}

/**
 * Handle shortcut action and navigate to appropriate screen
 */
export function handleShortcut(params: ShortcutParams): void {
  switch (params.action) {
    case 'start_workout':
      // Navigate to workout screen with optional routine
      if (params.routineId) {
        router.push(`/(tabs)/workout?routine=${params.routineId}`);
      } else {
        router.push('/(tabs)/workout');
      }
      break;

    case 'log_set':
      // Navigate to workout screen with exercise and set pre-filled
      const setParams = new URLSearchParams();
      if (params.exerciseId) setParams.set('exercise', params.exerciseId);
      if (params.exerciseName) setParams.set('exerciseName', params.exerciseName);
      if (params.weight) setParams.set('weight', params.weight.toString());
      if (params.reps) setParams.set('reps', params.reps.toString());
      router.push(`/(tabs)/workout?${setParams.toString()}`);
      break;

    case 'show_stats':
      // Navigate to profile/progress screen
      router.push('/(tabs)/profile');
      break;

    default:
      logError(new Error(`Unknown shortcut action: ${params.action}`), 'shortcuts_handle');
  }
}

/**
 * Setup deep link listener for shortcuts
 * Call this in app/_layout.tsx or app/index.tsx
 */
export function setupShortcutListener(): () => void {
  const subscription = Linking.addEventListener('url', (event: { url: string }) => {
    const params = parseShortcutUrl(event.url);
    if (params) {
      handleShortcut(params);
    }
  });

  // Handle initial URL (if app was opened via shortcut)
  Linking.getInitialURL().then((url: string | null) => {
    if (url) {
      const params = parseShortcutUrl(url);
      if (params) {
        handleShortcut(params);
      }
    }
  });

  return () => subscription.remove();
}
