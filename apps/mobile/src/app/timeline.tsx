import { useMemo } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/constants/theme';
import { AppRefreshControl } from '@/features/shared/app-refresh-control';
import { PagedListFooter } from '@/features/shared/paged-list-footer';
import { useTheme } from '@/features/theme/theme-provider';
import { FriendTimelineRow } from '@/features/timeline/friend-timeline-row';
import { useFriendTimeline } from '@/features/timeline/use-friend-timeline';

export default function FriendTimelineScreen() {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const timelineQuery = useFriendTimeline();
  const items = useMemo(
    () => timelineQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [timelineQuery.data],
  );

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen options={{ title: '好友动态' }} />
      <FlatList
        contentContainerStyle={styles.content}
        data={items}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          <TimelineState
            colors={colors}
            error={timelineQuery.isError}
            loading={timelineQuery.isPending}
            onRetry={() => void timelineQuery.refetch()}
          />
        }
        ListFooterComponent={
          items.length > 0 ? (
            <PagedListFooter
              hasNextPage={Boolean(timelineQuery.hasNextPage)}
              isError={timelineQuery.isFetchNextPageError}
              isFetching={timelineQuery.isFetchingNextPage}
              loadedCount={items.length}
              onRetry={() => void timelineQuery.fetchNextPage()}
            />
          ) : null
        }
        onEndReached={() => {
          if (
            timelineQuery.hasNextPage &&
            !timelineQuery.isFetchingNextPage &&
            !timelineQuery.isFetchNextPageError
          ) {
            void timelineQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.45}
        refreshControl={
          <AppRefreshControl
            onRefresh={() => void timelineQuery.refetch()}
            refreshing={
              timelineQuery.isRefetching && !timelineQuery.isFetchingNextPage
            }
          />
        }
        removeClippedSubviews={Platform.OS === 'android'}
        renderItem={({ index, item }) => (
          <FriendTimelineRow hasDivider={index > 0} item={item} />
        )}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

function TimelineState({
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
    <View
      accessibilityLiveRegion={error ? 'assertive' : 'polite'}
      accessibilityRole={error ? 'alert' : undefined}
      style={styles.state}
    >
      <Text style={styles.stateTitle}>
        {loading ? '正在读取好友动态' : error ? '好友动态读取失败' : '还没有好友动态'}
      </Text>
      <Text style={styles.stateText}>
        {error ? 'Bangumi 偶尔会响应较慢，稍后重试即可。' : '新的好友活动会显示在这里。'}
      </Text>
      {error ? (
        <Pressable
          accessibilityLabel="重试加载好友动态"
          accessibilityRole="button"
          onPress={onRetry}
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
    backgroundColor: colors.surface,
    borderRadius: 22,
    margin: 20,
    overflow: 'hidden',
    paddingHorizontal: 18,
  },
  state: { alignItems: 'center', paddingHorizontal: 20, paddingVertical: 42 },
  stateTitle: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  stateText: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 7, textAlign: 'center' },
  retryButton: { alignItems: 'center', justifyContent: 'center', marginTop: 10, minHeight: 44, paddingHorizontal: 16 },
  retryText: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  pressed: { opacity: 0.62 },
});
