import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, text, relation } from '@nozbe/watermelondb/decorators';
import UserProgramEnrollment from './UserProgramEnrollment';
import BeginnerProgramDay from './BeginnerProgramDay';

export default class UserProgramDayProgress extends Model {
  static table = 'user_program_day_progress';

  static associations = {
    user_program_enrollments: { type: 'belongs_to' as const, key: 'enrollment_id' },
    beginner_program_days: { type: 'belongs_to' as const, key: 'program_day_id' },
    workouts: { type: 'belongs_to' as const, key: 'workout_id' },
  };

  @text('server_id') serverId!: string;
  @text('enrollment_id') enrollmentId!: string;
  @text('program_day_id') programDayId!: string;
  @text('workout_id') workoutId?: string;
  @date('lesson_read_at') lessonReadAt?: Date;
  @date('workout_completed_at') workoutCompletedAt?: Date;
  @field('skipped') skipped!: boolean;
  @text('skip_reason') skipReason?: string;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @date('deleted_at') deletedAt?: Date;

  @relation('user_program_enrollments', 'enrollment_id') enrollment!: UserProgramEnrollment;
  @relation('beginner_program_days', 'program_day_id') programDay!: BeginnerProgramDay;

  // Helper: Check if lesson is read
  get isLessonRead(): boolean {
    return this.lessonReadAt !== null && this.lessonReadAt !== undefined;
  }

  // Helper: Check if workout is completed
  get isWorkoutCompleted(): boolean {
    return this.workoutCompletedAt !== null && this.workoutCompletedAt !== undefined;
  }

  // Helper: Check if day is fully complete (lesson read + workout done, or skipped)
  get isComplete(): boolean {
    return this.skipped || (this.isLessonRead && this.isWorkoutCompleted);
  }

  // Helper: Get completion status string
  get statusLabel(): 'pending' | 'in_progress' | 'completed' | 'skipped' {
    if (this.skipped) return 'skipped';
    if (this.isWorkoutCompleted) return 'completed';
    if (this.isLessonRead) return 'in_progress';
    return 'pending';
  }
}
