import { useMemo } from 'react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/design';
import { PagedListFooter } from '@/features/shared/paged-list-footer';
import { PublicUserTimelineRow } from '@/features/users/public-user-timeline-row';
import { usePublicUserTimeline } from '@/features/users/use-public-user';

export default function PublicUserTimelineScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const timelineQuery = usePublicUserTimeline(username);
  const timeline = useMemo(
    () => timelineQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [timelineQuery.data],
  );

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen
        options={{
          headerBackButtonDisplayMode: 'minimal',
          headerShadowVisible: false,
          title: '时间线',
        }}
      />
      <FlatList
        contentContainerStyle={styles.content}
        data={timeline}
        initialNumToRender={12}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          timelineQuery.isPending ? (
            <TimelineState text="正在读取公开动态。" title="时间线加载中" />
          ) : timelineQuery.isError ? (
            <TimelineState
              action={() => void timelineQuery.refetch()}
              text="请检查网络后重试。"
              title="时间线读取失败"
            />
          ) : (
            <TimelineState
              text="该用户没有公开动态。"
              title="暂无动态"
            />
          )
        }
        ListFooterComponent={
          timeline.length > 0 ? (
            <PagedListFooter
              hasNextPage={Boolean(timelineQuery.hasNextPage)}
              isError={timelineQuery.isFetchNextPageError}
              isFetching={timelineQuery.isFetchingNextPage}
              loadedCount={timeline.length}
              onRetry={() => void timelineQuery.fetchNextPage()}
            />
          ) : null
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>时间线</Text>
            <Text style={styles.subtitle}>@{username} 的公开动态</Text>
          </View>
        }
        maxToRenderPerBatch={12}
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
        removeClippedSubviews={Platform.OS === 'android'}
        renderItem={({ index, item }) => (
          <View
            style={[
              styles.item,
              index === 0 && styles.firstItem,
              index === timeline.length - 1 && styles.lastItem,
            ]}
          >
            <PublicUserTimelineRow
              hasDivider={index > 0}
              item={item}
              onPress={
                item.subjectId
                  ? () =>
                      router.push({
                        pathname: '/subject/[id]',
                        params: { id: String(item.subjectId) },
                      })
                  : undefined
              }
            />
          </View>
        )}
        showsVerticalScrollIndicator={false}
        updateCellsBatchingPeriod={40}
        windowSize={7}
      />
    </SafeAreaView>
  );
}

function TimelineState({
  action,
  text,
  title,
}: {
  action?: () => void;
  text: string;
  title: string;
}) {
  return (
    <View style={styles.state}>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateText}>{text}</Text>
      {action ? (
        <Pressable
          accessibilityRole="button"
          onPress={action}
          style={({ pressed }) => [
            styles.retry,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.retryText}>重试</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: COLORS.background, flex: 1 },
  content: { paddingBottom: 44, paddingHorizontal: 20 },
  header: {
    paddingBottom: 18,
    paddingHorizontal: 4,
    paddingTop: 24,
  },
  title: {
    color: COLORS.ink,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  subtitle: { color: COLORS.muted, fontSize: 13, marginTop: 7 },
  item: {
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
    paddingHorizontal: 17,
  },
  firstItem: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  lastItem: {
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  state: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: 30,
  },
  stateTitle: { color: COLORS.ink, fontSize: 17, fontWeight: '800' },
  stateText: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 7,
    textAlign: 'center',
  },
  retry: {
    backgroundColor: COLORS.accentSoft,
    borderRadius: 13,
    marginTop: 15,
    paddingHorizontal: 17,
    paddingVertical: 9,
  },
  retryText: { color: COLORS.accent, fontSize: 13, fontWeight: '800' },
  pressed: { opacity: 0.62 },
});
