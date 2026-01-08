import React, { useState, useCallback, useMemo } from 'react';
import {
  Image,
  ImageProps,
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  ImageStyle,
  ViewStyle,
} from 'react-native';

interface OptimizedImageProps extends Omit<ImageProps, 'source'> {
  uri: string | null | undefined;
  fallbackUri?: string;
  width?: number;
  height?: number;
  borderRadius?: number;
  showLoader?: boolean;
  containerStyle?: ViewStyle;
}

/**
 * OptimizedImage - Lazy-loading image component with fallback support
 *
 * Features:
 * - Lazy loading with placeholder
 * - Error handling with fallback
 * - Loading indicator
 * - Image caching (native)
 * - Memory optimization
 */
const OptimizedImage = React.memo(function OptimizedImage({
  uri,
  fallbackUri,
  width = 100,
  height = 100,
  borderRadius = 0,
  showLoader = true,
  containerStyle,
  style,
  ...rest
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Handle load start
  const handleLoadStart = useCallback(() => {
    setIsLoading(true);
  }, []);

  // Handle load end
  const handleLoadEnd = useCallback(() => {
    setIsLoading(false);
  }, []);

  // Handle error
  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  // Determine source
  const source = useMemo(() => {
    if (hasError && fallbackUri) {
      return { uri: fallbackUri };
    }
    if (uri) {
      return { uri };
    }
    if (fallbackUri) {
      return { uri: fallbackUri };
    }
    return undefined;
  }, [uri, fallbackUri, hasError]);

  // Styles
  const imageStyle: ImageStyle = useMemo(
    () => ({
      width,
      height,
      borderRadius,
      ...(style as ImageStyle),
    }),
    [width, height, borderRadius, style]
  );

  const wrapperStyle: ViewStyle = useMemo(
    () => ({
      width,
      height,
      borderRadius,
      overflow: 'hidden' as const,
      backgroundColor: '#334155',
      ...containerStyle,
    }),
    [width, height, borderRadius, containerStyle]
  );

  // Placeholder for no image
  if (!source) {
    return (
      <View style={[styles.placeholder, wrapperStyle]}>
        <View style={styles.placeholderIcon} />
      </View>
    );
  }

  return (
    <View style={wrapperStyle}>
      <Image
        source={source}
        style={imageStyle}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        resizeMode="cover"
        {...rest}
      />
      {isLoading && showLoader && (
        <View style={[styles.loaderContainer, imageStyle]}>
          <ActivityIndicator size="small" color="#6366f1" />
        </View>
      )}
    </View>
  );
});

/**
 * Avatar - Specialized image component for user avatars
 */
interface AvatarProps {
  uri: string | null | undefined;
  size?: number;
  name?: string;
}

export const Avatar = React.memo(function Avatar({
  uri,
  size = 48,
  name,
}: AvatarProps) {
  const initials = useMemo(() => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }, [name]);

  // If no URI, show initials
  if (!uri) {
    return (
      <View
        style={[
          styles.avatarPlaceholder,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      >
        <Text
          style={{
            color: '#fff',
            fontWeight: 'bold',
            fontSize: size * 0.4,
          }}
        >
          {initials}
        </Text>
      </View>
    );
  }

  return (
    <OptimizedImage
      uri={uri}
      width={size}
      height={size}
      borderRadius={size / 2}
      showLoader={false}
    />
  );
});

/**
 * ThumbnailImage - Small preview image with progressive loading
 */
interface ThumbnailProps {
  uri: string | null | undefined;
  thumbnailUri?: string;
  width?: number;
  height?: number;
  borderRadius?: number;
}

export const ThumbnailImage = React.memo(function ThumbnailImage({
  uri,
  thumbnailUri,
  width = 60,
  height = 60,
  borderRadius = 8,
}: ThumbnailProps) {
  const [fullLoaded, setFullLoaded] = useState(false);

  const handleFullLoad = useCallback(() => {
    setFullLoaded(true);
  }, []);

  return (
    <View
      style={{
        width,
        height,
        borderRadius,
        overflow: 'hidden',
        backgroundColor: '#334155',
      }}
    >
      {/* Thumbnail (blurred placeholder) */}
      {thumbnailUri && !fullLoaded && (
        <Image
          source={{ uri: thumbnailUri }}
          style={[StyleSheet.absoluteFill, { opacity: 0.5 }]}
          blurRadius={2}
          resizeMode="cover"
        />
      )}
      {/* Full image */}
      {uri && (
        <Image
          source={{ uri }}
          style={[StyleSheet.absoluteFill, { opacity: fullLoaded ? 1 : 0 }]}
          onLoad={handleFullLoad}
          resizeMode="cover"
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    width: '40%',
    height: '40%',
    backgroundColor: '#475569',
    borderRadius: 4,
  },
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#334155',
  },
  avatarPlaceholder: {
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitialsContainer: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default OptimizedImage;
