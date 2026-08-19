import { useMemo } from 'react';
import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/constants/theme';
import { AppRefreshControl } from '@/features/shared/app-refresh-control';
import { GroupTopicRow } from '@/features/community/group-topic-row';
import { DiscussionStatus } from '@/features/discussions/discussion-status';
import {
  usePublicCommunity,
  usePublicCommunityTopics,
} from '@/features/community/use-community';
import { PagedListFooter } from '@/features/shared/paged-list-footer';
import { CachedDataNotice } from '@/features/shared/cached-data-notice';
import { useTheme } from '@/features/theme/theme-provider';

const compactNumber = new Intl.NumberFormat('zh-CN', {
  maximumFractionDigits: 1,
  notation: 'compact',
});

export default function CommunityScreen() {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const communityQuery = usePublicCommunity();
  const topicsQuery = usePublicCommunityTopics();
  const community = communityQuery.data;
  const topics = useMemo(
    () => topicsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [topicsQuery.data],
  );
  const topicTotal = topicsQuery.data?.pages[0]?.total ?? 0;
  const isRefreshing =
    (communityQuery.isRefetching || topicsQuery.isRefetching) &&
    !communityQuery.isPending &&
    !topicsQuery.isPending;

  function refreshCommunity() {
    void Promise.all([communityQuery.refetch(), topicsQuery.refetch()]);
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen options={{ title: '社区' }} />
      <FlatList
        contentContainerStyle={styles.content}
        data={topics}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          !topicsQuery.isPending && !topicsQuery.isError ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>暂无公开话题。</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          topics.length > 0 ? (
            <PagedListFooter
              hasNextPage={Boolean(topicsQuery.hasNextPage)}
              isError={topicsQuery.isFetchNextPageError}
              isFetching={topicsQuery.isFetchingNextPage}
              loadedCount={topics.length}
              onRetry={() => void topicsQuery.fetchNextPage()}
              total={topicTotal}
            />
          ) : null
        }
        ListHeaderComponent={
          <>
            {community && communityQuery.isError ? (
              <CachedDataNotice onRetry={() => void communityQuery.refetch()} />
            ) : (
              <DiscussionStatus
                errorText="社区内容加载失败，请检查网络后重试。"
                isError={communityQuery.isError}
                isPending={communityQuery.isPending}
                loadingText="正在读取 Bangumi 社区…"
                onRetry={() => void communityQuery.refetch()}
              />
            )}
            {community ? (
              <>
                <Text style={styles.sectionTitle}>热门小组</Text>
                <ScrollView
                  contentContainerStyle={styles.groupList}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                >
                  {community.groups.map((group) => (
                    <Pressable
                      accessibilityLabel={`打开小组：${group.title}，${group.memberCount} 人`}
                      accessibilityRole="button"
                      key={group.name}
                      onPress={() =>
                        router.push({
                          pathname: '/group/[name]',
                          params: { name: group.name },
                        })
                      }
                      style={({ pressed }) => [
                        styles.groupCard,
                        pressed && styles.pressed,
                      ]}
                    >
                      <View style={styles.groupIcon}>
                        <Text style={styles.iconFallback}>
                          {group.title.slice(0, 1)}
                        </Text>
                        {group.iconUrl ? (
                          <Image
                            contentFit="cover"
                            recyclingKey={group.iconUrl}
                            source={group.iconUrl}
                            style={StyleSheet.absoluteFill}
                          />
                        ) : null}
                      </View>
                      <Text numberOfLines={2} style={styles.groupTitle}>
                        {group.title}
                      </Text>
                      <Text style={styles.groupMeta}>
                        {group.memberCount} 人
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            ) : null}
            <View style={styles.topicHeader}>
              <Text style={styles.sectionTitle}>最新话题</Text>
              {topics.length > 0 ? (
                <Text style={styles.sectionMeta}>
                  已加载 {topics.length} · 共 {compactNumber.format(topicTotal)}
                </Text>
              ) : null}
            </View>
            {topics.length > 0 && topicsQuery.isError ? (
              <CachedDataNotice onRetry={() => void topicsQuery.refetch()} />
            ) : (
              <DiscussionStatus
                errorText="最新话题加载失败，请检查网络后重试。"
                isError={topicsQuery.isError}
                isPending={topicsQuery.isPending}
                loadingText="正在读取最新话题…"
                onRetry={() => void topicsQuery.refetch()}
              />
            )}
          </>
        }
        onEndReached={() => {
          if (
            topicsQuery.hasNextPage &&
            !topicsQuery.isFetchingNextPage &&
            !topicsQuery.isFetchNextPageError
          ) {
            void topicsQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.45}
        refreshControl={
          <AppRefreshControl
            onRefresh={refreshCommunity}
            refreshing={isRefreshing}
          />
        }
        renderItem={({ index, item }) => (
          <View
            style={[
              styles.topicList,
              index === 0 && styles.firstTopicList,
              index === topics.length - 1 &&
                styles.lastTopicList,
            ]}
          >
            <GroupTopicRow
              hasDivider={index > 0}
              onPress={() =>
                router.push({
                  pathname: '/group/topic/[id]',
                  params: { id: String(item.id) },
                })
              }
              showGroup
              topic={item}
            />
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  content: { paddingBottom: 44, paddingHorizontal: 20 },
  sectionTitle: {
    color: colors.ink,
    fontSize: 19,
    fontWeight: '800',
    paddingBottom: 10,
    paddingHorizontal: 4,
    paddingTop: 20,
  },
  topicHeader: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionMeta: { color: colors.subtle, fontSize: 12 },
  groupList: { gap: 10, paddingBottom: 8, paddingTop: 2 },
  groupCard: {
    backgroundColor: colors.surface,
    borderRadius: 19,
    minHeight: 138,
    padding: 12,
    width: 126,
  },
  groupIcon: {
    alignItems: 'center',
    backgroundColor: colors.track,
    borderRadius: 16,
    height: 48,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 48,
  },
  iconFallback: { color: colors.subtle, fontSize: 16, fontWeight: '800' },
  groupTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 10,
  },
  groupMeta: { color: colors.subtle, fontSize: 11, marginTop: 6 },
  topicList: {
    backgroundColor: colors.surface,
    overflow: 'hidden',
    paddingHorizontal: 16,
  },
  firstTopicList: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  lastTopicList: {
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  pressed: { opacity: 0.62 },
  empty: { alignItems: 'center', padding: 28 },
  emptyText: { color: colors.muted, fontSize: 14 },
});
