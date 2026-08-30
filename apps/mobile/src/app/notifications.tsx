import { useMemo, useState } from 'react';
import { Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/constants/theme';
import { AppRefreshControl } from '@/features/shared/app-refresh-control';
import { NotificationRow } from '@/features/notifications/notification-row';
import {
  useMarkNotificationsRead,
  useNotifications,
} from '@/features/notifications/use-notifications';
import { useTheme } from '@/features/theme/theme-provider';

export default function NotificationsScreen() {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
                hitSlop={8}
                onPress={() => markRead.mutate(undefined)}
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
          notificationsQuery.isPending ? (
            <NotificationState
              colors={colors}
              error={false}
              loading
              onRetry={() => void notificationsQuery.refetch()}
            />
          ) : notificationsQuery.isError ? (
            <NotificationState
              colors={colors}
              error
              loading={false}
              onRetry={() => void notificationsQuery.refetch()}
            />
          ) : showUnreadOnly ? (
            <View style={styles.state}>
              <Text style={styles.stateTitle}>没有未读通知</Text>
              <Text style={styles.stateText}>
                新消息到达后会在这里显示，下拉可以手动刷新。
              </Text>
            </View>
          ) : (
            <NotificationState
              colors={colors}
              error={false}
              loading={false}
              onRetry={() => void notificationsQuery.refetch()}
            />
          )
        }
        ListHeaderComponent={
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
        }
        refreshControl={
          <AppRefreshControl
            onRefresh={() => void notificationsQuery.refetch()}
            refreshing={notificationsQuery.isRefetching}
          />
        }
        removeClippedSubviews={Platform.OS === 'android'}
        renderItem={({ index, item }) => (
          <NotificationRow
            colors={colors}
            hasDivider={index > 0}
            item={item}
            onRead={(id) => markRead.mutate([id])}
          />
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

function NotificationState({
  colors,
  error,
  loading,
  onRetry,
}: {
  colors: ThemeColors;
  error: boolean;
  loading: boolean;
  onRetry: () => void;
}) {
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.state}>
      <Text style={styles.stateTitle}>
        {loading ? '正在读取通知' : error ? '通知读取失败' : '暂时没有通知'}
      </Text>
      <Text style={styles.stateText}>
        {error
          ? 'Bangumi 偶尔会响应较慢，稍后重试即可。'
          : '新的回复、好友和修订消息会显示在这里。'}
      </Text>
      {error ? (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
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
    backgroundColor: colors.surface,
    borderRadius: 22,
    margin: 20,
    overflow: 'hidden',
    paddingBottom: 8,
    paddingHorizontal: 18,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 12,
    paddingTop: 14,
  },
  filterChip: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 14,
  },
  filterChipSelected: { backgroundColor: colors.ink },
  filterChipText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  filterChipTextSelected: { color: colors.surface },
  state: { alignItems: 'center', paddingHorizontal: 20, paddingVertical: 48 },
  stateTitle: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  stateText: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 7, textAlign: 'center' },
  retry: { marginTop: 14, paddingHorizontal: 16, paddingVertical: 9 },
  retryText: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  pressed: { opacity: 0.62 },
});
