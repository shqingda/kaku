import { useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MIN_TOUCH_SIZE, SPACING, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import {
  currentCalendarWeekdayId,
  type DiscoverSubject,
} from '@/features/discover/model';
import { usePrefetchSubject } from '@/features/catalog/use-catalog-subject';
import { useBangumiCalendar } from '@/features/discover/use-discover';
import { AppRefreshControl } from '@/features/shared/app-refresh-control';
import { CachedDataNotice } from '@/features/shared/cached-data-notice';
import { useTheme } from '@/features/theme/theme-provider';

const COVER_WIDTH = 66;

export default function CalendarScreen() {
  const colors = useTheme();
  const styles = createStyles(colors);
  const [selectedDay, setSelectedDay] = useState(currentCalendarWeekdayId);
  const calendarQuery = useBangumiCalendar();
  const selectedCalendarDay = useMemo(
    () =>
      calendarQuery.data?.find((day) => day.id === selectedDay) ??
      calendarQuery.data?.[0],
    [calendarQuery.data, selectedDay],
  );

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen options={{ title: '每日放送' }} />
      <FlatList
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        data={selectedCalendarDay?.subjects ?? []}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          calendarQuery.fetchStatus === 'paused' ? (
            <CalendarState
              action={() => void calendarQuery.refetch()}
              text="当前离线，恢复连接后可继续读取放送安排。"
            />
          ) : calendarQuery.isPending ? (
            <CalendarState loading text="正在读取本周放送安排。" />
          ) : calendarQuery.isError ? (
            <CalendarState
              action={() => void calendarQuery.refetch()}
              text="Bangumi 暂时没有响应，请稍后重试。"
            />
          ) : (
            <CalendarState text="这一天暂时没有放送条目。" />
          )
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.hero}>
              <Text style={styles.title}>每日放送</Text>
              <Text style={styles.subtitle}>按星期查看本周动画放送安排</Text>
            </View>
            <ScrollView
              contentContainerStyle={styles.dayTabs}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {(calendarQuery.data ?? []).map((day) => {
                const isSelected = day.id === selectedCalendarDay?.id;

                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    key={day.id}
                    onPress={() => setSelectedDay(day.id)}
                    style={({ pressed }) => [
                      styles.dayTab,
                      isSelected && styles.dayTabSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayTabText,
                        isSelected && styles.dayTabTextSelected,
                      ]}
                    >
                      {day.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            {calendarQuery.data && (calendarQuery.isError || calendarQuery.fetchStatus === 'paused') ? (
              <CachedDataNotice onRetry={() => void calendarQuery.refetch()} retrying={calendarQuery.isRefetching} />
            ) : null}
            <View style={styles.listHeading}>
              <Text style={styles.listTitle}>
                {selectedCalendarDay?.label ?? '本周'}放送
              </Text>
              <Text style={styles.countText}>
                {selectedCalendarDay?.subjects.length ?? 0} 部
              </Text>
            </View>
          </View>
        }
        renderItem={({ index, item }) => (
          <CalendarRow
            hasDivider={index > 0}
            isFirst={index === 0}
            isLast={index === (selectedCalendarDay?.subjects.length ?? 0) - 1}
            item={item}
          />
        )}
        refreshControl={
          <AppRefreshControl
            onRefresh={() => void calendarQuery.refetch()}
            refreshing={calendarQuery.isRefetching && !calendarQuery.isPending}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

function CalendarRow({
  hasDivider,
  isFirst,
  isLast,
  item,
}: {
  hasDivider: boolean;
  isFirst: boolean;
  isLast: boolean;
  item: DiscoverSubject;
}) {
  const colors = useTheme();
  const styles = createStyles(colors);
  const prefetchSubject = usePrefetchSubject();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() =>
        router.push({
          pathname: '/subject/[id]',
          params: { id: String(item.id) },
        })
      }
      onPressIn={() => prefetchSubject.prefetch(item.id)}
      onPressOut={prefetchSubject.cancel}
      style={({ pressed }) => [
        styles.row,
        isFirst && styles.firstRow,
        isLast && styles.lastRow,
        pressed && styles.rowPressed,
      ]}
    >
      {hasDivider ? <View style={styles.rowDivider} /> : null}
      <View style={styles.cover}>
        <Text style={styles.coverFallback}>{item.title.slice(0, 1)}</Text>
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
      <View style={styles.rowCopy}>
        <Text maxFontSizeMultiplier={1.3} numberOfLines={2} style={styles.rowTitle}>
          {item.title}
        </Text>
        <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={styles.rowMeta}>
          {item.score ? `${item.score.toFixed(1)} 分` : '暂无评分'}
          {item.date ? ` · ${item.date}` : ''}
        </Text>
      </View>
      <SymbolView
        name={{ android: 'chevron_right', ios: 'chevron.right', web: 'chevron_right' }}
        size={13}
        tintColor={colors.subtle}
        weight="semibold"
      />
    </Pressable>
  );
}

function CalendarState({
  action,
  loading = false,
  text,
}: {
  action?: () => void;
  loading?: boolean;
  text: string;
}) {
  const colors = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.state}>
      {loading ? <ActivityIndicator color={colors.accent} /> : null}
      <Text style={styles.stateText}>{text}</Text>
      {action ? (
        <Pressable
          accessibilityRole="button"
          onPress={action}
          style={({ pressed }) => [
            styles.retryButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.retryText}>重试</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  content: {
    paddingBottom: SPACING.xl * 2,
    paddingHorizontal: SPACING.xl,
  },
  header: { paddingBottom: SPACING.lg },
  hero: { paddingHorizontal: SPACING.xs, paddingTop: SPACING.xl },
  title: {
    color: colors.ink,
    ...TYPE.display,
    fontWeight: '800',
  },
  subtitle: { color: colors.muted, ...TYPE.body, marginTop: SPACING.sm },
  dayTabs: { gap: SPACING.sm, paddingRight: SPACING.xl, paddingTop: SPACING.xl },
  dayTab: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: SPACING.lg,
    justifyContent: 'center',
    minHeight: MIN_TOUCH_SIZE,
  },
  dayTabSelected: { backgroundColor: colors.ink },
  dayTabText: { color: colors.muted, ...TYPE.caption, fontWeight: '700' },
  dayTabTextSelected: { color: colors.surface },
  listHeading: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    paddingBottom: SPACING.md,
    paddingTop: SPACING.xxl,
  },
  listTitle: {
    color: colors.ink,
    ...TYPE.titleLarge,
    fontWeight: '800',
  },
  countText: {
    color: colors.subtle,
    ...TYPE.caption,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  row: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    flexDirection: 'row',
    minHeight: 112,
    padding: SPACING.md,
  },
  firstRow: {
    borderCurve: 'continuous',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  lastRow: {
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    borderCurve: 'continuous',
  },
  rowDivider: {
    backgroundColor: colors.divider,
    height: StyleSheet.hairlineWidth,
    left: COVER_WIDTH + SPACING.md * 2,
    position: 'absolute',
    right: SPACING.md,
    top: SPACING.none,
  },
  rowPressed: { opacity: 0.62 },
  cover: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderCurve: 'continuous',
    borderRadius: 14,
    height: 88,
    justifyContent: 'center',
    overflow: 'hidden',
    width: COVER_WIDTH,
  },
  coverFallback: { color: colors.subtle, ...TYPE.heading, fontWeight: '700' },
  rowCopy: { flex: 1, paddingHorizontal: SPACING.md },
  rowTitle: {
    color: colors.ink,
    ...TYPE.heading,
    fontWeight: '700',
  },
  rowMeta: {
    color: colors.muted,
    ...TYPE.caption,
    fontVariant: ['tabular-nums'],
    marginTop: SPACING.sm,
  },
  state: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderCurve: 'continuous',
    borderRadius: 22,
    gap: SPACING.md,
    padding: SPACING.xxl,
  },
  stateText: {
    color: colors.muted,
    ...TYPE.caption,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.accentSoft,
    borderRadius: 13,
    justifyContent: 'center',
    minHeight: MIN_TOUCH_SIZE,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  retryText: { color: colors.accent, ...TYPE.caption, fontWeight: '800' },
  pressed: { opacity: 0.62 },
});
