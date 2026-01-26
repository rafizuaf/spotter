/**
 * Widget Data Service
 * 
 * Manages data sharing between React Native app and native widgets (iOS/Android)
 * 
 * Note: Full implementation requires native code for widgets.
 * This service provides the data layer that widgets will read from.
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { database, workoutsCollection, workoutSetsCollection, userLevelsCollection } from '../db';
import { Q } from '@nozbe/watermelondb';
import type Workout from '../db/models/Workout';
import type WorkoutSet from '../db/models/WorkoutSet';
import type UserLevel from '../db/models/UserLevel';

const WIDGET_DATA_KEY = 'widget_data';

export interface WidgetWorkoutStats {
  todayWorkout: {
    status: 'completed' | 'in_progress' | 'none';
    name?: string;
    setsCompleted?: number;
    volumeKg?: number;
  };
  weeklyStats: {
    workoutsCompleted: number;
    totalVolumeKg: number;
    setsCompleted: number;
    weeklyGoal: number; // User's weekly goal (e.g., 3 workouts)
  };
  levelProgress: {
    level: number;
    currentXp: number;
    xpToNext: number;
    progressPercent: number;
  };
}

/**
 * Update widget data with current workout stats
 * This should be called:
 * - After workout completion
 * - On app foreground
 * - Daily at midnight (via background task)
 */
export async function updateWidgetData(userId: string): Promise<void> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    // Get today's workouts
    const todayWorkouts = await workoutsCollection
      .query(
        Q.where('user_id', userId),
        Q.where('started_at', Q.gte(today.getTime())),
        Q.where('started_at', Q.lte(todayEnd.getTime())),
        Q.where('deleted_at', null),
        Q.sortBy('started_at', Q.desc)
      )
      .fetch();

    // Get weekly stats (last 7 days)
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 7);
    const weeklyWorkouts = await workoutsCollection
      .query(
        Q.where('user_id', userId),
        Q.where('started_at', Q.gte(weekStart.getTime())),
        Q.where('deleted_at', null)
      )
      .fetch();

    // Calculate weekly volume and sets
    let totalVolumeKg = 0;
    let totalSets = 0;
    for (const workout of weeklyWorkouts) {
      const typedWorkout = workout as Workout;
      // Load sets for this workout to calculate volume
      const sets = await workoutSetsCollection
        .query(
          Q.where('workout_id', typedWorkout.id),
          Q.where('deleted_at', null),
          Q.where('skipped', false)
        )
        .fetch();
      
      const typedSets = sets as WorkoutSet[];
      const workoutVolume = typedSets.reduce((sum, set) => {
        const weight = set.weightKg || 0;
        const reps = set.reps || 0;
        return sum + weight * reps;
      }, 0);
      
      totalVolumeKg += workoutVolume;
      totalSets += typedSets.length;
    }
    
    // Calculate today's workout stats
    let todaySets = 0;
    let todayVolume = 0;
    if (todayWorkouts.length > 0) {
      const todayWorkout = todayWorkouts[0] as Workout;
      const todaySetsData = await workoutSetsCollection
        .query(
          Q.where('workout_id', todayWorkout.id),
          Q.where('deleted_at', null),
          Q.where('skipped', false)
        )
        .fetch();
      
      const typedTodaySets = todaySetsData as WorkoutSet[];
      todaySets = typedTodaySets.length;
      todayVolume = typedTodaySets.reduce((sum, set) => {
        const weight = set.weightKg || 0;
        const reps = set.reps || 0;
        return sum + weight * reps;
      }, 0);
    }

    // Get user level
    const levels = await userLevelsCollection
      .query(Q.where('user_id', userId))
      .fetch();
    const userLevel = levels[0] as UserLevel | undefined;

    const widgetData: WidgetWorkoutStats = {
      todayWorkout: {
        status: todayWorkouts.length > 0 ? 'completed' : 'none',
        name: todayWorkouts[0]?.name,
        setsCompleted: todaySets,
        volumeKg: todayVolume,
      },
      weeklyStats: {
        workoutsCompleted: weeklyWorkouts.length,
        totalVolumeKg,
        setsCompleted: totalSets,
        weeklyGoal: 3, // Default, could come from user settings
      },
      levelProgress: {
        level: userLevel?.level || 1,
        currentXp: userLevel?.totalXp || 0,
        xpToNext: userLevel?.xpToNextLevel || 100,
        progressPercent: userLevel
          ? Math.round(
              ((userLevel.totalXp - (userLevel.totalXp - userLevel.xpToNextLevel)) /
                userLevel.xpToNextLevel) *
                100
            )
          : 0,
      },
    };

    // Store in SecureStore (accessible to native widgets via App Groups/SharedPreferences)
    await SecureStore.setItemAsync(WIDGET_DATA_KEY, JSON.stringify(widgetData));

    // On iOS, also write to App Group UserDefaults (requires native module)
    if (Platform.OS === 'ios') {
      // This would require a native module to write to App Group
      // For now, SecureStore is a placeholder
      console.log('Widget data updated (iOS App Group write requires native module)');
    }

    // On Android, write to SharedPreferences (requires native module)
    if (Platform.OS === 'android') {
      // This would require a native module to write to SharedPreferences
      // For now, SecureStore is a placeholder
      console.log('Widget data updated (Android SharedPreferences write requires native module)');
    }
  } catch (error) {
    console.error('Error updating widget data:', error);
  }
}

/**
 * Get current widget data (for testing/debugging)
 */
export async function getWidgetData(): Promise<WidgetWorkoutStats | null> {
  try {
    const data = await SecureStore.getItemAsync(WIDGET_DATA_KEY);
    if (!data) return null;
    return JSON.parse(data) as WidgetWorkoutStats;
  } catch (error) {
    console.error('Error reading widget data:', error);
    return null;
  }
}
