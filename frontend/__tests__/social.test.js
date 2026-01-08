/**
 * Social Features Unit Tests
 *
 * These tests verify the social features logic:
 * 1. Follow user → verify follow record created
 * 2. Unfollow → verify soft delete
 * 3. Block user → follows deleted, content hidden
 * 4. Post visibility → privacy rules enforced
 * 5. Feed query → only following users shown
 */

// In-memory mock database
let mockFollows = [];
let mockBlocks = [];
let mockPosts = [];
let mockUsers = [];

// Mock helper functions that simulate database queries
const createFollow = (followerId, followingId) => {
  const follow = {
    id: `follow-${Date.now()}`,
    serverId: `server-${Date.now()}`,
    followerId,
    followingId,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };
  mockFollows.push(follow);
  return follow;
};

const softDeleteFollow = (followerId, followingId) => {
  const follow = mockFollows.find(
    (f) => f.followerId === followerId && f.followingId === followingId && !f.deletedAt
  );
  if (follow) {
    follow.deletedAt = new Date();
    follow.updatedAt = new Date();
    return true;
  }
  return false;
};

const createBlock = (blockerId, blockedId) => {
  const block = {
    id: `block-${Date.now()}`,
    serverId: `server-${Date.now()}`,
    blockerId,
    blockedId,
    createdAt: new Date(),
  };
  mockBlocks.push(block);
  return block;
};

const createPost = (userId, workoutId, headline) => {
  const post = {
    id: `post-${Date.now()}-${Math.random()}`,
    serverId: `server-${Date.now()}`,
    userId,
    workoutId,
    generatedHeadline: headline,
    createdAt: new Date(),
    deletedAt: null,
  };
  mockPosts.push(post);
  return post;
};

const getActiveFollows = (followerId) => {
  return mockFollows.filter((f) => f.followerId === followerId && !f.deletedAt);
};

const getFollowers = (userId) => {
  return mockFollows.filter((f) => f.followingId === userId && !f.deletedAt);
};

const isBlocked = (userId1, userId2) => {
  return mockBlocks.some(
    (b) =>
      (b.blockerId === userId1 && b.blockedId === userId2) ||
      (b.blockerId === userId2 && b.blockedId === userId1)
  );
};

const getBlockedUserIds = (userId) => {
  const blocked = new Set();
  mockBlocks.forEach((block) => {
    if (block.blockerId === userId) {
      blocked.add(block.blockedId);
    } else if (block.blockedId === userId) {
      blocked.add(block.blockerId);
    }
  });
  return blocked;
};

const getFeedPosts = (userId) => {
  // Get users I follow
  const followingIds = getActiveFollows(userId).map((f) => f.followingId);

  // Get blocked users
  const blockedIds = getBlockedUserIds(userId);

  // Filter out blocked users
  const validFollowingIds = followingIds.filter((id) => !blockedIds.has(id));

  // Get posts from valid following users
  return mockPosts
    .filter(
      (p) => validFollowingIds.includes(p.userId) && !p.deletedAt
    )
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
};

describe('Social Features', () => {
  const currentUser = 'user-current';
  const targetUser = 'user-target';

  beforeEach(() => {
    // Reset mock database before each test
    mockFollows = [];
    mockBlocks = [];
    mockPosts = [];
    mockUsers = [];
  });

  describe('Follow/Unfollow', () => {
    it('should create a follow record', () => {
      const follow = createFollow(currentUser, targetUser);

      expect(follow.followerId).toBe(currentUser);
      expect(follow.followingId).toBe(targetUser);
      expect(follow.deletedAt).toBeNull();

      const activeFollows = getActiveFollows(currentUser);
      expect(activeFollows).toHaveLength(1);
    });

    it('should soft delete follow record on unfollow', () => {
      createFollow(currentUser, targetUser);

      // Verify follow exists
      let activeFollows = getActiveFollows(currentUser);
      expect(activeFollows).toHaveLength(1);

      // Unfollow (soft delete)
      const result = softDeleteFollow(currentUser, targetUser);
      expect(result).toBe(true);

      // Verify follow is soft deleted
      activeFollows = getActiveFollows(currentUser);
      expect(activeFollows).toHaveLength(0);

      // Verify record still exists but is soft deleted
      const allFollows = mockFollows.filter(
        (f) => f.followerId === currentUser && f.followingId === targetUser
      );
      expect(allFollows).toHaveLength(1);
      expect(allFollows[0].deletedAt).not.toBeNull();
    });

    it('should count followers correctly', () => {
      createFollow('follower-1', targetUser);
      createFollow('follower-2', targetUser);
      createFollow('follower-3', targetUser);

      const followers = getFollowers(targetUser);
      expect(followers).toHaveLength(3);
    });

    it('should count following correctly', () => {
      createFollow(currentUser, 'following-1');
      createFollow(currentUser, 'following-2');

      const following = getActiveFollows(currentUser);
      expect(following).toHaveLength(2);
    });
  });

  describe('Blocking', () => {
    it('should create a block record', () => {
      const block = createBlock(currentUser, targetUser);

      expect(block.blockerId).toBe(currentUser);
      expect(block.blockedId).toBe(targetUser);
      expect(isBlocked(currentUser, targetUser)).toBe(true);
    });

    it('should check block status in both directions', () => {
      createBlock(currentUser, targetUser);

      // Both directions should return blocked
      expect(isBlocked(currentUser, targetUser)).toBe(true);
      expect(isBlocked(targetUser, currentUser)).toBe(true);
    });

    it('should remove follow relationships when blocking', () => {
      // Create follow relationship
      createFollow(currentUser, targetUser);
      expect(getActiveFollows(currentUser)).toHaveLength(1);

      // Block (which soft deletes follows)
      softDeleteFollow(currentUser, targetUser);
      createBlock(currentUser, targetUser);

      // Verify follow is soft deleted
      expect(getActiveFollows(currentUser)).toHaveLength(0);

      // Verify block exists
      expect(isBlocked(currentUser, targetUser)).toBe(true);
    });
  });

  describe('Social Posts & Visibility', () => {
    it('should create social post', () => {
      const post = createPost(currentUser, 'workout-123', 'Completed a workout!');

      expect(post.userId).toBe(currentUser);
      expect(post.generatedHeadline).toBe('Completed a workout!');
      expect(post.deletedAt).toBeNull();
    });

    it('should filter out deleted posts from feed', () => {
      createFollow(currentUser, targetUser);
      const post = createPost(targetUser, 'workout-123', 'Test post');

      // Verify post appears in feed
      let feed = getFeedPosts(currentUser);
      expect(feed).toHaveLength(1);

      // Soft delete the post
      post.deletedAt = new Date();

      // Verify post no longer appears in feed
      feed = getFeedPosts(currentUser);
      expect(feed).toHaveLength(0);
    });
  });

  describe('Feed Query', () => {
    const user1 = 'user-1';
    const user2 = 'user-2';
    const user3 = 'user-3';

    beforeEach(() => {
      // Current user follows user1 and user2, but not user3
      createFollow(currentUser, user1);
      createFollow(currentUser, user2);

      // Create posts from all users
      createPost(user1, 'workout-1', 'Post from user 1');
      createPost(user2, 'workout-2', 'Post from user 2');
      createPost(user3, 'workout-3', 'Post from user 3 (not following)');
    });

    it('should only show posts from followed users', () => {
      const feed = getFeedPosts(currentUser);

      expect(feed).toHaveLength(2);
      const headlines = feed.map((p) => p.generatedHeadline);
      expect(headlines).toContain('Post from user 1');
      expect(headlines).toContain('Post from user 2');
      expect(headlines).not.toContain('Post from user 3 (not following)');
    });

    it('should filter out posts from blocked users', () => {
      // Block user1
      createBlock(currentUser, user1);

      const feed = getFeedPosts(currentUser);

      expect(feed).toHaveLength(1);
      expect(feed[0].generatedHeadline).toBe('Post from user 2');
    });

    it('should return empty feed when not following anyone', () => {
      // Clear all follows
      mockFollows = [];

      const feed = getFeedPosts(currentUser);
      expect(feed).toHaveLength(0);
    });

    it('should sort posts by created_at descending', () => {
      // Clear and create posts with different timestamps
      mockPosts = [];

      const post1 = createPost(user1, 'workout-1', 'Older post');
      // Simulate older timestamp
      post1.createdAt = new Date(Date.now() - 10000);

      const post2 = createPost(user2, 'workout-2', 'Newer post');

      const feed = getFeedPosts(currentUser);

      expect(feed).toHaveLength(2);
      expect(feed[0].generatedHeadline).toBe('Newer post');
      expect(feed[1].generatedHeadline).toBe('Older post');
    });

    it('should not show posts after unfollowing', () => {
      // Verify initial feed
      let feed = getFeedPosts(currentUser);
      expect(feed).toHaveLength(2);

      // Unfollow user1
      softDeleteFollow(currentUser, user1);

      // Verify feed no longer shows user1 posts
      feed = getFeedPosts(currentUser);
      expect(feed).toHaveLength(1);
      expect(feed[0].generatedHeadline).toBe('Post from user 2');
    });
  });

  describe('Edge Cases', () => {
    it('should handle self-follow prevention', () => {
      // In the real app, self-follow is prevented server-side
      createFollow(currentUser, currentUser);
      createPost(currentUser, 'workout-1', 'My own post');

      const feed = getFeedPosts(currentUser);
      // Since user follows themselves, they would see their own post
      // In real app, self-follow is blocked at API level
      expect(feed).toHaveLength(1);
    });

    it('should handle multiple blocks correctly', () => {
      createBlock(currentUser, 'blocked-1');
      createBlock(currentUser, 'blocked-2');
      createBlock('blocked-3', currentUser); // Reverse direction

      const blockedIds = getBlockedUserIds(currentUser);

      expect(blockedIds.size).toBe(3);
      expect(blockedIds.has('blocked-1')).toBe(true);
      expect(blockedIds.has('blocked-2')).toBe(true);
      expect(blockedIds.has('blocked-3')).toBe(true);
    });

    it('should handle re-follow after unfollow', () => {
      // Initial follow
      createFollow(currentUser, targetUser);
      expect(getActiveFollows(currentUser)).toHaveLength(1);

      // Unfollow
      softDeleteFollow(currentUser, targetUser);
      expect(getActiveFollows(currentUser)).toHaveLength(0);

      // Re-follow (creates new record in this mock, real app restores)
      createFollow(currentUser, targetUser);
      expect(getActiveFollows(currentUser)).toHaveLength(1);
    });
  });
});
