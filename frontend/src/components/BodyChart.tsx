import { View, Text, StyleSheet, Dimensions } from 'react-native';
import type UserBodyLog from '../db/models/UserBodyLog';

interface BodyChartProps {
  logs: UserBodyLog[];
  metric: 'weight' | 'bodyFat';
}

const CHART_HEIGHT = 200;
const CHART_PADDING = 40;

export default function BodyChart({ logs, metric }: BodyChartProps) {
  const screenWidth = Dimensions.get('window').width - 32;

  // Get values based on metric
  const getValue = (log: UserBodyLog): number | undefined => {
    if (metric === 'weight') return log.weightKg;
    if (metric === 'bodyFat') return log.bodyFatPct;
    return undefined;
  };

  const getUnit = (): string => {
    if (metric === 'weight') return 'kg';
    if (metric === 'bodyFat') return '%';
    return '';
  };

  const getLabel = (): string => {
    if (metric === 'weight') return 'Weight';
    if (metric === 'bodyFat') return 'Body Fat';
    return '';
  };

  // Filter logs with valid values and sort by date
  const validLogs = logs
    .filter((log) => getValue(log) !== undefined && getValue(log) !== null)
    .sort((a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime());

  if (validLogs.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No {getLabel().toLowerCase()} data yet</Text>
        <Text style={styles.emptySubtext}>Add a body log to see your progress</Text>
      </View>
    );
  }

  // Calculate min/max for scaling
  const values = validLogs.map((log) => getValue(log) as number);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1; // Avoid division by zero

  // Add padding to range
  const paddedMin = minValue - range * 0.1;
  const paddedMax = maxValue + range * 0.1;
  const paddedRange = paddedMax - paddedMin;

  // Calculate point positions
  const chartWidth = screenWidth - CHART_PADDING * 2;
  const points = validLogs.map((log, index) => {
    const x = CHART_PADDING + (index / Math.max(validLogs.length - 1, 1)) * chartWidth;
    const value = getValue(log) as number;
    const y = CHART_HEIGHT - ((value - paddedMin) / paddedRange) * (CHART_HEIGHT - 40);
    return { x, y, value, date: log.loggedAt };
  });

  // Create SVG path
  const pathD = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  // Calculate trend
  const firstValue = values[0];
  const lastValue = values[values.length - 1];
  const change = lastValue - firstValue;
  const changePercent = ((change / firstValue) * 100).toFixed(1);
  const isPositive = change > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{getLabel()}</Text>
        <View style={styles.statsRow}>
          <Text style={styles.currentValue}>
            {lastValue.toFixed(1)} {getUnit()}
          </Text>
          {validLogs.length > 1 && (
            <Text
              style={[
                styles.change,
                isPositive ? styles.changePositive : styles.changeNegative,
              ]}
            >
              {isPositive ? '+' : ''}
              {changePercent}%
            </Text>
          )}
        </View>
      </View>

      <View style={[styles.chartContainer, { width: screenWidth }]}>
        {/* Y-axis labels */}
        <View style={styles.yAxis}>
          <Text style={styles.axisLabel}>{paddedMax.toFixed(1)}</Text>
          <Text style={styles.axisLabel}>{((paddedMax + paddedMin) / 2).toFixed(1)}</Text>
          <Text style={styles.axisLabel}>{paddedMin.toFixed(1)}</Text>
        </View>

        {/* Chart area */}
        <View style={styles.chartArea}>
          {/* Grid lines */}
          <View style={[styles.gridLine, { top: 0 }]} />
          <View style={[styles.gridLine, { top: CHART_HEIGHT / 2 - 20 }]} />
          <View style={[styles.gridLine, { top: CHART_HEIGHT - 40 }]} />

          {/* Line path using View elements */}
          {points.map((point, index) => {
            if (index === 0) return null;
            const prevPoint = points[index - 1];
            const dx = point.x - prevPoint.x;
            const dy = point.y - prevPoint.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);

            return (
              <View
                key={`line-${index}`}
                style={[
                  styles.lineSegment,
                  {
                    width: length,
                    left: prevPoint.x - CHART_PADDING,
                    top: prevPoint.y,
                    transform: [{ rotate: `${angle}deg` }],
                  },
                ]}
              />
            );
          })}

          {/* Data points */}
          {points.map((point, index) => (
            <View
              key={`point-${index}`}
              style={[
                styles.dataPoint,
                {
                  left: point.x - CHART_PADDING - 4,
                  top: point.y - 4,
                },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Date range */}
      <View style={styles.dateRange}>
        <Text style={styles.dateText}>
          {new Date(validLogs[0].loggedAt).toLocaleDateString()}
        </Text>
        {validLogs.length > 1 && (
          <Text style={styles.dateText}>
            {new Date(validLogs[validLogs.length - 1].loggedAt).toLocaleDateString()}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },
  currentValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  change: {
    fontSize: 14,
    fontWeight: '600',
  },
  changePositive: {
    color: '#22c55e',
  },
  changeNegative: {
    color: '#ef4444',
  },
  chartContainer: {
    flexDirection: 'row',
    height: CHART_HEIGHT,
  },
  yAxis: {
    width: CHART_PADDING,
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  axisLabel: {
    fontSize: 10,
    color: '#64748b',
    textAlign: 'right',
    paddingRight: 8,
  },
  chartArea: {
    flex: 1,
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#334155',
  },
  lineSegment: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#6366f1',
    transformOrigin: 'left center',
  },
  dataPoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366f1',
    borderWidth: 2,
    borderColor: '#1e293b',
  },
  dateRange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingLeft: CHART_PADDING,
  },
  dateText: {
    fontSize: 10,
    color: '#64748b',
  },
  emptyContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748b',
  },
});
