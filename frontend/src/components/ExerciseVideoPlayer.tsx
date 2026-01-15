import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { parseYouTubeVideoId } from '../utils/videoUrl';

interface ExerciseVideoPlayerProps {
  videoUrl: string | null | undefined;
  height?: number;
}

export default function ExerciseVideoPlayer({
  videoUrl,
  height = 220,
}: ExerciseVideoPlayerProps) {
  const colors = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [hasError, setHasError] = useState(false);

  const videoId = parseYouTubeVideoId(videoUrl);

  // Check network status
  useEffect(() => {
    const checkConnection = async () => {
      const state = await NetInfo.fetch();
      setIsOffline(!state.isConnected);
    };
    checkConnection();

    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!state.isConnected);
    });

    return () => unsubscribe();
  }, []);

  const handleReady = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  // No video available
  if (!videoId) {
    return (
      <View
        style={[
          styles.messageContainer,
          { backgroundColor: colors.surface, height },
        ]}
      >
        <Ionicons name="videocam-off-outline" size={40} color={colors.textMuted} />
        <Text style={[styles.messageText, { color: colors.textSecondary }]}>
          No video demo available
        </Text>
      </View>
    );
  }

  // Offline state
  if (isOffline) {
    return (
      <View
        style={[
          styles.messageContainer,
          { backgroundColor: colors.surface, height },
        ]}
      >
        <Ionicons
          name="cloud-offline-outline"
          size={40}
          color={colors.textMuted}
        />
        <Text style={[styles.messageText, { color: colors.textSecondary }]}>
          Video requires internet connection
        </Text>
        <Text style={[styles.hintText, { color: colors.textMuted }]}>
          Connect to watch the exercise demo
        </Text>
      </View>
    );
  }

  // Error state
  if (hasError) {
    return (
      <View
        style={[
          styles.messageContainer,
          { backgroundColor: colors.surface, height },
        ]}
      >
        <Ionicons name="alert-circle-outline" size={40} color={colors.error} />
        <Text style={[styles.messageText, { color: colors.error }]}>
          Failed to load video
        </Text>
        <Text style={[styles.hintText, { color: colors.textMuted }]}>
          Please try again later
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {isLoading && (
        <View style={[styles.loadingOverlay, { height }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading video...
          </Text>
        </View>
      )}
      <YoutubePlayer
        height={height}
        videoId={videoId}
        onReady={handleReady}
        onError={handleError}
        webViewProps={{
          allowsInlineMediaPlayback: true,
          mediaPlaybackRequiresUserAction: false,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  messageContainer: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  messageText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '500',
  },
  hintText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
  },
});
