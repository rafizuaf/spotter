import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import type { UserRanking } from '../services/rankings';

export interface ProfileRankingsProps {
  rankings: UserRanking[];
  prominentLeaderboardCode?: string | null;
}

function formatScore(score: number): string {
  if (score >= 1_000_000) return `${(score / 1_000_000).toFixed(1)}M`;
  if (score >= 1_000) return `${(score / 1_000).toFixed(1)}K`;
  return score.toLocaleString();
}

function getRankSuffix(rank: number): string {
  if (rank >= 11 && rank <= 13) return 'th';
  const lastDigit = rank % 10;
  switch (lastDigit) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

export default function ProfileRankings({
  rankings,
  prominentLeaderboardCode,
}: ProfileRankingsProps) {
  const colors = useTheme();
  const [expanded, setExpanded] = useState(false);

  if (rankings.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.surface }]}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No rankings yet
        </Text>
        <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
          Complete workouts to appear on leaderboards
        </Text>
      </View>
    );
  }

  const prominent =
    prominentLeaderboardCode != null
      ? rankings.find((r) => r.leaderboardCode === prominentLeaderboardCode)
      : null;
  const bestRank = prominent ?? rankings[0];
  const others = rankings.filter((r) => r.leaderboardCode !== bestRank.leaderboardCode);

  const renderCard = (r: UserRanking, large: boolean) => (
    <View
      key={r.leaderboardCode}
      style={[
        styles.card,
        { backgroundColor: colors.surface },
        large && styles.cardProminent,
      ]}
      accessibilityLabel={`Rank ${r.rank} on ${r.leaderboardTitle}. Top ${r.totalParticipants > 0 ? r.percentile.toFixed(1) : '—'}%. Score ${formatScore(r.score)}`}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.rank, { color: colors.primary }, large && styles.rankProminent]}>
          #{r.rank}{getRankSuffix(r.rank)}
        </Text>
        <Text style={[styles.title, { color: colors.textPrimary }, large && styles.titleProminent]}>
          {r.leaderboardTitle}
        </Text>
      </View>
      <View style={styles.cardMeta}>
        <Text style={[styles.metaText, { color: colors.textSecondary }]}>
          {r.totalParticipants > 0
            ? `Top ${r.percentile.toFixed(1)}%`
            : '—'}
          {' · '}
          {r.totalParticipants > 0 ? `${r.totalParticipants} participants` : '—'}
        </Text>
      </View>
      <Text style={[styles.score, { color: colors.primary }]}>
        {formatScore(r.score)} {r.leaderboardTitle.includes('Volume') ? 'kg' : r.leaderboardTitle.includes('XP') ? 'XP' : ''}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderCard(bestRank, true)}

      {others.length > 0 && (
        <>
          <TouchableOpacity
            onPress={() => setExpanded((e) => !e)}
            style={[styles.expandButton, { backgroundColor: colors.surface }]}
            accessible
            accessibilityLabel={expanded ? 'Collapse other rankings' : 'Show other rankings'}
            accessibilityRole="button"
          >
            <Text style={[styles.expandText, { color: colors.primary }]}>
              {expanded ? 'Hide other rankings' : `Show ${others.length} other ranking${others.length === 1 ? '' : 's'}`}
            </Text>
          </TouchableOpacity>
          {expanded && others.map((r) => renderCard(r, false))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 4,
  },
  empty: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardProminent: {
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 4,
  },
  rank: {
    fontSize: 18,
    fontWeight: '700',
  },
  rankProminent: {
    fontSize: 22,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  titleProminent: {
    fontSize: 18,
  },
  cardMeta: {
    marginBottom: 4,
  },
  metaText: {
    fontSize: 13,
  },
  score: {
    fontSize: 15,
    fontWeight: '600',
  },
  expandButton: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  expandText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
