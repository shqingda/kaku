import { useMemo, useState } from 'react';
import { Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/constants/theme';
import { AppRefreshControl } from '@/features/shared/app-refresh-control';
import { AppState } from '@/features/shared/app-state';
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
            <AppState
              text="新的回复、好友和修订消息会显示在这里。"
              title="正在读取通知"
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
  pressed: { opacity: 0.62 },
});
