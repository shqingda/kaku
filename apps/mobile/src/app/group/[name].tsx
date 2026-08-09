import { useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/design';
import { GroupTopicRow } from '@/features/community/group-topic-row';
import {
  usePublicGroup,
  usePublicGroupTopics,
} from '@/features/community/use-community';
import { DiscussionStatus } from '@/features/discussions/discussion-status';
import { PagedListFooter } from '@/features/shared/paged-list-footer';

export default function GroupScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const groupQuery = usePublicGroup(name);
  const topicsQuery = usePublicGroupTopics(name);
  const group = groupQuery.data;
  const topics = useMemo(
    () => topicsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [topicsQuery.data],
  );
  const topicTotal =
    topicsQuery.data?.pages[0]?.total ?? group?.topicCount ?? 0;
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const canCollapseDescription = (group?.description.length ?? 0) > 180;

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen options={{ title: group?.title ?? '小组' }} />
      <FlatList
        contentContainerStyle={styles.content}
        data={topics}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          group && !topicsQuery.isPending && !topicsQuery.isError ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>该小组暂无公开话题。</Text>
            </View>
          ) : null
        }
        ListHeaderComponent={
          <>
            <DiscussionStatus
              errorText="小组加载失败，请检查网络后重试。"
              isError={groupQuery.isError}
              isPending={groupQuery.isPending}
              loadingText="正在读取小组资料…"
              onRetry={() => void groupQuery.refetch()}
            />
            {group ? (
              <>
                <View style={styles.groupHeader}>
                  <View style={styles.icon}>
                    <Text style={styles.iconFallback}>
                      {group.title.slice(0, 1)}
                    </Text>
                    {group.iconUrl ? (
                      <Image
                        contentFit="cover"
                        source={group.iconUrl}
                        style={StyleSheet.absoluteFill}
                      />
                    ) : null}
                  </View>
                  <View style={styles.groupMain}>
                    <Text style={styles.title}>{group.title}</Text>
                    <Text style={styles.meta}>
                      {group.memberCount} 位成员 · {group.topicCount} 个话题
                    </Text>
                  </View>
                </View>
                {group.description ? (
                  <View style={styles.descriptionCard}>
                    <Text
                      numberOfLines={
                        canCollapseDescription && !isDescriptionExpanded
                          ? 6
                          : undefined
                      }
                      style={styles.description}
                    >
                      {group.description}
                    </Text>
                    {canCollapseDescription ? (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() =>
                          setIsDescriptionExpanded((expanded) => !expanded)
                        }
                        style={({ pressed }) => [
                          styles.descriptionToggle,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text style={styles.descriptionToggleText}>
                          {isDescriptionExpanded ? '收起介绍' : '展开小组介绍'}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>小组话题</Text>
                  <Text style={styles.sectionCount}>
                    已加载 {topics.length} · 共 {topicTotal.toLocaleString('zh-CN')}
                  </Text>
                </View>
                <DiscussionStatus
                  errorText="小组话题加载失败，请检查网络后重试。"
                  isError={topicsQuery.isError && topics.length === 0}
                  isPending={topicsQuery.isPending}
                  loadingText="正在读取小组话题…"
                  onRetry={() => void topicsQuery.refetch()}
                />
              </>
            ) : null}
          </>
        }
        ListFooterComponent={
          topics.length > 0 ? (
            <PagedListFooter
              hasNextPage={topicsQuery.hasNextPage}
              isError={topicsQuery.isFetchNextPageError}
              isFetching={topicsQuery.isFetchingNextPage}
              loadedCount={topics.length}
              onRetry={() => void topicsQuery.fetchNextPage()}
              total={topicTotal}
            />
          ) : null
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
              topic={item}
            />
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: COLORS.background, flex: 1 },
  content: { padding: 20, paddingBottom: 44 },
  groupHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingBottom: 8,
  },
  icon: {
    alignItems: 'center',
    backgroundColor: COLORS.track,
    borderRadius: 21,
    height: 76,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 76,
  },
  iconFallback: { color: COLORS.subtle, fontSize: 22, fontWeight: '800' },
  groupMain: { flex: 1, marginLeft: 17 },
  title: {
    color: COLORS.ink,
    fontSize: 25,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  meta: { color: COLORS.muted, fontSize: 12, marginTop: 7 },
  descriptionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 21,
    padding: 18,
  },
  description: { color: COLORS.muted, fontSize: 14, lineHeight: 22 },
  descriptionToggle: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingVertical: 2,
  },
  descriptionToggleText: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  sectionHeader: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 4,
    paddingTop: 18,
  },
  sectionTitle: { color: COLORS.ink, fontSize: 19, fontWeight: '800' },
  sectionCount: { color: COLORS.subtle, fontSize: 12 },
  topicList: {
    backgroundColor: COLORS.surface,
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
  emptyText: { color: COLORS.muted, fontSize: 14 },
});
