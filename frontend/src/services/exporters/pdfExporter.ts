/**
 * Phase 2D: PDF export – Elite only, HTML report via expo-print.
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { ExportData } from './exportData';
import type { ExportOptions } from '../importers/types';
import {
  getTier,
  canExportPdf,
  getExportDateRange,
} from './exportLimits';
import { getExportData } from './exportData';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toLocalDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Generate HTML for workout report. */
function buildReportHtml(
  data: ExportData,
  dateRange: { start: Date; end: Date }
): string {
  const formatDate = toLocalDate;
  const rows: string[] = [];

  rows.push('<h1>Spotter Workout Report</h1>');
  rows.push(
    `<p><strong>Date range:</strong> ${formatDate(dateRange.start)} – ${formatDate(dateRange.end)}</p>`
  );
  rows.push(`<p><strong>Workouts:</strong> ${data.workouts.length}</p>`);
  rows.push('<hr/>');

  for (const { workout, sets } of data.workouts) {
    const name = escapeHtml(workout.name ?? 'Untitled');
    const started = formatDate(workout.startedAt);
    const ended = workout.endedAt ? formatDate(workout.endedAt) : '—';
    rows.push(`<h2>${name}</h2>`);
    rows.push(`<p>${started} – ${ended}</p>`);
    if (workout.note) {
      rows.push(`<p><em>${escapeHtml(workout.note)}</em></p>`);
    }

    rows.push('<table style="width:100%; border-collapse:collapse; margin-bottom:24px;">');
    rows.push(
      '<thead><tr style="background:#eee;">' +
        '<th style="padding:8px;text-align:left;">Exercise</th>' +
        '<th style="padding:8px;">Set</th>' +
        '<th style="padding:8px;">Weight (kg)</th>' +
        '<th style="padding:8px;">Reps</th>' +
        '<th style="padding:8px;">RPE</th>' +
        '</tr></thead><tbody>'
    );

    for (const { set, exerciseName } of sets) {
      const w = set.weightKg ?? '—';
      const r = set.reps ?? '—';
      const rpe = set.rpe ?? '—';
      rows.push(
        '<tr>' +
          `<td style="padding:8px;border-bottom:1px solid #ddd;">${escapeHtml(exerciseName)}</td>` +
          `<td style="padding:8px;border-bottom:1px solid #ddd;">${set.setOrderIndex ?? 0}</td>` +
          `<td style="padding:8px;border-bottom:1px solid #ddd;">${w}</td>` +
          `<td style="padding:8px;border-bottom:1px solid #ddd;">${r}</td>` +
          `<td style="padding:8px;border-bottom:1px solid #ddd;">${rpe}</td>` +
          '</tr>'
      );
    }
    rows.push('</tbody></table>');
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Spotter Workout Report</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 16px; color: #1a1a1a; }
    h1 { font-size: 1.5rem; margin-bottom: 8px; }
    h2 { font-size: 1.15rem; margin-top: 16px; }
    table { font-size: 0.9rem; }
    hr { margin: 16px 0; border: none; border-top: 1px solid #ddd; }
  </style>
</head>
<body>
  ${rows.join('\n')}
</body>
</html>`;
}

export interface SharePdfResult {
  success: boolean;
  error?: string;
}

export async function exportWorkoutsToPdf(
  data: ExportData,
  options: ExportOptions
): Promise<string> {
  const range = options.dateRange ?? { start: new Date(), end: new Date() };
  const html = buildReportHtml(data, range);
  const { uri } = await Print.printToFileAsync({ html });
  return uri;
}

export async function sharePdfExport(
  userId: string,
  options: ExportOptions
): Promise<SharePdfResult> {
  const tier = await getTier(userId);
  const check = canExportPdf(tier);
  if (!check.allowed) {
    return { success: false, error: check.reason };
  }

  const range = options.dateRange ?? getExportDateRange(tier);
  const data = await getExportData(userId, range.start, range.end);

  let uri: string;
  try {
    uri = await exportWorkoutsToPdf(
      data,
      { ...options, dateRange: range }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'PDF generation failed';
    return { success: false, error: msg };
  }

  try {
    const available = await Sharing.isAvailableAsync();
    if (!available) {
      return { success: false, error: 'Sharing is not available on this device.' };
    }
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Export workout report',
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Share failed';
    return { success: false, error: msg };
  }

  return { success: true };
}
