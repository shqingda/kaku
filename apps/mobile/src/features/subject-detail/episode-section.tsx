import { useState } from 'react';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/design';
import type { CatalogEpisode } from '@/features/catalog/model';

type EpisodeLayout = 'grid' | 'list';

function formatAirDate(date?: string) {
  return date ? date.replaceAll('-', '.') : '时间待定';
}

export function EpisodeSection({
  episodes,
  fallbackAirDates,
  onOpenEpisode,
  totalEpisodes,
  watchedEpisodeNumbers,
}: {
  episodes: CatalogEpisode[];
  fallbackAirDates: string[];
  onOpenEpisode: (episodeNumber: number) => void;
  totalEpisodes: number;
  watchedEpisodeNumbers: number[];
}) {
  const [layout, setLayout] = useState<EpisodeLayout>('grid');
  const episodesByNumber = new Map(
    episodes.map((episode) => [episode.number, episode]),
  );

  return (
    <View style={styles.panel}>
      <View style={styles.sectionHeader}>
        <Text style={styles.panelTitle}>章节</Text>
        <View style={styles.layoutActions}>
          {(['grid', 'list'] as const).map((nextLayout) => {
            const isActive = layout === nextLayout;
            return (
              <Pressable
                accessibilityLabel={
                  nextLayout === 'grid' ? '格子布局' : '列表布局'
                }
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                key={nextLayout}
                onPress={() => setLayout(nextLayout)}
                style={({ pressed }) => [
                  styles.iconButton,
                  isActive && styles.activeLayoutButton,
                  pressed && styles.pressed,
                ]}
              >
                <SymbolView
                  name={
                    nextLayout === 'grid'
                      ? {
                          android: 'grid_view',
                          ios: 'square.grid.2x2',
                          web: 'grid_view',
                        }
                      : {
                          android: 'view_list',
                          ios: 'list.bullet',
                          web: 'view_list',
                        }
                  }
                  size={17}
                  tintColor={isActive ? COLORS.ink : COLORS.subtle}
                  weight="semibold"
                />
              </Pressable>
            );
          })}
        </View>
      </View>
      <Text style={styles.sectionHint}>点击章节进入本集</Text>

      {layout === 'grid' ? (
        <View style={styles.episodeGrid}>
          {Array.from({ length: totalEpisodes }, (_, index) => {
            const episodeNumber = index + 1;
            const isWatched = watchedEpisodeNumbers.includes(episodeNumber);

            return (
              <Pressable
                accessibilityLabel={`第 ${episodeNumber} 集，${
                  isWatched ? '已看' : '未看'
                }，点击进入本集`}
                accessibilityRole="button"
                key={episodeNumber}
                onPress={() => onOpenEpisode(episodeNumber)}
                style={({ pressed }) => [
                  styles.episodeCell,
                  isWatched && styles.watchedEpisodeCell,
                  pressed && styles.pressedEpisodeCell,
                ]}
              >
                <Text
                  style={[
                    styles.episodeNumber,
                    isWatched && styles.watchedEpisodeNumber,
                  ]}
                >
                  {episodeNumber}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={styles.episodeList}>
          {Array.from({ length: totalEpisodes }, (_, index) => {
            const episodeNumber = index + 1;
            const isWatched = watchedEpisodeNumbers.includes(episodeNumber);
            const episode = episodesByNumber.get(episodeNumber);

            return (
              <Pressable
                accessibilityLabel={`第 ${episodeNumber} 集，点击进入本集`}
                accessibilityRole="button"
                key={episodeNumber}
                onPress={() => onOpenEpisode(episodeNumber)}
                style={({ pressed }) => [
                  styles.episodeRow,
                  index > 0 && styles.episodeRowBorder,
                  pressed && styles.pressed,
                ]}
              >
                <View
                  style={[
                    styles.episodeStatus,
                    isWatched && styles.watchedEpisodeCell,
                  ]}
                >
                  <Text
                    style={[
                      styles.episodeNumber,
                      isWatched && styles.watchedEpisodeNumber,
                    ]}
                  >
                    {episodeNumber}
                  </Text>
                </View>
                <View style={styles.episodeRowMain}>
                  <Text numberOfLines={1} style={styles.episodeRowTitle}>
                    第 {episodeNumber} 集
                    {episode?.title ? ` · ${episode.title}` : ''}
                  </Text>
                  <Text style={styles.episodeAirDate}>
                    {formatAirDate(
                      episode?.airDate ?? fallbackAirDates[episodeNumber - 1],
                    )}{' '}
                    放送{episode?.duration ? ` · ${episode.duration}` : ''}
                  </Text>
                </View>
                <View style={styles.replyCount}>
                  <Text style={styles.replyCountText}>
                    {episode?.discussionCount ?? 0}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    marginBottom: 14,
    padding: 18,
  },
  panelTitle: { color: COLORS.ink, fontSize: 18, fontWeight: '700' },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionHint: { color: COLORS.subtle, fontSize: 12, marginTop: 5 },
  layoutActions: {
    backgroundColor: '#EFEEE9',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 2,
    padding: 3,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: 9,
    height: 32,
    justifyContent: 'center',
    width: 36,
  },
  activeLayoutButton: { backgroundColor: COLORS.surface },
  episodeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 18 },
  episodeCell: {
    alignItems: 'center',
    backgroundColor: '#EFEEE9',
    borderColor: 'transparent',
    borderRadius: 12,
    borderWidth: 2,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  watchedEpisodeCell: { backgroundColor: COLORS.accent },
  pressedEpisodeCell: { opacity: 0.72, transform: [{ scale: 0.9 }] },
  episodeNumber: { color: COLORS.muted, fontSize: 14, fontWeight: '700' },
  watchedEpisodeNumber: { color: COLORS.surface },
  episodeList: { marginTop: 10 },
  episodeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 64,
    paddingVertical: 13,
  },
  episodeRowBorder: {
    borderTopColor: COLORS.track,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  episodeStatus: {
    alignItems: 'center',
    backgroundColor: '#EFEEE9',
    borderRadius: 11,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  episodeRowMain: { flex: 1, marginLeft: 12 },
  episodeRowTitle: { color: COLORS.ink, fontSize: 14, fontWeight: '700' },
  episodeAirDate: { color: COLORS.subtle, fontSize: 11, marginTop: 4 },
  replyCount: {
    alignItems: 'center',
    backgroundColor: '#EFEEE9',
    borderRadius: 13,
    justifyContent: 'center',
    minHeight: 26,
    minWidth: 32,
    paddingHorizontal: 8,
  },
  replyCountText: { color: COLORS.muted, fontSize: 12, fontWeight: '700' },
  pressed: { opacity: 0.62 },
});
