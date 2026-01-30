/**
 * Story Sharing Service
 * Phase 2G: Social & Competition - Instagram Story Sharing
 * 
 * Handles generating and sharing Instagram story images
 */

import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import ViewShot from 'react-native-view-shot';
import { logError } from '../utils/errorHandler';

export type StoryType = 'WORKOUT' | 'PR' | 'ACHIEVEMENT' | 'MONTHLY_ARCHETYPE';

export interface StoryData {
  workout?: {
    name: string;
    date: Date;
    stats: {
      totalVolumeKg: number;
      setsCompleted: number;
      durationMinutes: number;
      exercisesCount: number;
      muscleGroups: string[];
      prsHit: number;
      xpEarned: number;
    };
  };
  pr?: {
    exerciseName: string;
    oldValue: number;
    newValue: number;
    improvement: number;
    date: Date;
  };
  achievement?: {
    title: string;
    description: string;
    earnedAt: Date;
  };
  monthlyArchetype?: {
    archetype: string;
    title: string;
    copy: string;
    stats: Record<string, unknown>;
  };
}

/**
 * Generate story image from a view shot
 */
export async function generateStoryImage(
  viewShotRef: React.RefObject<ViewShot>
): Promise<string> {
  if (!viewShotRef.current) {
    throw new Error('ViewShot ref is not available');
  }

  try {
    const uri = await captureRef(viewShotRef.current, {
      format: 'png',
      quality: 1.0,
      result: 'tmpfile',
    });

    return uri;
  } catch (error) {
    logError(error, 'storySharing_generateImage');
    throw error;
  }
}

/**
 * Save story image to device photos
 */
export async function saveToPhotos(imageUri: string): Promise<void> {
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Photo library permission not granted');
    }

    await MediaLibrary.saveToLibraryAsync(imageUri);
  } catch (error) {
    logError(error, 'storySharing_saveToPhotos');
    throw error;
  }
}

/**
 * Share story image to Instagram Stories
 * Note: Instagram Stories sharing requires the image to be in a specific format
 * and shared via the native share sheet
 */
export async function shareToInstagram(imageUri: string): Promise<void> {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Sharing is not available on this device');
    }

    // Instagram Stories requires specific image format (1080x1920, PNG)
    // The share sheet will allow user to select Instagram Stories
    await Sharing.shareAsync(imageUri, {
      mimeType: 'image/png',
      dialogTitle: 'Share to Instagram Stories',
    });
  } catch (error) {
    logError(error, 'storySharing_shareToInstagram');
    throw error;
  }
}

/**
 * Copy story image to clipboard (for manual sharing)
 */
export async function copyToClipboard(imageUri: string): Promise<void> {
  try {
    // Read image as base64
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Note: React Native doesn't have built-in clipboard for images
    // This would require a native module or third-party library
    // For now, we'll just save to photos and let user manually share
    await saveToPhotos(imageUri);
  } catch (error) {
    logError(error, 'storySharing_copyToClipboard');
    throw error;
  }
}
