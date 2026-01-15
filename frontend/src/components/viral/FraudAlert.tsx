/**
 * FraudAlert - Leg day skipping accusation card
 *
 * Visual Aesthetic: Police/FBI Warning Style
 * - Red "FRAUD DETECTED" stamp
 * - Official document layout
 * - Warning stripes
 * - Accusatory but humorous tone
 *
 * This component is designed to be captured via react-native-view-shot
 * and shared to Instagram Stories or saved to Photos.
 */

import React, { forwardRef, memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { FraudAlertProps } from './types';

/**
 * FraudAlert Component
 *
 * Renders a fraud/warning alert for neglected muscle groups.
 * Primarily used for leg day skippers.
 *
 * forwardRef is used to allow parent components to capture this view
 * using react-native-view-shot.
 */
const FraudAlert = forwardRef<View, FraudAlertProps>(
  ({ muscleGroup, daysSinceVolume }, ref) => {
    const caseNumber = `SPOTTER-${Date.now().toString().slice(-6)}`;

    return (
      <View ref={ref} style={styles.container}>
        {/* Warning stripes top */}
        <View style={styles.warningStripesTop}>
          {[...Array(8)].map((_, i) => (
            <View
              key={i}
              style={[
                styles.stripe,
                i % 2 === 0 ? styles.stripeYellow : styles.stripeBlack,
              ]}
            />
          ))}
        </View>

        {/* Main document */}
        <View style={styles.document}>
          {/* Header */}
          <View style={styles.header}>
            <Ionicons name="shield-checkmark" size={32} color="#CC0000" />
            <View style={styles.headerText}>
              <Text style={styles.agencyName}>SPOTTER GAINS PROTECTION</Text>
              <Text style={styles.agencySubtitle}>FRAUD INVESTIGATION UNIT</Text>
            </View>
            <Ionicons name="shield-checkmark" size={32} color="#CC0000" />
          </View>

          {/* Red stamp overlay */}
          <View style={styles.stampContainer}>
            <View style={styles.stamp}>
              <Text style={styles.stampText}>FRAUD</Text>
              <Text style={styles.stampText}>DETECTED</Text>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Alert content */}
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>SECURITY ALERT</Text>
            <Text style={styles.alertSubtitle}>
              Suspicious activity detected on your account
            </Text>
          </View>

          {/* Case details */}
          <View style={styles.caseSection}>
            <View style={styles.caseRow}>
              <Text style={styles.caseLabel}>CASE #:</Text>
              <Text style={styles.caseValue}>{caseNumber}</Text>
            </View>
            <View style={styles.caseRow}>
              <Text style={styles.caseLabel}>SUBJECT:</Text>
              <Text style={styles.caseValue}>{muscleGroup.toUpperCase()}</Text>
            </View>
            <View style={styles.caseRow}>
              <Text style={styles.caseLabel}>STATUS:</Text>
              <Text style={[styles.caseValue, styles.statusMissing]}>MISSING</Text>
            </View>
            <View style={styles.caseRow}>
              <Text style={styles.caseLabel}>DAYS ABSENT:</Text>
              <Text style={[styles.caseValue, styles.daysValue]}>{daysSinceVolume}</Text>
            </View>
          </View>

          {/* Accusation */}
          <View style={styles.accusationSection}>
            <Text style={styles.accusationTitle}>FINDINGS:</Text>
            <Text style={styles.accusationText}>
              Your {muscleGroup.toLowerCase()} have been reported missing.
              {'\n'}
              This constitutes gainz fraud under Section 3.14 of the
              {'\n'}
              International Lifting Code.
            </Text>
          </View>

          {/* Warning box */}
          <View style={styles.warningBox}>
            <Ionicons name="warning" size={20} color="#CC0000" />
            <Text style={styles.warningText}>
              FAILURE TO TRAIN {muscleGroup.toUpperCase()} WITHIN 48 HOURS
              WILL RESULT IN PERMANENT CHICKEN LEGS STATUS
            </Text>
            <Ionicons name="warning" size={20} color="#CC0000" />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              This is an automated alert. Do not reply.
            </Text>
            <Text style={styles.footerText}>
              Your gym bros are watching.
            </Text>
          </View>

          {/* Official seal */}
          <View style={styles.sealContainer}>
            <View style={styles.seal}>
              <Text style={styles.sealText}>OFFICIAL</Text>
            </View>
          </View>
        </View>

        {/* Warning stripes bottom */}
        <View style={styles.warningStripesBottom}>
          {[...Array(8)].map((_, i) => (
            <View
              key={i}
              style={[
                styles.stripe,
                i % 2 === 0 ? styles.stripeYellow : styles.stripeBlack,
              ]}
            />
          ))}
        </View>
      </View>
    );
  }
);

FraudAlert.displayName = 'FraudAlert';

/**
 * Styles - Police/FBI Warning Document Aesthetic
 *
 * Uses official document styling with warning colors.
 */
const styles = StyleSheet.create({
  container: {
    width: 320,
    // Shadow for depth
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  warningStripesTop: {
    flexDirection: 'row',
    height: 12,
  },
  warningStripesBottom: {
    flexDirection: 'row',
    height: 12,
  },
  stripe: {
    flex: 1,
    transform: [{ skewX: '-20deg' }],
  },
  stripeYellow: {
    backgroundColor: '#FFD700',
  },
  stripeBlack: {
    backgroundColor: '#1A1A1A',
  },
  document: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderColor: '#1A1A1A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerText: {
    alignItems: 'center',
    flex: 1,
  },
  agencyName: {
    fontSize: 12,
    fontWeight: '900',
    color: '#1A1A1A',
    letterSpacing: 1,
    textAlign: 'center',
  },
  agencySubtitle: {
    fontSize: 8,
    fontWeight: '600',
    color: '#666666',
    letterSpacing: 2,
    marginTop: 2,
  },
  stampContainer: {
    position: 'absolute',
    top: 40,
    right: 20,
    transform: [{ rotate: '-15deg' }],
  },
  stamp: {
    borderWidth: 4,
    borderColor: '#CC0000',
    borderRadius: 4,
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  stampText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#CC0000',
    letterSpacing: 2,
    textAlign: 'center',
  },
  divider: {
    height: 2,
    backgroundColor: '#1A1A1A',
    marginVertical: 12,
  },
  alertContent: {
    alignItems: 'center',
    marginVertical: 12,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#CC0000',
    letterSpacing: 3,
  },
  alertSubtitle: {
    fontSize: 11,
    fontWeight: '400',
    color: '#333333',
    marginTop: 4,
    textAlign: 'center',
  },
  caseSection: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#CCCCCC',
  },
  caseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  caseLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#666666',
    letterSpacing: 1,
  },
  caseValue: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1A1A1A',
    fontFamily: 'monospace',
  },
  statusMissing: {
    color: '#CC0000',
    fontWeight: '900',
  },
  daysValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#CC0000',
  },
  accusationSection: {
    marginVertical: 12,
  },
  accusationTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#666666',
    letterSpacing: 2,
    marginBottom: 8,
  },
  accusationText: {
    fontSize: 11,
    fontWeight: '400',
    color: '#333333',
    lineHeight: 16,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    borderWidth: 2,
    borderColor: '#CC0000',
    padding: 10,
    marginVertical: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 9,
    fontWeight: '700',
    color: '#CC0000',
    textAlign: 'center',
    marginHorizontal: 8,
    lineHeight: 12,
  },
  footer: {
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  footerText: {
    fontSize: 9,
    fontWeight: '400',
    color: '#999999',
    fontStyle: 'italic',
    lineHeight: 14,
  },
  sealContainer: {
    position: 'absolute',
    bottom: 60,
    left: 20,
    transform: [{ rotate: '10deg' }],
  },
  seal: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  sealText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#1A1A1A',
    letterSpacing: 1,
  },
});

export default memo(FraudAlert);
