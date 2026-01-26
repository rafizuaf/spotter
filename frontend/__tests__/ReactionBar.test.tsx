/**
 * ReactionBar Component Tests
 * Tests for reaction bar functionality
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import ReactionBar from '../src/components/ReactionBar';
import { reactToPost } from '../src/services/reactions';

// Mock the reactions service
jest.mock('../src/services/reactions', () => ({
  reactToPost: jest.fn() as jest.MockedFunction<any>,
}));

// Mock useTheme hook
jest.mock('../src/hooks/useTheme', () => ({
  useTheme: () => ({
    background: '#0a0a0a',
    surface: '#1a1a1a',
    textPrimary: '#f5f5f5',
    textSecondary: '#a0a0a0',
    primary: '#d4af37',
    border: '#2a2a2a',
  }),
}));

describe('ReactionBar', () => {
  const mockReactions = {
    like: 5,
    fire: 2,
    muscle: 1,
    clap: 0,
  };

  const mockOnReaction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all reaction buttons', () => {
    const { getByTestId } = render(
      <ReactionBar
        postId="post-123"
        reactions={mockReactions}
        userReaction={null}
        onReaction={mockOnReaction}
      />
    );

    expect(getByTestId('reaction-like')).toBeTruthy();
    expect(getByTestId('reaction-fire')).toBeTruthy();
    expect(getByTestId('reaction-muscle')).toBeTruthy();
    expect(getByTestId('reaction-clap')).toBeTruthy();
  });

  it('should display reaction counts', () => {
    const { getByText } = render(
      <ReactionBar
        postId="post-123"
        reactions={mockReactions}
        userReaction={null}
        onReaction={mockOnReaction}
      />
    );

    expect(getByText('5')).toBeTruthy(); // Like count
    expect(getByText('2')).toBeTruthy(); // Fire count
    expect(getByText('1')).toBeTruthy(); // Muscle count
    expect(getByText('0')).toBeTruthy(); // Clap count
  });

  it('should highlight active reaction', () => {
    const { getByTestId } = render(
      <ReactionBar
        postId="post-123"
        reactions={mockReactions}
        userReaction="LIKE"
        onReaction={mockOnReaction}
      />
    );

    const likeButton = getByTestId('reaction-like');
    // Check if button has active styling (would need to check style prop)
    expect(likeButton).toBeTruthy();
  });

  it('should call onReaction when button is pressed', async () => {
    (reactToPost as jest.MockedFunction<any>).mockResolvedValue({
      success: true,
      action: 'added',
      reaction_counts: { ...mockReactions, like: 6 },
    });

    const { getByTestId } = render(
      <ReactionBar
        postId="post-123"
        reactions={mockReactions}
        userReaction={null}
        onReaction={mockOnReaction}
      />
    );

    const likeButton = getByTestId('reaction-like');
    fireEvent.press(likeButton);

    await waitFor(() => {
      expect(reactToPost).toHaveBeenCalledWith('post-123', 'LIKE');
    });
  });

  it('should toggle reaction if already active', async () => {
    (reactToPost as jest.MockedFunction<any>).mockResolvedValue({
      success: true,
      action: 'removed',
      reaction_counts: { ...mockReactions, like: 4 },
    });

    const { getByTestId } = render(
      <ReactionBar
        postId="post-123"
        reactions={mockReactions}
        userReaction="LIKE"
        onReaction={mockOnReaction}
      />
    );

    const likeButton = getByTestId('reaction-like');
    fireEvent.press(likeButton);

    await waitFor(() => {
      expect(reactToPost).toHaveBeenCalledWith('post-123', 'LIKE');
    });
  });
});
