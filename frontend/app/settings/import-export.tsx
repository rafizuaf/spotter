/**
 * Phase 2D: Import & Export settings screen.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuthStore } from '../../src/stores/authStore';
import { useImportStore } from '../../src/stores/importStore';
import { parseHevyCsv, parseHevyJson, parseStrongCsv, parseGenericCsv } from '../../src/services/importers';
import type { ImportPreview, ExportFormat } from '../../src/services/importers';
import ImportPreviewModal from '../../src/components/ImportPreviewModal';
import ExportOptionsModal from '../../src/components/ExportOptionsModal';
import {
  getTier,
  getLastExportAt,
  canExportCsv,
  canExportJson,
  canExportPdf,
  shareCsvExport,
  shareJsonExport,
  sharePdfExport,
  shareCsvTemplate,
} from '../../src/services/exporters';
import type { ExportTier } from '../../src/services/exporters';

export default function ImportExportScreen() {
  const colors = useTheme();
  const { user } = useAuthStore();
  const {
    isImporting,
    lastImportResult,
    lastImportError,
    startBackgroundImport,
    clearImportResult,
  } = useImportStore();

  const [parsing, setParsing] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportInitialFormat, setExportInitialFormat] = useState<ExportFormat>('csv');
  const [exportTier, setExportTier] = useState<ExportTier>('FREE');
  const [exportCanCsv, setExportCanCsv] = useState(true);
  const [exportCanJson, setExportCanJson] = useState(false);
  const [exportCanPdf, setExportCanPdf] = useState(false);
  const [exportCsvLimitReason, setExportCsvLimitReason] = useState<string | undefined>();
  const [exporting, setExporting] = useState(false);

  const pickAndParseCsv = async (
    parse: (csv: string) => Promise<ImportPreview>
  ): Promise<ImportPreview | null> => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'text/csv',
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return null;
    const content = await FileSystem.readAsStringAsync(result.assets[0].uri);
    return parse(content);
  };

  const pickAndParseJson = async (
    parse: (json: string) => Promise<ImportPreview>
  ): Promise<ImportPreview | null> => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return null;
    const content = await FileSystem.readAsStringAsync(result.assets[0].uri);
    return parse(content);
  };

  const handleImportHevy = async () => {
    if (!user) return;
    if (isImporting || parsing) return;
    try {
      setParsing(true);
      const importPreview = await pickAndParseCsv(parseHevyCsv);
      if (importPreview) {
        setPreview(importPreview);
        setShowPreview(true);
      }
    } catch (err) {
      console.error('Import error:', err);
      Alert.alert('Error', 'Failed to read file. Please try again.');
    } finally {
      setParsing(false);
    }
  };

  const handleImportHevyJson = async () => {
    if (!user) return;
    if (isImporting || parsing) return;
    try {
      setParsing(true);
      const importPreview = await pickAndParseJson(parseHevyJson);
      if (importPreview) {
        setPreview(importPreview);
        setShowPreview(true);
      }
    } catch (err) {
      console.error('Import error:', err);
      Alert.alert('Error', 'Failed to read file. Please try again.');
    } finally {
      setParsing(false);
    }
  };

  const handleImportStrong = async () => {
    if (!user) return;
    if (isImporting || parsing) return;
    try {
      setParsing(true);
      const importPreview = await pickAndParseCsv(parseStrongCsv);
      if (importPreview) {
        setPreview(importPreview);
        setShowPreview(true);
      }
    } catch (err) {
      console.error('Import error:', err);
      Alert.alert('Error', 'Failed to read file. Please try again.');
    } finally {
      setParsing(false);
    }
  };

  const handleImportGeneric = async () => {
    if (!user) return;
    if (isImporting || parsing) return;
    try {
      setParsing(true);
      const importPreview = await pickAndParseCsv(parseGenericCsv);
      if (importPreview) {
        setPreview(importPreview);
        setShowPreview(true);
      }
    } catch (err) {
      console.error('Import error:', err);
      Alert.alert('Error', 'Failed to read file. Please try again.');
    } finally {
      setParsing(false);
    }
  };

  const handleImportAppleHealth = async () => {
    if (!user) return;
    Alert.alert(
      'Apple Health Import',
      'Apple Health import is coming soon. For now, you can export your Health data and import it as a generic CSV.',
      [{ text: 'OK' }]
    );
  };

  const handleConfirmImport = () => {
    if (!preview || !user) return;
    startBackgroundImport(preview.workouts, user.id, true);
    setShowPreview(false);
    setPreview(null);
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    setPreview(null);
  };

  const openExportModal = useCallback(
    async (format: ExportFormat) => {
      if (!user) return;
      if (parsing || isImporting) return;
      try {
        const tier = await getTier(user.id);
        const lastExport = await getLastExportAt();
        const csvCheck = canExportCsv(tier, lastExport);
        setExportTier(tier);
        setExportCanCsv(csvCheck.allowed);
        setExportCanJson(canExportJson(tier).allowed);
        setExportCanPdf(canExportPdf(tier).allowed);
        setExportCsvLimitReason(csvCheck.reason);
        setExportInitialFormat(format);
        setShowExportModal(true);
      } catch (e) {
        console.error('Export prep error:', e);
        Alert.alert('Error', 'Could not load export options.');
      }
    },
    [user, parsing, isImporting]
  );

  const handleExportConfirm = useCallback(
    async (opts: { format: ExportFormat; dateRange: { start: Date; end: Date } }) => {
      if (!user) return;
      setExporting(true);
      try {
        if (opts.format === 'csv') {
          const res = await shareCsvExport(user.id, {
            format: 'csv',
            dateRange: opts.dateRange,
            includeBodyLogs: false,
            includeRoutines: false,
          });
          if (!res.success) {
            Alert.alert('Export failed', res.error);
            return;
          }
          setShowExportModal(false);
        } else if (opts.format === 'json') {
          const res = await shareJsonExport(user.id, {
            format: 'json',
            dateRange: opts.dateRange,
            includeBodyLogs: false,
            includeRoutines: false,
          });
          if (!res.success) {
            Alert.alert('Export failed', res.error);
            return;
          }
          setShowExportModal(false);
        } else {
          const res = await sharePdfExport(user.id, {
            format: 'pdf',
            dateRange: opts.dateRange,
            includeBodyLogs: false,
            includeRoutines: false,
          });
          if (!res.success) {
            Alert.alert('Export failed', res.error);
            return;
          }
          setShowExportModal(false);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Export failed';
        Alert.alert('Export failed', msg);
      } finally {
        setExporting(false);
      }
    },
    [user]
  );

  const busy = parsing || isImporting;

  return (
    <>
      <Stack.Screen options={{ title: 'Import & Export' }} />
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        {lastImportResult && (
          <View
            style={[
              styles.banner,
              styles.bannerSuccess,
              { backgroundColor: colors.surface, borderColor: colors.primary },
            ]}
          >
            <Text style={[styles.bannerText, { color: colors.textPrimary }]}>
              Imported {lastImportResult.workoutsImported} workouts,{' '}
              {lastImportResult.setsImported} sets.
              {lastImportResult.exercisesCreated > 0 &&
                ` ${lastImportResult.exercisesCreated} new exercises created.`}
            </Text>
            <TouchableOpacity
              onPress={clearImportResult}
              style={styles.bannerDismiss}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}
        {lastImportError && (
          <View
            style={[
              styles.banner,
              styles.bannerError,
              { backgroundColor: colors.surface, borderColor: colors.error },
            ]}
          >
            <Text style={[styles.bannerText, { color: colors.textPrimary }]}>
              Import failed: {lastImportError}
            </Text>
            <TouchableOpacity
              onPress={clearImportResult}
              style={styles.bannerDismiss}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}
        {isImporting && (
          <View style={[styles.banner, { backgroundColor: colors.surface }]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.bannerText, { color: colors.textSecondary, marginLeft: 8 }]}>
              Import in progress…
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>IMPORT</Text>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={[styles.item, { borderBottomColor: colors.border }]}
              onPress={handleImportHevy}
              disabled={busy}
            >
              <View style={styles.itemLeft}>
                <Ionicons
                  name="download-outline"
                  size={24}
                  color={busy ? colors.textMuted : colors.primary}
                />
                <View style={styles.itemText}>
                  <Text
                    style={[
                      styles.itemLabel,
                      { color: busy ? colors.textMuted : colors.textPrimary },
                    ]}
                  >
                    Import from Hevy (CSV)
                  </Text>
                  <Text style={[styles.itemDescription, { color: colors.textMuted }]}>
                    Import workouts from Hevy CSV export
                  </Text>
                </View>
              </View>
              {parsing ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.item, { borderBottomColor: colors.border }]}
              onPress={handleImportHevyJson}
              disabled={busy}
            >
              <View style={styles.itemLeft}>
                <Ionicons
                  name="download-outline"
                  size={24}
                  color={busy ? colors.textMuted : colors.primary}
                />
                <View style={styles.itemText}>
                  <Text
                    style={[
                      styles.itemLabel,
                      { color: busy ? colors.textMuted : colors.textPrimary },
                    ]}
                  >
                    Import from Hevy (JSON)
                  </Text>
                  <Text style={[styles.itemDescription, { color: colors.textMuted }]}>
                    Import workouts from Hevy JSON export
                  </Text>
                </View>
              </View>
              {parsing ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.item, { borderBottomColor: colors.border }]}
              onPress={handleImportStrong}
              disabled={busy}
            >
              <View style={styles.itemLeft}>
                <Ionicons
                  name="download-outline"
                  size={24}
                  color={busy ? colors.textMuted : colors.primary}
                />
                <View style={styles.itemText}>
                  <Text
                    style={[
                      styles.itemLabel,
                      { color: busy ? colors.textMuted : colors.textPrimary },
                    ]}
                  >
                    Import from Strong
                  </Text>
                  <Text style={[styles.itemDescription, { color: colors.textMuted }]}>
                    Import workouts from Strong CSV export
                  </Text>
                </View>
              </View>
              {parsing ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.item, { borderBottomColor: colors.border }]}
              onPress={handleImportAppleHealth}
              disabled={busy}
            >
              <View style={styles.itemLeft}>
                <Ionicons
                  name="heart-outline"
                  size={24}
                  color={busy ? colors.textMuted : colors.primary}
                />
                <View style={styles.itemText}>
                  <Text
                    style={[
                      styles.itemLabel,
                      { color: busy ? colors.textMuted : colors.textPrimary },
                    ]}
                  >
                    Import from Apple Health
                  </Text>
                  <Text style={[styles.itemDescription, { color: colors.textMuted }]}>
                    Coming soon - Export Health data and import as CSV
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.item}
              onPress={handleImportGeneric}
              disabled={busy}
            >
              <View style={styles.itemLeft}>
                <Ionicons
                  name="document-text-outline"
                  size={24}
                  color={busy ? colors.textMuted : colors.primary}
                />
                <View style={styles.itemText}>
                  <Text
                    style={[
                      styles.itemLabel,
                      { color: busy ? colors.textMuted : colors.textPrimary },
                    ]}
                  >
                    Import CSV
                  </Text>
                  <Text style={[styles.itemDescription, { color: colors.textMuted }]}>
                    Import from generic CSV template
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.templateRow, { borderTopColor: colors.border }]}
              onPress={async () => {
                const res = await shareCsvTemplate();
                if (!res.success) Alert.alert('Error', res.error);
              }}
              disabled={busy}
            >
              <Text
                style={[
                  styles.templateText,
                  { color: busy ? colors.textMuted : colors.primary },
                ]}
              >
                Download CSV template
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>EXPORT</Text>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={[styles.item, { borderBottomColor: colors.border }]}
              onPress={() => openExportModal('csv')}
              disabled={busy}
            >
              <View style={styles.itemLeft}>
                <Ionicons
                  name="share-outline"
                  size={24}
                  color={busy ? colors.textMuted : colors.primary}
                />
                <View style={styles.itemText}>
                  <Text
                    style={[
                      styles.itemLabel,
                      { color: busy ? colors.textMuted : colors.textPrimary },
                    ]}
                  >
                    Export to CSV
                  </Text>
                  <Text style={[styles.itemDescription, { color: colors.textMuted }]}>
                    Download your workout data
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.item, { borderBottomColor: colors.border }]}
              onPress={() => openExportModal('json')}
              disabled={busy}
            >
              <View style={styles.itemLeft}>
                <Ionicons
                  name="code-slash-outline"
                  size={24}
                  color={busy ? colors.textMuted : colors.primary}
                />
                <View style={styles.itemText}>
                  <Text
                    style={[
                      styles.itemLabel,
                      { color: busy ? colors.textMuted : colors.textPrimary },
                    ]}
                  >
                    Export to JSON
                  </Text>
                  <Text style={[styles.itemDescription, { color: colors.textMuted }]}>
                    Pro & Elite · Full history
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.item}
              onPress={() => openExportModal('pdf')}
              disabled={busy}
            >
              <View style={styles.itemLeft}>
                <Ionicons
                  name="document-outline"
                  size={24}
                  color={busy ? colors.textMuted : colors.primary}
                />
                <View style={styles.itemText}>
                  <Text
                    style={[
                      styles.itemLabel,
                      { color: busy ? colors.textMuted : colors.textPrimary },
                    ]}
                  >
                    Export to PDF
                  </Text>
                  <Text style={[styles.itemDescription, { color: colors.textMuted }]}>
                    Elite · Workout report
                  </Text>
                </View>
              </View>
              <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                <Text style={[styles.badgeText, { color: colors.background }]}>ELITE</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {preview && (
        <ImportPreviewModal
          visible={showPreview}
          preview={preview}
          onClose={handleClosePreview}
          onConfirm={handleConfirmImport}
        />
      )}

      <ExportOptionsModal
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExportConfirm}
        tier={exportTier}
        canExportCsv={exportCanCsv}
        canExportJson={exportCanJson}
        canExportPdf={exportCanPdf}
        csvLimitReason={exportCsvLimitReason}
        exporting={exporting}
        initialFormat={exportInitialFormat}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemText: {
    marginLeft: 12,
    flex: 1,
  },
  itemLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  templateRow: {
    padding: 14,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  templateText: {
    fontSize: 14,
    fontWeight: '500',
  },
  itemDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  bannerSuccess: {},
  bannerError: {},
  bannerText: {
    flex: 1,
    fontSize: 14,
  },
  bannerDismiss: {
    padding: 4,
  },
  bottomSpacer: {
    height: 40,
  },
});
