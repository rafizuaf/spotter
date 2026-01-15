/**
 * ReceiptCard - Receiptify-aesthetic workout receipt
 *
 * Visual Aesthetic: Industrial Luxury / Thermal Receipt
 * - Crumpled thermal paper texture (implied via styling)
 * - Monospace dot-matrix font (Courier)
 * - Torn bottom edge effect
 * - Transactional, no-nonsense copywriting
 *
 * This component is designed to be captured via react-native-view-shot
 * and shared to Instagram Stories or saved to Photos.
 */

import React, { forwardRef, memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * Receipt line item interface
 */
export interface ReceiptItem {
  /** Exercise name */
  name: string;
  /** Number of sets performed */
  qty: number;
  /** Total volume for this exercise (weight × reps) */
  total: number;
}

/**
 * Pain level indicator
 */
export type PainLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * Props for ReceiptCard component
 */
export interface ReceiptCardProps {
  /** Line items (exercises with sets and volume) */
  items: ReceiptItem[];
  /** Total volume subtotal */
  subtotal: number;
  /** Workout date */
  date: Date;
  /** Optional gym name */
  gymName?: string;
  /** Pain level indicator */
  painLevel: PainLevel;
  /** Workout duration in minutes */
  durationMinutes: number;
  /** Number of PRs hit */
  prsHit: number;
}

/**
 * Format large numbers with commas
 */
const formatNumber = (num: number): string => {
  return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
};

/**
 * Format date for receipt
 */
const formatDate = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

/**
 * Get pain level display text
 */
const getPainLevelText = (level: PainLevel): string => {
  switch (level) {
    case 'LOW':
      return 'LOW (WARM-UP?)';
    case 'MEDIUM':
      return 'MEDIUM';
    case 'HIGH':
      return 'HIGH';
    case 'CRITICAL':
      return 'CRITICAL (SEEK HELP)';
    default:
      return 'UNKNOWN';
  }
};

/**
 * Generate a random transaction ID
 */
const generateTransactionId = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * ReceiptCard Component
 *
 * Renders a workout summary in thermal receipt style.
 * Always renders in Black & White for shareability.
 *
 * forwardRef is used to allow parent components to capture this view
 * using react-native-view-shot.
 */
const ReceiptCard = forwardRef<View, ReceiptCardProps>(
  ({ items, subtotal, date, gymName, painLevel, durationMinutes, prsHit }, ref) => {
    const transactionId = generateTransactionId();

    // Format duration
    const hours = Math.floor(durationMinutes / 60);
    const minutes = Math.round(durationMinutes % 60);
    const durationDisplay = hours > 0 ? `${hours}H ${minutes}M` : `${minutes}M`;

    return (
      <View ref={ref} style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.storeNameLine1}>SPOTTER GYM INC.</Text>
          <Text style={styles.storeNameLine2}>
            {gymName?.toUpperCase() || 'IRON PARADISE LOCATION'}
          </Text>
          <Text style={styles.tagline}>NO PAIN, NO INVOICE</Text>
        </View>

        {/* Dotted line separator */}
        <Text style={styles.dottedLine}>
          ================================
        </Text>

        {/* Transaction info */}
        <View style={styles.transactionInfo}>
          <Text style={styles.infoText}>DATE: {formatDate(date)}</Text>
          <Text style={styles.infoText}>TRANS#: {transactionId}</Text>
          <Text style={styles.infoText}>CASHIER: YOUR GAINS</Text>
        </View>

        {/* Dotted line separator */}
        <Text style={styles.dottedLine}>
          ================================
        </Text>

        {/* Column headers */}
        <View style={styles.columnHeaders}>
          <Text style={[styles.columnHeader, styles.itemColumn]}>ITEM</Text>
          <Text style={[styles.columnHeader, styles.qtyColumn]}>QTY</Text>
          <Text style={[styles.columnHeader, styles.totalColumn]}>TOTAL</Text>
        </View>

        {/* Dotted line separator */}
        <Text style={styles.dottedLine}>
          --------------------------------
        </Text>

        {/* Line items */}
        <View style={styles.itemsContainer}>
          {items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <Text
                style={[styles.itemText, styles.itemColumn]}
                numberOfLines={1}
              >
                {item.name.toUpperCase().slice(0, 16)}
              </Text>
              <Text style={[styles.itemText, styles.qtyColumn]}>
                x{item.qty}
              </Text>
              <Text style={[styles.itemText, styles.totalColumn]}>
                {formatNumber(item.total)}kg
              </Text>
            </View>
          ))}
        </View>

        {/* Dotted line separator */}
        <Text style={styles.dottedLine}>
          --------------------------------
        </Text>

        {/* Subtotal section */}
        <View style={styles.subtotalSection}>
          <View style={styles.subtotalRow}>
            <Text style={styles.subtotalLabel}>SUBTOTAL</Text>
            <Text style={styles.subtotalValue}>
              {formatNumber(subtotal)}kg
            </Text>
          </View>
          <View style={styles.subtotalRow}>
            <Text style={styles.subtotalLabel}>DURATION</Text>
            <Text style={styles.subtotalValue}>{durationDisplay}</Text>
          </View>
          {prsHit > 0 && (
            <View style={styles.subtotalRow}>
              <Text style={styles.subtotalLabel}>PRs HIT</Text>
              <Text style={styles.subtotalValue}>{prsHit}</Text>
            </View>
          )}
        </View>

        {/* Dotted line separator */}
        <Text style={styles.dottedLine}>
          ================================
        </Text>

        {/* Total */}
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>IRON MOVED</Text>
          <Text style={styles.totalValue}>{formatNumber(subtotal)}kg</Text>
        </View>

        {/* Pain level */}
        <View style={styles.painSection}>
          <Text style={styles.painLabel}>PAIN LEVEL:</Text>
          <Text style={styles.painValue}>{getPainLevelText(painLevel)}</Text>
        </View>

        {/* Dotted line separator */}
        <Text style={styles.dottedLine}>
          ================================
        </Text>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>TRANSACTION COMPLETE</Text>
          <Text style={styles.footerText}>PAYMENT: BLOOD, SWEAT, TEARS</Text>
          <Text style={styles.footerText}> </Text>
          <Text style={styles.footerBold}>NO REFUNDS ON GAINS</Text>
          <Text style={styles.footerBold}>KEEP RECEIPT FOR THERAPIST</Text>
          <Text style={styles.footerText}> </Text>
          <Text style={styles.footerSmall}>
            Questions? Too bad. Suck it up.
          </Text>
        </View>

        {/* Barcode simulation */}
        <View style={styles.barcodeSection}>
          <Text style={styles.barcode}>
            ||| || ||| | || ||| || | ||| ||
          </Text>
          <Text style={styles.barcodeNumber}>*SPOTTER-{transactionId}*</Text>
        </View>

        {/* Torn edge effect */}
        <View style={styles.tornEdge}>
          <Text style={styles.tornEdgeText}>
            ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~
          </Text>
        </View>
      </View>
    );
  }
);

ReceiptCard.displayName = 'ReceiptCard';

/**
 * Styles - Thermal Receipt / Dot-Matrix Aesthetic
 *
 * CRITICAL: This component is ALWAYS Black & White regardless of app theme.
 * This ensures consistent shareability across Instagram Stories.
 */
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
    width: 300,
    // Subtle paper texture effect via shadow
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  header: {
    alignItems: 'center',
    marginBottom: 8,
  },
  storeNameLine1: {
    fontFamily: 'Courier',
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 2,
  },
  storeNameLine2: {
    fontFamily: 'Courier',
    fontSize: 11,
    fontWeight: '400',
    color: '#333333',
    marginTop: 2,
  },
  tagline: {
    fontFamily: 'Courier',
    fontSize: 10,
    fontWeight: '400',
    color: '#666666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  dottedLine: {
    fontFamily: 'Courier',
    fontSize: 10,
    color: '#999999',
    textAlign: 'center',
    marginVertical: 6,
    letterSpacing: -1,
  },
  transactionInfo: {
    alignItems: 'flex-start',
  },
  infoText: {
    fontFamily: 'Courier',
    fontSize: 10,
    color: '#333333',
    lineHeight: 14,
  },
  columnHeaders: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  columnHeader: {
    fontFamily: 'Courier',
    fontSize: 10,
    fontWeight: '700',
    color: '#000000',
  },
  itemColumn: {
    flex: 1,
    textAlign: 'left',
  },
  qtyColumn: {
    width: 40,
    textAlign: 'center',
  },
  totalColumn: {
    width: 70,
    textAlign: 'right',
  },
  itemsContainer: {
    marginVertical: 4,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  itemText: {
    fontFamily: 'Courier',
    fontSize: 11,
    color: '#000000',
  },
  subtotalSection: {
    marginVertical: 4,
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  subtotalLabel: {
    fontFamily: 'Courier',
    fontSize: 11,
    color: '#333333',
  },
  subtotalValue: {
    fontFamily: 'Courier',
    fontSize: 11,
    color: '#333333',
    fontWeight: '600',
  },
  totalSection: {
    alignItems: 'center',
    marginVertical: 8,
  },
  totalLabel: {
    fontFamily: 'Courier',
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
  },
  totalValue: {
    fontFamily: 'Courier',
    fontSize: 24,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 1,
  },
  painSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  painLabel: {
    fontFamily: 'Courier',
    fontSize: 10,
    color: '#333333',
    marginRight: 4,
  },
  painValue: {
    fontFamily: 'Courier',
    fontSize: 10,
    fontWeight: '700',
    color: '#000000',
  },
  footer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  footerText: {
    fontFamily: 'Courier',
    fontSize: 9,
    color: '#666666',
    lineHeight: 12,
  },
  footerBold: {
    fontFamily: 'Courier',
    fontSize: 10,
    fontWeight: '700',
    color: '#000000',
    lineHeight: 14,
  },
  footerSmall: {
    fontFamily: 'Courier',
    fontSize: 8,
    color: '#999999',
    fontStyle: 'italic',
  },
  barcodeSection: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  barcode: {
    fontFamily: 'Courier',
    fontSize: 20,
    color: '#000000',
    letterSpacing: -2,
  },
  barcodeNumber: {
    fontFamily: 'Courier',
    fontSize: 8,
    color: '#333333',
    marginTop: 2,
  },
  tornEdge: {
    alignItems: 'center',
    marginTop: 8,
  },
  tornEdgeText: {
    fontFamily: 'Courier',
    fontSize: 12,
    color: '#CCCCCC',
    letterSpacing: 2,
  },
});

export default memo(ReceiptCard);
