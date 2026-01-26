/**
 * ChallengeCard Component Tests
 * Tests for challenge card display and interactions
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import ChallengeCard from '../src/components/ChallengeCard';
import type Challenge from '../src/db/models/Challenge';
import type ChallengeParticipant from '../src/db/models/ChallengeParticipant';

// Mock useTheme hook
jest.mock('../src/hooks/useTheme', () => ({
  useTheme: () => ({
    background: '#0a0a0a',
    surface: '#1a1a1a',
    textPrimary: '#f5f5f5',
    textSecondary: '#a0a0a0',
    primary: '#d4af37',
    border: '#2a2a2a',
    success: '#4ade80',
    error: '#f87171',
  }),
}));

describe('ChallengeCard', () => {
  const mockChallenge: Partial<Challenge> = {
    id: 'challenge-123',
    serverId: 'challenge-123',
    title: 'Test Challenge',
    description: 'Test description',
    challengeType: 'MOST_VOLUME',
    status: 'ACTIVE',
    startDate: new Date('2026-02-01'),
    endDate: new Date('2026-02-28'),
    visibility: 'PUBLIC',
    maxParticipants: 50,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOnPress = jest.fn();
  const mockOnJoin = jest.fn();
  const mockOnLeave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render challenge title and description', () => {
    const { getByText } = render(
      <ChallengeCard
        challenge={mockChallenge as Challenge}
        onPress={mockOnPress}
      />
    );

    expect(getByText('Test Challenge')).toBeTruthy();
    expect(getByText('Test description')).toBeTruthy();
  });

  it('should display challenge type icon', () => {
    const { getByTestId } = render(
      <ChallengeCard
        challenge={mockChallenge as Challenge}
        onPress={mockOnPress}
      />
    );

    // Challenge type icon should be present
    expect(getByTestId('challenge-type-icon')).toBeTruthy();
  });

  it('should display status badge', () => {
    const { getByText } = render(
      <ChallengeCard
        challenge={mockChallenge as Challenge}
        onPress={mockOnPress}
      />
    );

    expect(getByText('ACTIVE')).toBeTruthy();
  });

  it('should show participant count', () => {
    const { getByText } = render(
      <ChallengeCard
        challenge={mockChallenge as Challenge}
        userParticipant={undefined}
        onPress={mockOnPress}
      />
    );

    // Should show participant count (would need to mock this)
    expect(getByText(/participants?/i)).toBeTruthy();
  });

  it('should call onPress when card is pressed', () => {
    const { getByTestId } = render(
      <ChallengeCard
        challenge={mockChallenge as Challenge}
        onPress={mockOnPress}
      />
    );

    const card = getByTestId('challenge-card');
    fireEvent.press(card);

    expect(mockOnPress).toHaveBeenCalledWith('challenge-123');
  });

  it('should show join button when user is not participating', () => {
    const { getByText } = render(
      <ChallengeCard
        challenge={mockChallenge as Challenge}
        userParticipant={undefined}
        onPress={mockOnPress}
        onJoin={mockOnJoin}
      />
    );

    expect(getByText('Join')).toBeTruthy();
  });

  it('should show leave button when user is participating', () => {
    const mockParticipant: Partial<ChallengeParticipant> = {
      id: 'participant-123',
      challengeId: 'challenge-123',
      userId: 'user-123',
      currentScore: 1000,
      rank: 5,
    };

    const { getByText } = render(
      <ChallengeCard
        challenge={mockChallenge as Challenge}
        userParticipant={mockParticipant as ChallengeParticipant}
        onPress={mockOnPress}
        onLeave={mockOnLeave}
      />
    );

    expect(getByText('Leave')).toBeTruthy();
  });

  it('should call onJoin when join button is pressed', () => {
    const { getByText } = render(
      <ChallengeCard
        challenge={mockChallenge as Challenge}
        userParticipant={undefined}
        onPress={mockOnPress}
        onJoin={mockOnJoin}
      />
    );

    const joinButton = getByText('Join');
    fireEvent.press(joinButton);

    expect(mockOnJoin).toHaveBeenCalledWith('challenge-123');
  });

  it('should call onLeave when leave button is pressed', () => {
    const mockParticipant: Partial<ChallengeParticipant> = {
      id: 'participant-123',
      challengeId: 'challenge-123',
      userId: 'user-123',
      currentScore: 1000,
      rank: 5,
    };

    const { getByText } = render(
      <ChallengeCard
        challenge={mockChallenge as Challenge}
        userParticipant={mockParticipant as ChallengeParticipant}
        onPress={mockOnPress}
        onLeave={mockOnLeave}
      />
    );

    const leaveButton = getByText('Leave');
    fireEvent.press(leaveButton);

    expect(mockOnLeave).toHaveBeenCalledWith('challenge-123');
  });

  it('should display user rank when participating', () => {
    const mockParticipant: Partial<ChallengeParticipant> = {
      id: 'participant-123',
      challengeId: 'challenge-123',
      userId: 'user-123',
      currentScore: 1000,
      rank: 5,
    };

    const { getByText } = render(
      <ChallengeCard
        challenge={mockChallenge as Challenge}
        userParticipant={mockParticipant as ChallengeParticipant}
        onPress={mockOnPress}
      />
    );

    expect(getByText(/rank.*5/i)).toBeTruthy();
  });
});
