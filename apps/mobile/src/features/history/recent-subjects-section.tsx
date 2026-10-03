import { HIT_SLOP, MIN_TOUCH_SIZE, SPACING, TYPE } from '@/constants/design';
import { HistoryLocalNotice, type HistoryLocalFeedback } from '@/features/history/history-local-notice';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { getSubjectTypeLabel } from '@/features/catalog/subject-types';
import { usePrefetchSubject } from '@/features/catalog/use-catalog-subject';
import { useTheme } from '@/features/theme/theme-provider';

import type { RecentSubject } from './recent-subjects-model';

export function RecentSubjectsSection({
  items,
  history,
  onClear,
}: {
  items: RecentSubject[];
  history: HistoryLocalFeedback;
  onClear: () => void;
}) {
  const colors = useTheme();
  const styles = createStyles(colors);

  if (!items.length && history.localStatus === 'ready') return null;
  const clearDisabled = history.isClearing || history.localStatus === 'loading' || history.localStatus === 'read-error';

  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <Text style={styles.title}>最近浏览</Text>
        <Pressable
          accessibilityLabel="清除最近浏览"
          accessibilityRole="button"
          hitSlop={HIT_SLOP}
          disabled={clearDisabled}
          accessibilityState={{ disabled: clearDisabled, busy: history.isClearing }}
          onPress={onClear}
          style={({ pressed }) => [styles.clearButton, pressed && styles.pressed, clearDisabled && styles.disabled]}
        >
          <Text style={styles.clear}>{history.isClearing ? '正在清除…' : '清除'}</Text>
        </Pressable>
      </View>
      <HistoryLocalNotice label="浏览历史" history={history} />
      <ScrollView
        contentContainerStyle={styles.list}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {items.map((item) => (
          <RecentSubjectCard item={item} key={item.id} styles={styles} />
        ))}
      </ScrollView>
    </View>
  );
}

function RecentSubjectCard({
  item,
  styles,
}: {
  item: RecentSubject;
  styles: ReturnType<typeof createStyles>;
}) {
  const prefetchSubject = usePrefetchSubject();

  return (
    <View style={styles.card}>
      <Link
        asChild
        href={{
          pathname: '/subject/[id]',
          params: { id: String(item.id) },
        }}
      >
        <Pressable
          accessibilityLabel={`再次打开${item.title}`}
          accessibilityRole="button"
          onPressIn={() => prefetchSubject.prefetch(item.id)}
          onPressOut={prefetchSubject.cancel}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Link.AppleZoom>
            <View style={styles.cover}>
              <Text style={styles.coverFallback}>
                {item.title.slice(0, 1)}
              </Text>
              {item.coverUrl ? (
                <Image
                  contentFit="cover"
                  recyclingKey={item.coverUrl}
                  source={item.coverUrl}
                  style={StyleSheet.absoluteFill}
                  transition={120}
                />
              ) : null}
            </View>
          </Link.AppleZoom>
          <Text
            ellipsizeMode="tail"
            numberOfLines={2}
            style={styles.cardTitle}
          >
            {item.title}
          </Text>
          <Text style={styles.cardMeta}>
            {getSubjectTypeLabel(item.type)}
          </Text>
        </Pressable>
      </Link>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  section: { paddingTop: SPACING.xl },
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
    minHeight: MIN_TOUCH_SIZE,
    paddingHorizontal: SPACING.xs,
  },
  title: { flexShrink: 1, color: colors.ink, ...TYPE.heading, fontWeight: '800' },
  clear: { color: colors.muted, ...TYPE.caption, fontWeight: '600' },
  list: { gap: SPACING.md, paddingRight: SPACING.xl, paddingTop: SPACING.md },
  card: { width: 96 },
  cover: {
    alignItems: 'center',
    backgroundColor: colors.track,
    borderCurve: 'continuous',
    borderRadius: 14,
    height: 134,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 96,
  },
  coverFallback: { color: colors.subtle, ...TYPE.body, fontWeight: '700' },
  cardTitle: {
    color: colors.ink,
    ...TYPE.caption,
    fontWeight: '700',
    minHeight: TYPE.caption.lineHeight * 2,
    marginTop: SPACING.sm,
  },
  cardMeta: { color: colors.subtle, ...TYPE.micro, marginTop: SPACING.xs },
  clearButton: { minHeight: MIN_TOUCH_SIZE, minWidth: MIN_TOUCH_SIZE, justifyContent: 'center', alignItems: 'center' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.62 },
});
