import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { FlatList } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/design';
import { FriendTimelineRow } from '@/features/timeline/friend-timeline-row';
import { useFriendTimeline } from '@/features/timeline/use-friend-timeline';

export default function FriendTimelineScreen() {
  const timelineQuery = useFriendTimeline();
  const items = timelineQuery.data ?? [];

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              accessibilityRole="link"
              onPress={() =>
                void Linking.openURL('https://bgm.tv/timeline?type=say')
              }
              style={({ pressed }) => [
                styles.publishButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.publishText}>发布</Text>
            </Pressable>
          ),
          title: '好友动态',
        }}
      />
      <FlatList
        contentContainerStyle={styles.content}
        data={items}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          <TimelineState
            error={timelineQuery.isError}
            loading={timelineQuery.isPending}
            onRetry={() => void timelineQuery.refetch()}
          />
        }
        onRefresh={() => void timelineQuery.refetch()}
        refreshing={timelineQuery.isRefetching}
        renderItem={({ index, item }) => (
          <FriendTimelineRow hasDivider={index > 0} item={item} />
        )}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

function TimelineState({
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
        {loading ? '正在读取好友动态' : error ? '好友动态读取失败' : '还没有好友动态'}
      </Text>
      <Text style={styles.stateText}>
        {error ? 'Bangumi 偶尔会响应较慢，稍后重试即可。' : '新的好友活动会显示在这里。'}
      </Text>
      {error ? (
        <Pressable onPress={onRetry} style={styles.retryButton}>
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
  publishButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
  },
  publishText: { color: COLORS.accent, fontSize: 16, fontWeight: '600' },
  state: { alignItems: 'center', paddingHorizontal: 20, paddingVertical: 42 },
  stateTitle: { color: COLORS.ink, fontSize: 16, fontWeight: '700' },
  stateText: { color: COLORS.muted, fontSize: 13, lineHeight: 20, marginTop: 7, textAlign: 'center' },
  retryButton: { marginTop: 14, paddingHorizontal: 16, paddingVertical: 9 },
  retryText: { color: COLORS.accent, fontSize: 13, fontWeight: '700' },
  pressed: { opacity: 0.62 },
});
