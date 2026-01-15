/**
 * RansomNote - Re-engagement threat card
 *
 * Visual Aesthetic: Cut-out Magazine Letter Collage
 * - Mixed fonts and sizes
 * - Dark humor threatening tone
 * - Red accent highlights
 * - "WE HAVE YOUR GAINS" messaging
 *
 * This component is designed to be captured via react-native-view-shot
 * and shared to Instagram Stories or saved to Photos.
 */

import React, { forwardRef, memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { RansomNoteProps } from './types';

/**
 * RansomNote Component
 *
 * Renders a threatening re-engagement message in ransom note style.
 * Uses mixed fonts and cut-out letter aesthetic.
 *
 * forwardRef is used to allow parent components to capture this view
 * using react-native-view-shot.
 */
const RansomNote = forwardRef<View, RansomNoteProps>(
  ({ daysSinceWorkout, gainsAtRisk }, ref) => {
    // Select top 3 gains at risk
    const displayedGains = gainsAtRisk.slice(0, 3);

    return (
      <View ref={ref} style={styles.container}>
        {/* Paper background with slight rotation */}
        <View style={styles.paper}>
          {/* Header - "WE HAVE" */}
          <View style={styles.headerRow}>
            <View style={[styles.letterBox, styles.letterBoxDark]}>
              <Text style={[styles.letter, styles.letterLight]}>W</Text>
            </View>
            <View style={[styles.letterBox, styles.letterBoxLight]}>
              <Text style={[styles.letter, styles.letterDark]}>E</Text>
            </View>
            <View style={styles.spacer} />
            <View style={[styles.letterBox, styles.letterBoxRed]}>
              <Text style={[styles.letter, styles.letterLight]}>H</Text>
            </View>
            <View style={[styles.letterBox, styles.letterBoxDark]}>
              <Text style={[styles.letter, styles.letterLight]}>A</Text>
            </View>
            <View style={[styles.letterBox, styles.letterBoxLight]}>
              <Text style={[styles.letter, styles.letterDark]}>V</Text>
            </View>
            <View style={[styles.letterBox, styles.letterBoxDark]}>
              <Text style={[styles.letter, styles.letterLight]}>E</Text>
            </View>
          </View>

          {/* "YOUR GAINS" */}
          <View style={styles.gainsRow}>
            <View style={[styles.wordBox, styles.wordBoxRed]}>
              <Text style={styles.wordText}>YOUR</Text>
            </View>
            <View style={[styles.wordBox, styles.wordBoxDark]}>
              <Text style={[styles.wordText, styles.wordTextLarge]}>GAINS</Text>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Days counter */}
          <View style={styles.daysSection}>
            <Text style={styles.daysLabel}>DAYS M.I.A.</Text>
            <View style={styles.daysBox}>
              <Text style={styles.daysNumber}>{daysSinceWorkout}</Text>
            </View>
          </View>

          {/* Threat message */}
          <View style={styles.threatSection}>
            <Text style={styles.threatText}>
              RETURN TO GYM WITHIN
            </Text>
            <View style={styles.hoursBadge}>
              <Text style={styles.hoursText}>24 HOURS</Text>
            </View>
            <Text style={styles.threatText}>
              OR THE BICEPS GET IT
            </Text>
          </View>

          {/* Gains at risk list */}
          {displayedGains.length > 0 && (
            <View style={styles.gainsListSection}>
              <Text style={styles.gainsListTitle}>GAINS AT RISK:</Text>
              {displayedGains.map((gain, index) => (
                <View key={index} style={styles.gainItem}>
                  <View style={styles.bulletPoint} />
                  <Text style={styles.gainText}>{gain.toUpperCase()}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Divider */}
          <View style={styles.dividerThin} />

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              NO POLICE. NO EXCUSES.
            </Text>
            <Text style={styles.footerSubtext}>
              (We're watching your step count)
            </Text>
          </View>

          {/* Cut-out decoration strips */}
          <View style={[styles.strip, styles.stripTop]} />
          <View style={[styles.strip, styles.stripBottom]} />
        </View>
      </View>
    );
  }
);

RansomNote.displayName = 'RansomNote';

/**
 * Styles - Magazine Cut-out Collage Aesthetic
 *
 * Uses mixed sizes and colors to simulate cut-out letters.
 */
const styles = StyleSheet.create({
  container: {
    padding: 12,
    // Shadow for depth
    shadowColor: '#000000',
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  paper: {
    backgroundColor: '#F5F5F0',
    padding: 20,
    width: 300,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    // Slight rotation for uneven look
    transform: [{ rotate: '-1deg' }],
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  letterBox: {
    width: 32,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 2,
    // Slight random rotations would be applied per-letter
  },
  letterBoxDark: {
    backgroundColor: '#1A1A1A',
    transform: [{ rotate: '2deg' }],
  },
  letterBoxLight: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#333333',
    transform: [{ rotate: '-3deg' }],
  },
  letterBoxRed: {
    backgroundColor: '#CC0000',
    transform: [{ rotate: '1deg' }],
  },
  letter: {
    fontSize: 24,
    fontWeight: '900',
  },
  letterLight: {
    color: '#FFFFFF',
  },
  letterDark: {
    color: '#1A1A1A',
  },
  spacer: {
    width: 8,
  },
  gainsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
  },
  wordBox: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 4,
  },
  wordBoxRed: {
    backgroundColor: '#CC0000',
    transform: [{ rotate: '-2deg' }],
  },
  wordBoxDark: {
    backgroundColor: '#1A1A1A',
    transform: [{ rotate: '1deg' }],
  },
  wordText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  wordTextLarge: {
    fontSize: 28,
  },
  divider: {
    height: 3,
    backgroundColor: '#1A1A1A',
    marginVertical: 16,
  },
  dividerThin: {
    height: 1,
    backgroundColor: '#999999',
    marginVertical: 12,
  },
  daysSection: {
    alignItems: 'center',
    marginVertical: 12,
  },
  daysLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    letterSpacing: 3,
    marginBottom: 8,
  },
  daysBox: {
    backgroundColor: '#CC0000',
    paddingHorizontal: 24,
    paddingVertical: 12,
    transform: [{ rotate: '2deg' }],
  },
  daysNumber: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    fontFamily: 'monospace',
  },
  threatSection: {
    alignItems: 'center',
    marginVertical: 12,
  },
  threatText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: 1,
    textAlign: 'center',
  },
  hoursBadge: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginVertical: 8,
    transform: [{ rotate: '-1deg' }],
  },
  hoursText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#CC0000',
    letterSpacing: 2,
  },
  gainsListSection: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    marginVertical: 12,
    borderWidth: 2,
    borderColor: '#1A1A1A',
    borderStyle: 'dashed',
  },
  gainsListTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#CC0000',
    letterSpacing: 2,
    marginBottom: 8,
  },
  gainItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  bulletPoint: {
    width: 8,
    height: 8,
    backgroundColor: '#1A1A1A',
    marginRight: 8,
    transform: [{ rotate: '45deg' }],
  },
  gainText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333333',
    letterSpacing: 1,
  },
  footer: {
    alignItems: 'center',
    marginTop: 8,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#1A1A1A',
    letterSpacing: 2,
  },
  footerSubtext: {
    fontSize: 9,
    fontWeight: '400',
    color: '#666666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  strip: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#CC0000',
  },
  stripTop: {
    top: 0,
  },
  stripBottom: {
    bottom: 0,
  },
});

export default memo(RansomNote);
