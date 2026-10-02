import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { HIT_SLOP, MIN_TOUCH_SIZE, SPACING, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import type { CatalogEpisode } from '@/features/catalog/model';
import { useTheme } from '@/features/theme/theme-provider';

function formatAirDate(date?: string) {
  return date ? date.replaceAll('-', '.') : '放送时间待定';
}

export function EpisodeDetailsCard({
  episode, episodeNumber, subjectTitle, isTrack, tracksWatchProgress,
  isWatched, isSaving, previousEpisode, nextEpisode, openEpisode, onToggleProgress,
}: {
  episode?: CatalogEpisode;
  episodeNumber: number;
  subjectTitle: string;
  isTrack: boolean;
  tracksWatchProgress: boolean;
  isWatched: boolean;
  isSaving: boolean;
  previousEpisode?: CatalogEpisode;
  nextEpisode?: CatalogEpisode;
  openEpisode: (number: number) => void;
  onToggleProgress: () => void;
}) {
  const colors = useTheme();
  const styles = createStyles(colors);
  const episodeUnit = isTrack ? '曲' : '集';
  const airDate = episode?.airDate;
  return (
    <View style={styles.episodeCard}>
      <Text style={styles.subjectTitle}>{subjectTitle}</Text>
      <Text style={styles.episodeTitle}>
        第 {episodeNumber} {isTrack ? '曲' : '集'}
      </Text>
      {episode?.title ? (
        <Text style={styles.catalogEpisodeTitle}>
          {episode.title}
        </Text>
      ) : null}
      <View style={styles.metaLine}>
        {tracksWatchProgress ? (
          <Pressable
            accessibilityLabel={
              isWatched ? '将本集设为未看' : '将本集标记已看'
            }
            accessibilityRole="button"
            hitSlop={HIT_SLOP}
            disabled={isSaving}
            onPress={onToggleProgress}
            style={({ pressed }) => [
              styles.statusBadge,
              isWatched && styles.watchedStatusBadge,
              pressed && styles.pressedStatusBadge,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                isWatched && styles.watchedStatusText,
              ]}
            >
              {isWatched ? '已看' : '未看'}
            </Text>
          </Pressable>
        ) : null}
        <Text style={styles.airDate}>
          {isTrack
            ? episode?.duration || '时长待定'
            : `${formatAirDate(airDate)} 放送`}
        </Text>
      </View>
      <Text style={styles.description}>
        {episode?.description ||
          `本${isTrack ? '曲' : '集'}简介暂时缺失，稍后可以重试 Bangumi 数据。`}
      </Text>
      {previousEpisode || nextEpisode ? (
        <View style={styles.episodeNavRow}>
          {previousEpisode ? (
            <Pressable
              accessibilityLabel={`跳转到上一${episodeUnit}：第 ${previousEpisode.number} ${episodeUnit}`}
              accessibilityRole="button"
              hitSlop={SPACING.xs}
              onPress={() => openEpisode(previousEpisode.number)}
              style={({ pressed }) => [
                styles.episodeNavButton,
                pressed && styles.pressed,
              ]}
            >
              <SymbolView
                name={{
                  android: 'chevron_left',
                  ios: 'chevron.left',
                  web: 'chevron_left',
                }}
                size={15}
                tintColor={colors.accent}
                weight="semibold"
              />
              <Text
                maxFontSizeMultiplier={1.3}
                numberOfLines={1}
                style={styles.episodeNavText}
              >{`上一${episodeUnit}`}</Text>
            </Pressable>
          ) : (
            <View style={styles.episodeNavSpacer} />
          )}
          {nextEpisode ? (
            <Pressable
              accessibilityLabel={`跳转到下一${episodeUnit}：第 ${nextEpisode.number} ${episodeUnit}`}
              accessibilityRole="button"
              hitSlop={SPACING.xs}
              onPress={() => openEpisode(nextEpisode.number)}
              style={({ pressed }) => [
                styles.episodeNavButton,
                pressed && styles.pressed,
              ]}
            >
              <Text
                maxFontSizeMultiplier={1.3}
                numberOfLines={1}
                style={styles.episodeNavText}
              >{`下一${episodeUnit}`}</Text>
              <SymbolView
                name={{
                  android: 'chevron_right',
                  ios: 'chevron.right',
                  web: 'chevron_right',
                }}
                size={15}
                tintColor={colors.accent}
                weight="semibold"
              />
            </Pressable>
          ) : (
            <View style={styles.episodeNavSpacer} />
          )}
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  episodeCard: {
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: SPACING.xl,
  },
  subjectTitle: { color: colors.accent, ...TYPE.caption, fontWeight: '700' },
  episodeTitle: {
    color: colors.ink,
    ...TYPE.display,
    fontWeight: '800',
    marginTop: SPACING.sm,
  },
  catalogEpisodeTitle: {
    color: colors.ink,
    ...TYPE.heading,
    fontWeight: '700',
    marginTop: SPACING.sm,
  },
  metaLine: { alignItems: 'center', flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.lg },
  statusBadge: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  watchedStatusBadge: { backgroundColor: colors.accent },
  pressedStatusBadge: { opacity: 0.65 },
  statusText: { color: colors.muted, ...TYPE.caption, fontWeight: '700' },
  watchedStatusText: { color: colors.surface },
  airDate: { color: colors.subtle, ...TYPE.caption },
  description: { color: colors.muted, ...TYPE.body, marginTop: SPACING.lg },
  episodeNavRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg + SPACING.xs,
  },
  episodeNavButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    flexDirection: 'row',
    flex: 1,
    gap: SPACING.xs,
    justifyContent: 'center',
    minHeight: MIN_TOUCH_SIZE,
    paddingHorizontal: SPACING.lg,
  },
  episodeNavText: {
    color: colors.accent,
    flexShrink: 1,
    ...TYPE.body,
    fontWeight: '700',
  },
  episodeNavSpacer: { flex: 1 },
  pressed: { opacity: 0.62 },
});
