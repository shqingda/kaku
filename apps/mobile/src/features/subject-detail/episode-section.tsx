import { useState } from 'react';
import { SymbolView } from 'expo-symbols';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { COLORS } from '@/constants/design';
import type { CatalogEpisode } from '@/features/catalog/model';

import {
  createEpisodeRanges,
  getInitialEpisodeRangeIndex,
} from './episode-ranges';

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
  const [rangeIndex, setRangeIndex] = useState(() =>
    getInitialEpisodeRangeIndex(totalEpisodes, watchedEpisodeNumbers),
  );
  const episodesByNumber = new Map(
    episodes.map((episode) => [episode.number, episode]),
  );
  const ranges = createEpisodeRanges(totalEpisodes);
  const selectedRange = ranges[rangeIndex];
  const rangeStart = selectedRange?.start ?? 1;
  const rangeEnd = selectedRange?.end ?? 0;
  const visibleEpisodeNumbers = Array.from(
    { length: Math.max(0, rangeEnd - rangeStart + 1) },
    (_, index) => rangeStart + index,
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
      {ranges.length > 1 ? (
        <ScrollView
          contentContainerStyle={styles.ranges}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {ranges.map(({ end, start }, index) => {
            const isSelected = index === rangeIndex;

            return (
              <Pressable
                accessibilityLabel={`显示第 ${start} 到 ${end} 集`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                key={start}
                onPress={() => setRangeIndex(index)}
                style={({ pressed }) => [
                  styles.range,
                  isSelected && styles.selectedRange,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.rangeText,
                    isSelected && styles.selectedRangeText,
                  ]}
                >
                  {start}–{end}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
      <Text style={styles.sectionHint}>
        {ranges.length > 1
          ? `当前显示 ${rangeStart}–${rangeEnd} 集，点击章节进入本集`
          : '点击章节进入本集'}
      </Text>

      {layout === 'grid' ? (
        <View style={styles.episodeGrid}>
          {visibleEpisodeNumbers.map((episodeNumber) => {
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
          {visibleEpisodeNumbers.map((episodeNumber, index) => {
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
  sectionHint: { color: COLORS.subtle, fontSize: 12, marginTop: 9 },
  ranges: { gap: 7, paddingTop: 14 },
  range: {
    backgroundColor: '#F1F0EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  selectedRange: { backgroundColor: COLORS.accentSoft },
  rangeText: {
    color: COLORS.muted,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  selectedRangeText: { color: COLORS.accent },
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
