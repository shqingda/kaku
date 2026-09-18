import { useMemo, useState } from 'react';
import { Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HIT_SLOP, MIN_TOUCH_SIZE, SPACING, TYPE } from '@/constants/design';
import { CachedDataNotice } from '@/features/shared/cached-data-notice';
import type { ThemeColors } from '@/constants/theme';
import { AppRefreshControl } from '@/features/shared/app-refresh-control';
import { AppState } from '@/features/shared/app-state';
import { NotificationRow } from '@/features/notifications/notification-row';
import { SkeletonList } from '@/features/shared/skeleton-list';
import {
  useMarkNotificationsRead,
  useNotifications,
} from '@/features/notifications/use-notifications';
import { useTheme } from '@/features/theme/theme-provider';
import { playSelectionHaptic, playSuccessHaptic } from '@/lib/haptics';
import { SwipeableRow } from '@/features/shared/swipeable-row';

export default function NotificationsScreen() {
  const colors = useTheme();
  const styles = createStyles(colors);
  const notificationsQuery = useNotifications();
  const markRead = useMarkNotificationsRead();
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const notifications = notificationsQuery.data?.items ?? [];
  const unreadCount = notificationsQuery.data?.unreadCount ?? 0;
  const visibleNotifications = useMemo(
    () =>
      showUnreadOnly
        ? notifications.filter((item) => item.unread)
        : notifications,
    [notifications, showUnreadOnly],
  );

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen
        options={{
          headerRight: () =>
            notificationsQuery.data?.unreadCount ? (
              <Pressable
                accessibilityLabel="全部标记为已读"
                accessibilityRole="button"
                disabled={markRead.isPending}
                hitSlop={HIT_SLOP}
                onPress={() =>
                  markRead.mutate(undefined, {
                    onSuccess: () => playSuccessHaptic(),
                  })
                }
                style={({ pressed }) => pressed && styles.pressed}
              >
                <SymbolView
                  name={{
                    android: 'done_all',
                    ios: 'checkmark.circle',
                    web: 'done_all',
                  }}
                  size={21}
                  tintColor={colors.ink}
                />
              </Pressable>
            ) : null,
          title: '通知',
        }}
      />
      <FlatList
        contentContainerStyle={styles.content}
        data={visibleNotifications}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          notificationsQuery.fetchStatus === 'paused' ? (
            <AppState title="当前离线" text="恢复联网后继续读取通知。" />
          ) : notificationsQuery.isPending ? (
            <SkeletonList
              accessibilityLabel="正在读取通知"
              count={5}
              rowHeight={84}
            />
          ) : notificationsQuery.isError ? (
            <AppState
              action={() => void notificationsQuery.refetch()}
              text="Bangumi 偶尔会响应较慢，稍后重试即可。"
              title="通知读取失败"
            />
          ) : showUnreadOnly ? (
            <AppState
              text="新消息到达后会在这里显示，下拉可以手动刷新。"
              title="没有未读通知"
            />
          ) : (
            <AppState
              text="新的回复、好友和修订消息会显示在这里。"
              title="暂时没有通知"
            />
          )
        }
        ListHeaderComponent={
          <View>
            {notificationsQuery.data && (notificationsQuery.isError || notificationsQuery.fetchStatus === 'paused') ? (
              <CachedDataNotice onRetry={() => void notificationsQuery.refetch()} />
            ) : null}
            {markRead.isError ? (
              <AppState title="标记已读失败" text="请检查网络后重试，未读状态已恢复。" />
            ) : null}
            <View style={styles.filterRow}>
              <NotificationFilterChip
                label="全部"
                onPress={() => setShowUnreadOnly(false)}
                selected={!showUnreadOnly}
                styles={styles}
              />
              <NotificationFilterChip
                label={unreadCount > 0 ? `未读 ${unreadCount}` : '未读'}
                onPress={() => setShowUnreadOnly(true)}
                selected={showUnreadOnly}
                styles={styles}
              />
            </View>
          </View>
        }
        refreshControl={
          <AppRefreshControl
            onRefresh={() => void notificationsQuery.refetch()}
            refreshing={notificationsQuery.isRefetching}
          />
        }
        removeClippedSubviews={Platform.OS === 'android'}
        renderItem={({ index, item }) => (
          <SwipeableRow
            actions={
              item.unread
                ? [
                    {
                      backgroundColor: colors.accent,
                      foreground: colors.surface,
                      id: 'mark-read',
                      label: '已读',
                      onPress: () => {
                        playSelectionHaptic();
                        markRead.mutate([item.id]);
                      },
                      symbol: {
                        android: 'done_all',
                        ios: 'checkmark.circle',
                        web: 'done_all',
                      },
                    },
                  ]
                : []
            }
            contentBackgroundColor={colors.background}
          >
            <NotificationRow
              colors={colors}
              hasDivider={index > 0}
              item={item}
              onRead={(id) => markRead.mutate([id])}
            />
          </SwipeableRow>
        )}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

function NotificationFilterChip({
  label,
  onPress,
  selected,
  styles,
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterChip,
        selected && styles.filterChipSelected,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.filterChipText,
          selected && styles.filterChipTextSelected,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  content: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    margin: SPACING.lg,
    overflow: 'hidden',
    paddingBottom: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  filterRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingBottom: SPACING.md,
    paddingTop: SPACING.lg,
  },
  filterChip: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: MIN_TOUCH_SIZE,
    paddingHorizontal: SPACING.lg,
  },
  filterChipSelected: { backgroundColor: colors.ink },
  filterChipText: { color: colors.muted, ...TYPE.caption, fontWeight: '700' },
  filterChipTextSelected: { color: colors.surface },
  pressed: { opacity: 0.62 },
});
