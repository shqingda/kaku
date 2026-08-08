import { Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/design';
import { NotificationRow } from '@/features/notifications/notification-row';
import {
  useMarkNotificationsRead,
  useNotifications,
} from '@/features/notifications/use-notifications';

export default function NotificationsScreen() {
  const notificationsQuery = useNotifications();
  const markRead = useMarkNotificationsRead();
  const notifications = notificationsQuery.data?.items ?? [];

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
                  tintColor={COLORS.ink}
                />
              </Pressable>
            ) : null,
          title: '通知',
        }}
      />
      <FlatList
        contentContainerStyle={styles.content}
        data={notifications}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          <NotificationState
            error={notificationsQuery.isError}
            loading={notificationsQuery.isPending}
            onRetry={() => void notificationsQuery.refetch()}
          />
        }
        onRefresh={() => void notificationsQuery.refetch()}
        refreshing={notificationsQuery.isRefetching}
        removeClippedSubviews={Platform.OS === 'android'}
        renderItem={({ index, item }) => (
          <NotificationRow
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

function NotificationState({
  error,
  loading,
  onRetry,
}: {
  error: boolean;
  loading: boolean;
  onRetry: () => void;
}) {
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

const styles = StyleSheet.create({
  screen: { backgroundColor: COLORS.background, flex: 1 },
  content: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    margin: 20,
    overflow: 'hidden',
    paddingHorizontal: 18,
  },
  state: { alignItems: 'center', paddingHorizontal: 20, paddingVertical: 48 },
  stateTitle: { color: COLORS.ink, fontSize: 16, fontWeight: '700' },
  stateText: { color: COLORS.muted, fontSize: 13, lineHeight: 20, marginTop: 7, textAlign: 'center' },
  retry: { marginTop: 14, paddingHorizontal: 16, paddingVertical: 9 },
  retryText: { color: COLORS.accent, fontSize: 13, fontWeight: '700' },
  pressed: { opacity: 0.62 },
});
