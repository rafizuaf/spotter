/**
 * Image Compression Utility
 * 
 * Compresses images before upload to reduce storage and bandwidth usage.
 * Uses expo-image-manipulator for resizing and compression.
 */

import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { logError } from './errorHandler';

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1, where 1 is highest quality
  format?: ImageManipulator.SaveFormat;
}

export interface CompressionResult {
  uri: string;
  width: number;
  height: number;
  size?: number; // File size in bytes (if available)
}

/**
 * Compress an image to target file size
 * 
 * @param imageUri - URI of the image to compress
 * @param targetSizeKB - Target file size in KB
 * @param options - Compression options
 * @returns Compressed image URI and metadata
 */
export async function compressImage(
  imageUri: string,
  targetSizeKB: number,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality: initialQuality = 0.85,
    format = ImageManipulator.SaveFormat.JPEG,
  } = options;

  // First, resize if needed
  const resized = await ImageManipulator.manipulateAsync(
    imageUri,
    [{ resize: { width: maxWidth, height: maxHeight } }],
    { compress: initialQuality, format }
  );

  // Check file size (if available via FileSystem)
  try {
    const fileInfo = await FileSystem.getInfoAsync(resized.uri);
    
    if (fileInfo.exists && 'size' in fileInfo) {
      const sizeKB = fileInfo.size / 1024;
      
      // If already under target, return
      if (sizeKB <= targetSizeKB) {
        return {
          uri: resized.uri,
          width: resized.width,
          height: resized.height,
          size: fileInfo.size,
        };
      }

      // Binary search for optimal quality
      let minQuality = 0.1;
      let maxQuality = initialQuality;
      let bestResult = resized;
      let bestSize = fileInfo.size;

      // Try up to 5 iterations to find optimal quality
      for (let i = 0; i < 5; i++) {
        const testQuality = (minQuality + maxQuality) / 2;
        
        const compressed = await ImageManipulator.manipulateAsync(
          imageUri,
          [{ resize: { width: maxWidth, height: maxHeight } }],
          { compress: testQuality, format }
        );

        const compressedInfo = await FileSystem.getInfoAsync(compressed.uri);
        if (compressedInfo.exists && 'size' in compressedInfo) {
          const compressedSizeKB = compressedInfo.size / 1024;
          
          if (compressedSizeKB <= targetSizeKB) {
            // Under target, try higher quality
            minQuality = testQuality;
            bestResult = compressed;
            bestSize = compressedInfo.size;
          } else {
            // Over target, try lower quality
            maxQuality = testQuality;
          }
        }
      }

      return {
        uri: bestResult.uri,
        width: bestResult.width,
        height: bestResult.height,
        size: bestSize,
      };
    }
  } catch (error) {
    // FileSystem not available, return resized image
    logError(error, 'imageCompression_checkFileSize');
  }

  return {
    uri: resized.uri,
    width: resized.width,
    height: resized.height,
  };
}

/**
 * Compress avatar image (target: 200KB)
 */
export async function compressAvatar(imageUri: string): Promise<CompressionResult> {
  return compressImage(imageUri, 200, {
    maxWidth: 400,
    maxHeight: 400,
    quality: 0.8,
    format: ImageManipulator.SaveFormat.JPEG,
  });
}

/**
 * Compress body photo (target: 1MB)
 */
export async function compressBodyPhoto(imageUri: string): Promise<CompressionResult> {
  return compressImage(imageUri, 1000, {
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 0.85,
    format: ImageManipulator.SaveFormat.JPEG,
  });
}

/**
 * Compress progress photo (target: 500KB)
 */
export async function compressProgressPhoto(imageUri: string): Promise<CompressionResult> {
  return compressImage(imageUri, 500, {
    maxWidth: 1280,
    maxHeight: 1280,
    quality: 0.85,
    format: ImageManipulator.SaveFormat.JPEG,
  });
}
