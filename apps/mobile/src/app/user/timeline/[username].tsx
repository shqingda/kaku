import { useMemo } from 'react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/constants/theme';
import { AppState } from '@/features/shared/app-state';
import { CachedDataNotice } from '@/features/shared/cached-data-notice';
import { PagedListFooter } from '@/features/shared/paged-list-footer';
import { useTheme } from '@/features/theme/theme-provider';
import { PublicUserTimelineRow } from '@/features/users/public-user-timeline-row';
import { usePublicUserTimeline } from '@/features/users/use-public-user';

export default function PublicUserTimelineScreen() {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
            <AppState text="正在读取公开动态。" title="时间线加载中" />
          ) : timelineQuery.isError ? (
            <AppState
              action={() => void timelineQuery.refetch()}
              text="请检查网络后重试。"
              title="时间线读取失败"
            />
          ) : (
            <AppState
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
            {timeline.length > 0 && timelineQuery.isError ? (
              <CachedDataNotice onRetry={() => void timelineQuery.refetch()} />
            ) : null}
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
        onRefresh={() => void timelineQuery.refetch()}
        refreshing={timelineQuery.isRefetching && !timelineQuery.isPending}
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

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  content: { paddingBottom: 44, paddingHorizontal: 20 },
  header: {
    paddingBottom: 18,
    paddingHorizontal: 4,
    paddingTop: 24,
  },
  title: {
    color: colors.ink,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 7 },
  item: {
    backgroundColor: colors.surface,
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
});
