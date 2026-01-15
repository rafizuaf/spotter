/**
 * Video URL parsing utilities for exercise demos.
 *
 * Video URL Format: "youtube:VIDEO_ID"
 * Example: "youtube:rT7DgCr-3pg"
 */

/**
 * Parses video URL in format "youtube:VIDEO_ID" and extracts the video ID.
 * @param videoUrl - The video URL string from database
 * @returns The YouTube video ID or null if invalid
 */
export const parseYouTubeVideoId = (
  videoUrl: string | null | undefined
): string | null => {
  if (!videoUrl || typeof videoUrl !== 'string') {
    return null;
  }

  const trimmed = videoUrl.trim();

  // Expected format: "youtube:VIDEO_ID"
  if (trimmed.startsWith('youtube:')) {
    const videoId = trimmed.slice(8); // Remove "youtube:" prefix (8 chars)
    // YouTube video IDs are typically 11 characters
    if (videoId.length >= 10 && videoId.length <= 12) {
      return videoId;
    }
  }

  return null;
};

/**
 * Checks if an exercise has a valid video demo available.
 * @param videoUrl - The video URL string from database
 * @returns True if the exercise has a valid video demo
 */
export const hasVideoDemo = (videoUrl: string | null | undefined): boolean => {
  return parseYouTubeVideoId(videoUrl) !== null;
};

/**
 * Generates a YouTube thumbnail URL for preview purposes.
 * @param videoId - The YouTube video ID
 * @returns URL to the video thumbnail
 */
export const getYouTubeThumbnail = (videoId: string): string => {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
};
