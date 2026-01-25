/**
 * Phase 2E: Advanced program enrollment (5/3/1, etc.)
 */

import { v4 as uuid } from 'uuid';
import { database, userAdvancedProgramEnrollmentsCollection } from '../db';
import type UserAdvancedProgramEnrollment from '../db/models/UserAdvancedProgramEnrollment';

export async function enrollAdvancedProgram(
  userId: string,
  programId: string
): Promise<void> {
  const now = new Date();
  const serverId = uuid();
  await database.write(async () => {
    await userAdvancedProgramEnrollmentsCollection.create((r: UserAdvancedProgramEnrollment) => {
      r.serverId = serverId;
      r.userId = userId;
      r.programId = programId;
      r.currentWeek = 1;
      r.currentDay = 1;
      r.startedAt = now;
    });
  });
}
