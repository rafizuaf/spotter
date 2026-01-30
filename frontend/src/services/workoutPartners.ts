/**
 * Workout Partners Service
 * Phase 2G: Social & Competition - Workout Partners
 * 
 * Handles workout partner invitations and real-time sync
 */

import { supabase } from './supabase';
import { database, workoutPartnersCollection, workoutPartnerInvitationsCollection } from '../db';
import { Q } from '@nozbe/watermelondb';
import { logError } from '../utils/errorHandler';
import type WorkoutPartner from '../db/models/WorkoutPartner';
import type WorkoutPartnerInvitation from '../db/models/WorkoutPartnerInvitation';

export interface InvitePartnerResponse {
  success: boolean;
  invitation: {
    id: string;
    workout_id: string;
    partner_user_id: string;
    expires_at: string;
  };
}

/**
 * Invite a user to be a workout partner
 */
export async function invitePartner(
  workoutId: string,
  partnerUserId: string
): Promise<InvitePartnerResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('invite-workout-partner', {
      body: {
        workout_id: workoutId,
        partner_user_id: partnerUserId,
      },
    });

    if (error) {
      throw error;
    }

    return data as InvitePartnerResponse;
  } catch (error) {
    logError(error, 'workoutPartners_invite');
    throw error;
  }
}

/**
 * Accept a workout partner invitation
 */
export async function acceptInvitation(invitationId: string): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('accept-partner-invitation', {
      body: {
        invitation_id: invitationId,
      },
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    logError(error, 'workoutPartners_acceptInvitation');
    throw error;
  }
}

/**
 * Decline a workout partner invitation
 */
export async function declineInvitation(invitationId: string): Promise<void> {
  try {
    // Update invitation status to DECLINED
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const invitations = await workoutPartnerInvitationsCollection
      .query(
        Q.where('server_id', invitationId),
        Q.where('invitee_user_id', user.id)
      )
      .fetch();

    if (invitations.length > 0) {
      const invitation = invitations[0] as WorkoutPartnerInvitation;
      await database.write(async () => {
        await invitation.update((inv) => {
          inv.status = 'DECLINED';
          inv.updatedAt = new Date();
        });
      });
    }

    // Sync will handle server update
  } catch (error) {
    logError(error, 'workoutPartners_declineInvitation');
    throw error;
  }
}

/**
 * Leave a workout partner session
 */
export async function leavePartnerSession(workoutId: string, partnerUserId?: string): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('leave-workout-partner', {
      body: {
        workout_id: workoutId,
        partner_user_id: partnerUserId,
      },
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    logError(error, 'workoutPartners_leaveSession');
    throw error;
  }
}

/**
 * Get workout partners for a workout
 */
export async function getWorkoutPartners(workoutId: string): Promise<WorkoutPartner[]> {
  const workout = await database.collections
    .get('workouts')
    .query(Q.where('server_id', workoutId))
    .fetch();

  if (workout.length === 0) {
    return [];
  }

  const partners = await workoutPartnersCollection
    .query(
      Q.where('workout_id', workout[0].id),
      Q.where('status', 'ACTIVE'),
      Q.where('deleted_at', null)
    )
    .fetch();

  return partners as WorkoutPartner[];
}

/**
 * Get pending invitations for the current user
 */
export async function getPendingInvitations(): Promise<WorkoutPartnerInvitation[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const invitations = await workoutPartnerInvitationsCollection
    .query(
      Q.where('invitee_user_id', user.id),
      Q.where('status', 'PENDING'),
      Q.where('deleted_at', null)
    )
    .fetch();

  return invitations as WorkoutPartnerInvitation[];
}

/**
 * Get invitations sent by the current user
 */
export async function getSentInvitations(): Promise<WorkoutPartnerInvitation[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const invitations = await workoutPartnerInvitationsCollection
    .query(
      Q.where('inviter_user_id', user.id),
      Q.where('status', 'PENDING'),
      Q.where('deleted_at', null)
    )
    .fetch();

  return invitations as WorkoutPartnerInvitation[];
}
