/**
 * Phase 2D: Export options – format (CSV/JSON/PDF), date range, tier-aware.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { getButtonA11yProps } from '../utils/accessibility';
import type { ExportFormat } from '../services/importers';
import type { ExportTier } from '../services/exporters';

export type DateRangePreset = 'last7' | 'last30' | 'all';

export interface ExportOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  onExport: (opts: { format: ExportFormat; dateRange: { start: Date; end: Date } }) => void;
  tier: ExportTier;
  canExportCsv: boolean;
  canExportJson: boolean;
  canExportPdf: boolean;
  csvLimitReason?: string;
  exporting?: boolean;
  /** Pre-select format when opening (e.g. from "Export to CSV" button). */
  initialFormat?: ExportFormat;
}

const PRESETS: { key: DateRangePreset; label: string; days: number | null }[] = [
  { key: 'last7', label: 'Last 7 days', days: 7 },
  { key: 'last30', label: 'Last 30 days', days: 30 },
  { key: 'all', label: 'All time', days: null },
];

function presetToRange(preset: DateRangePreset): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  const p = PRESETS.find((x) => x.key === preset);
  if (p?.days) {
    start.setDate(start.getDate() - p.days);
  } else {
    start.setFullYear(start.getFullYear() - 10);
  }
  return { start, end };
}

export default function ExportOptionsModal({
  visible,
  onClose,
  onExport,
  tier,
  canExportCsv,
  canExportJson,
  canExportPdf,
  csvLimitReason,
  exporting = false,
  initialFormat = 'csv',
}: ExportOptionsModalProps) {
  const colors = useTheme();
  const [format, setFormat] = useState<ExportFormat>(initialFormat);
  const [preset, setPreset] = useState<DateRangePreset>('last30');

  useEffect(() => {
    if (visible) setFormat(initialFormat);
  }, [visible, initialFormat]);

  const allowed = (f: ExportFormat) =>
    f === 'csv' ? canExportCsv : f === 'json' ? canExportJson : canExportPdf;

  const handleExport = useCallback(() => {
    if (!allowed(format)) return;
    const dateRange = presetToRange(preset);
    onExport({ format, dateRange });
  }, [format, preset, onExport, canExportCsv, canExportJson, canExportPdf]);

  const exportDisabled = !allowed(format) || exporting;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={onClose}
            disabled={exporting}
            {...getButtonA11yProps('Close', 'Close without exporting')}
          >
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Export</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content}>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Format</Text>
            {(['csv', 'json', 'pdf'] as const).map((f) => {
              const ok = allowed(f);
              const label = f === 'csv' ? 'CSV' : f === 'json' ? 'JSON' : 'PDF';
              const hint =
                f === 'csv' && !ok && csvLimitReason
                  ? csvLimitReason
                  : f === 'json' && !ok
                    ? 'Upgrade to Pro'
                    : f === 'pdf' && !ok
                      ? 'Upgrade to Elite'
                      : undefined;
              return (
                <TouchableOpacity
                  key={f}
                  style={[
                    styles.formatRow,
                    { borderBottomColor: colors.border },
                    !ok && styles.formatRowDisabled,
                  ]}
                  onPress={() => ok && setFormat(f)}
                  disabled={!ok}
                  {...getButtonA11yProps(
                    label + (ok ? ', select' : ', disabled'),
                    hint
                  )}
                >
                  <View>
                    <Text
                      style={[
                        styles.formatLabel,
                        { color: ok ? colors.textPrimary : colors.textMuted },
                      ]}
                    >
                      {label}
                    </Text>
                    {hint && (
                      <Text style={[styles.formatHint, { color: colors.textMuted }]}>
                        {hint}
                      </Text>
                    )}
                  </View>
                  {format === f && (
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              Date range
            </Text>
            {PRESETS.map((p) => (
              <TouchableOpacity
                key={p.key}
                style={[styles.formatRow, { borderBottomColor: colors.border }]}
                onPress={() => setPreset(p.key)}
                {...getButtonA11yProps(p.label, 'Select date range')}
              >
                <Text
                  style={[
                    styles.formatLabel,
                    { color: preset === p.key ? colors.primary : colors.textPrimary },
                  ]}
                >
                  {p.label}
                </Text>
                {preset === p.key && (
                  <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {tier === 'FREE' && (
            <Text style={[styles.freeHint, { color: colors.textMuted }]}>
              Free: CSV export limited to last 30 days, once per month.
            </Text>
          )}
        </ScrollView>

        <View style={[styles.actions, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
            onPress={onClose}
            disabled={exporting}
            {...getButtonA11yProps('Cancel', 'Close without exporting')}
          >
            <Text style={[styles.buttonText, { color: colors.textPrimary }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.button,
              styles.exportButton,
              { backgroundColor: colors.primary },
              exportDisabled && styles.buttonDisabled,
            ]}
            onPress={handleExport}
            disabled={exportDisabled}
            {...getButtonA11yProps(
              exporting ? 'Exporting…' : 'Export',
              exportDisabled ? 'Select an available format' : 'Export data'
            )}
          >
            <Text
              style={[
                styles.buttonText,
                { color: colors.background },
                exportDisabled && styles.buttonTextDisabled,
              ]}
            >
              {exporting ? 'Exporting…' : 'Export'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '700' },
  headerSpacer: { width: 24 },
  content: { flex: 1, padding: 16 },
  card: {
    padding: 4,
    borderRadius: 12,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  formatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
  },
  formatRowDisabled: { opacity: 0.7 },
  formatLabel: { fontSize: 16, fontWeight: '500' },
  formatHint: { fontSize: 12, marginTop: 2 },
  freeHint: {
    fontSize: 13,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: { borderWidth: 1 },
  exportButton: {},
  buttonDisabled: { opacity: 0.6 },
  buttonText: { fontSize: 16, fontWeight: '600' },
  buttonTextDisabled: { opacity: 0.8 },
});
