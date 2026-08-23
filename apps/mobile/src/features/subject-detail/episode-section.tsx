import { useMemo, useState } from 'react';
import { SymbolView } from 'expo-symbols';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { HIT_SLOP } from '@/constants/design';
import { useTheme } from '@/features/theme/theme-provider';
import type { CatalogEpisode } from '@/features/catalog/model';

import {
  createEpisodeRanges,
  getInitialEpisodeRangeIndex,
} from './episode-ranges';
import {
  isEpisodeAired,
  todayDateString,
} from './episode-airing';

type EpisodeLayout = 'grid' | 'list';

function formatAirDate(date?: string) {
  return date ? date.replaceAll('-', '.') : '时间待定';
}

export function EpisodeSection({
  episodes,
  fallbackAirDates,
  kind,
  onOpenEpisode,
  totalEpisodes,
  tracksWatchProgress,
  watchedEpisodeNumbers,
}: {
  episodes: CatalogEpisode[];
  fallbackAirDates: string[];
  kind?: 'episode' | 'track';
  onOpenEpisode: (episodeNumber: number) => void;
  totalEpisodes: number;
  tracksWatchProgress?: boolean;
  watchedEpisodeNumbers: number[];
}) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isTrack = kind === 'track';
  const todayDate = todayDateString();
  const [layout, setLayout] = useState<EpisodeLayout>(
    isTrack ? 'list' : 'grid',
  );
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
        <Text style={styles.panelTitle}>{isTrack ? '曲目' : '章节'}</Text>
        {!isTrack ? (
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
                  hitSlop={HIT_SLOP}
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
                    tintColor={isActive ? colors.ink : colors.subtle}
                    weight="semibold"
                  />
                </Pressable>
              );
            })}
          </View>
        ) : null}
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
                accessibilityLabel={`显示第 ${start} 到 ${end} ${
                  isTrack ? '曲' : '集'
                }`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                hitSlop={HIT_SLOP}
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
          ? `当前显示 ${rangeStart}–${rangeEnd} ${
              isTrack ? '曲' : '集'
            }，点击进入详情`
          : `点击${isTrack ? '曲目' : '章节'}进入详情`}
      </Text>

      {layout === 'grid' ? (
        <View style={styles.episodeGrid}>
          {visibleEpisodeNumbers.map((episodeNumber) => {
            const isWatched =
              tracksWatchProgress &&
              watchedEpisodeNumbers.includes(episodeNumber);
            const airDate =
              episodesByNumber.get(episodeNumber)?.airDate ??
              fallbackAirDates[episodeNumber - 1];
            const isAired = !isWatched && isEpisodeAired(airDate, todayDate);

            return (
              <Pressable
                accessibilityLabel={`第 ${episodeNumber} ${
                  isTrack ? '曲' : '集'
                }${
                  tracksWatchProgress
                    ? `，${isWatched ? '已看' : '未看'}`
                    : ''
                }，点击进入详情`}
                accessibilityRole="button"
                key={episodeNumber}
                onPress={() => onOpenEpisode(episodeNumber)}
                style={({ pressed }) => [
                  styles.episodeCell,
                  isWatched && styles.watchedEpisodeCell,
                  isAired && styles.airedEpisodeCell,
                  pressed && styles.pressedEpisodeCell,
                ]}
              >
                <Text
                  style={[
                    styles.episodeNumber,
                    isWatched && styles.watchedEpisodeNumber,
                    isAired && styles.airedEpisodeNumber,
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
            const isWatched =
              tracksWatchProgress &&
              watchedEpisodeNumbers.includes(episodeNumber);
            const episode = episodesByNumber.get(episodeNumber);
            const airDate =
              episode?.airDate ?? fallbackAirDates[episodeNumber - 1];
            const isAired = !isWatched && isEpisodeAired(airDate, todayDate);

            return (
              <Pressable
                accessibilityLabel={`第 ${episodeNumber} ${
                  isTrack ? '曲' : '集'
                }，点击进入详情`}
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
                    isAired && styles.airedEpisodeCell,
                  ]}
                >
                  <Text
                    style={[
                      styles.episodeNumber,
                      isWatched && styles.watchedEpisodeNumber,
                      isAired && styles.airedEpisodeNumber,
                    ]}
                  >
                    {episodeNumber}
                  </Text>
                </View>
                <View style={styles.episodeRowMain}>
                  <Text numberOfLines={1} style={styles.episodeRowTitle}>
                    第 {episodeNumber} {isTrack ? '曲' : '集'}
                    {episode?.title ? ` · ${episode.title}` : ''}
                  </Text>
                  <Text style={styles.episodeAirDate}>
                    {isTrack
                      ? episode?.duration || '时长待定'
                      : `${formatAirDate(
                          airDate,
                        )} 放送${episode?.duration ? ` · ${episode.duration}` : ''}`}
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

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    marginBottom: 14,
    padding: 18,
  },
  panelTitle: { color: colors.ink, fontSize: 18, fontWeight: '700' },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionHint: { color: colors.subtle, fontSize: 12, marginTop: 9 },
  ranges: { gap: 7, paddingTop: 14 },
  range: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  selectedRange: { backgroundColor: colors.accentSoft },
  rangeText: {
    color: colors.muted,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  selectedRangeText: { color: colors.accent },
  layoutActions: {
    backgroundColor: colors.surfaceAlt,
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
  activeLayoutButton: { backgroundColor: colors.surface },
  episodeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 18 },
  episodeCell: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderColor: 'transparent',
    borderRadius: 12,
    borderWidth: 2,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  watchedEpisodeCell: { backgroundColor: colors.accent },
  airedEpisodeCell: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
    borderWidth: 1,
  },
  pressedEpisodeCell: { opacity: 0.72, transform: [{ scale: 0.9 }] },
  episodeNumber: { color: colors.muted, fontSize: 14, fontWeight: '700' },
  watchedEpisodeNumber: { color: colors.surface },
  airedEpisodeNumber: { color: colors.accentRich },
  episodeList: { marginTop: 10 },
  episodeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 64,
    paddingVertical: 13,
  },
  episodeRowBorder: {
    borderTopColor: colors.divider,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  episodeStatus: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderColor: 'transparent',
    borderRadius: 11,
    borderWidth: 2,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  episodeRowMain: { flex: 1, marginLeft: 12 },
  episodeRowTitle: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  episodeAirDate: { color: colors.subtle, fontSize: 11, marginTop: 4 },
  replyCount: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 13,
    justifyContent: 'center',
    minHeight: 26,
    minWidth: 32,
    paddingHorizontal: 8,
  },
  replyCountText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  pressed: { opacity: 0.62 },
});
