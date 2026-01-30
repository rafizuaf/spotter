import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import { modelClasses } from './models';
import migrations from './migrations';
import { logError } from '../utils/errorHandler';
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
import type Follow from './models/Follow';
import type UserBlock from './models/UserBlock';
import type SocialPost from './models/SocialPost';
import type Notification from './models/Notification';
import type PushDevice from './models/PushDevice';
import type BeginnerProgram from './models/BeginnerProgram';
import type BeginnerProgramDay from './models/BeginnerProgramDay';
import type UserProgramEnrollment from './models/UserProgramEnrollment';
import type UserProgramDayProgress from './models/UserProgramDayProgress';
import type UserTrainingMax from './models/UserTrainingMax';
import type AdvancedProgram from './models/AdvancedProgram';
import type AdvancedProgramDay from './models/AdvancedProgramDay';
import type UserAdvancedProgramEnrollment from './models/UserAdvancedProgramEnrollment';
import type UserEntitlement from './models/UserEntitlement';
import type PostReaction from './models/PostReaction';
import type Challenge from './models/Challenge';
import type ChallengeParticipant from './models/ChallengeParticipant';
import type Leaderboard from './models/Leaderboard';
import type LeaderboardEntry from './models/LeaderboardEntry';
import type WorkoutPartner from './models/WorkoutPartner';
import type WorkoutPartnerInvitation from './models/WorkoutPartnerInvitation';

// Create the adapter
const adapter = new SQLiteAdapter({
  schema,
  migrations,
  jsi: true, // Enable JSI for better performance (React Native)
  onSetUpError: (error) => {
    logError(error, 'database_setup');
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
export const followsCollection = database.get<Follow>('follows');
export const userBlocksCollection = database.get<UserBlock>('user_blocks');
export const socialPostsCollection = database.get<SocialPost>('social_posts');
export const notificationsCollection = database.get<Notification>('notifications');
export const pushDevicesCollection = database.get<PushDevice>('push_devices');

// First 30 Days Program collections
export const beginnerProgramsCollection = database.get<BeginnerProgram>('beginner_programs');
export const beginnerProgramDaysCollection = database.get<BeginnerProgramDay>('beginner_program_days');
export const userProgramEnrollmentsCollection = database.get<UserProgramEnrollment>('user_program_enrollments');
export const userProgramDayProgressCollection = database.get<UserProgramDayProgress>('user_program_day_progress');
export const userTrainingMaxesCollection = database.get<UserTrainingMax>('user_training_maxes');
export const advancedProgramsCollection = database.get<AdvancedProgram>('advanced_programs');
export const advancedProgramDaysCollection = database.get<AdvancedProgramDay>('advanced_program_days');
export const userAdvancedProgramEnrollmentsCollection = database.get<UserAdvancedProgramEnrollment>('user_advanced_program_enrollments');

// Monetization (Phase 2F) - SECURITY: Pull-only, no push
export const userEntitlementsCollection = database.get<UserEntitlement>('user_entitlements');

// Phase 2G: Social & Competition
export const postReactionsCollection = database.get<PostReaction>('post_reactions');
export const challengesCollection = database.get<Challenge>('challenges');
export const challengeParticipantsCollection = database.get<ChallengeParticipant>('challenge_participants');
export const leaderboardsCollection = database.get<Leaderboard>('leaderboards');
export const leaderboardEntriesCollection = database.get<LeaderboardEntry>('leaderboard_entries');
export const workoutPartnersCollection = database.get<WorkoutPartner>('workout_partners');
export const workoutPartnerInvitationsCollection = database.get<WorkoutPartnerInvitation>('workout_partner_invitations');

export default database;
