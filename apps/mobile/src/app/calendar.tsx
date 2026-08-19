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

import type { ThemeColors } from '@/constants/theme';
import type { DiscoverSubject } from '@/features/discover/model';
import { useBangumiCalendar } from '@/features/discover/use-discover';
import { AppRefreshControl } from '@/features/shared/app-refresh-control';
import { CachedDataNotice } from '@/features/shared/cached-data-notice';
import { useTheme } from '@/features/theme/theme-provider';

function currentWeekdayId() {
  const day = new Date().getDay();
  return day === 0 ? 7 : day;
}

export default function CalendarScreen() {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [selectedDay, setSelectedDay] = useState(currentWeekdayId);
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
          calendarQuery.isPending ? (
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
            {calendarQuery.data && calendarQuery.isError ? (
              <CachedDataNotice onRetry={() => void calendarQuery.refetch()} />
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
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() =>
        router.push({
          pathname: '/subject/[id]',
          params: { id: String(item.id) },
        })
      }
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
        <Text numberOfLines={2} style={styles.rowTitle}>
          {item.title}
        </Text>
        <Text numberOfLines={1} style={styles.rowMeta}>
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
  const styles = useMemo(() => createStyles(colors), [colors]);

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
    paddingBottom: 48,
    paddingHorizontal: 20,
  },
  header: { paddingBottom: 16 },
  hero: { paddingHorizontal: 4, paddingTop: 24 },
  title: {
    color: colors.ink,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1,
  },
  subtitle: { color: colors.muted, fontSize: 14, marginTop: 8 },
  dayTabs: { gap: 8, paddingRight: 20, paddingTop: 22 },
  dayTab: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 17,
    justifyContent: 'center',
    minHeight: 36,
  },
  dayTabSelected: { backgroundColor: colors.ink },
  dayTabText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  dayTabTextSelected: { color: colors.surface },
  listHeading: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
    paddingBottom: 12,
    paddingTop: 30,
  },
  listTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  countText: {
    color: colors.subtle,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  row: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    flexDirection: 'row',
    minHeight: 112,
    padding: 12,
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
    left: 94,
    position: 'absolute',
    right: 14,
    top: 0,
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
    width: 66,
  },
  coverFallback: { color: colors.subtle, fontSize: 18, fontWeight: '700' },
  rowCopy: { flex: 1, paddingHorizontal: 14 },
  rowTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  rowMeta: {
    color: colors.muted,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    marginTop: 8,
  },
  state: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderCurve: 'continuous',
    borderRadius: 22,
    gap: 10,
    padding: 30,
  },
  stateText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.accentSoft,
    borderRadius: 13,
    paddingHorizontal: 17,
    paddingVertical: 9,
  },
  retryText: { color: colors.accent, fontSize: 13, fontWeight: '800' },
  pressed: { opacity: 0.62 },
});
