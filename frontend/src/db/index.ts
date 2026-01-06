import { Database } from '@nozbe/watermelondb';
import type { Collection } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import { modelClasses } from './models';
import type User from './models/User';
import type UserSettings from './models/UserSettings';
import type EquipmentBase from './models/EquipmentBase';
import type Exercise from './models/Exercise';
import type Routine from './models/Routine';
import type RoutineExercise from './models/RoutineExercise';
import type Workout from './models/Workout';
import type WorkoutSet from './models/WorkoutSet';
import type UserBodyLog from './models/UserBodyLog';
import type UserLevel from './models/UserLevel';
import type UserBadge from './models/UserBadge';

// Create the adapter
const adapter = new SQLiteAdapter({
  schema,
  // Optional: migrations for schema changes
  // migrations,
  jsi: true, // Enable JSI for better performance (React Native)
  onSetUpError: (error) => {
    console.error('Database setup error:', error);
  },
});

// Create the database
export const database = new Database({
  adapter,
  modelClasses,
});

// Export collections for easy access with proper types
export const usersCollection = database.get<User>('users');
export const userSettingsCollection = database.get<UserSettings>('user_settings');
export const equipmentBasesCollection = database.get<EquipmentBase>('equipment_bases');
export const exercisesCollection = database.get<Exercise>('exercises');
export const routinesCollection = database.get<Routine>('routines');
export const routineExercisesCollection = database.get<RoutineExercise>('routine_exercises');
export const workoutsCollection = database.get<Workout>('workouts');
export const workoutSetsCollection = database.get<WorkoutSet>('workout_sets');
export const userBodyLogsCollection = database.get<UserBodyLog>('user_body_logs');
export const userLevelsCollection = database.get<UserLevel>('user_levels');
export const userBadgesCollection = database.get<UserBadge>('user_badges');

export default database;
