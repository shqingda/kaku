import { useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-provider';
import { GroupTopicRow } from '@/features/community/group-topic-row';
import {
  usePublicGroup,
  usePublicGroupTopics,
} from '@/features/community/use-community';
import { DiscussionStatus } from '@/features/discussions/discussion-status';
import { TopicComposer } from '@/features/discussions/topic-composer';
import { AppRefreshControl } from '@/features/shared/app-refresh-control';
import { PagedListFooter } from '@/features/shared/paged-list-footer';
import { useTheme } from '@/features/theme/theme-provider';

export default function GroupScreen() {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { name } = useLocalSearchParams<{ name: string }>();
  const { session } = useAuth();
  const [composerVisible, setComposerVisible] = useState(false);
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

  function openTopicComposer() {
    if (session) {
      setComposerVisible(true);
      return;
    }

    Alert.alert(
      '登录后发布话题',
      '话题会发布到你的 Bangumi 账户。',
      [
        { style: 'cancel', text: '取消' },
        { onPress: () => router.push('/account'), text: '去登录' },
      ],
    );
  }

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
                  <View style={styles.sectionRight}>
                    <Text style={styles.sectionCount}>
                      已加载 {topics.length} · 共 {topicTotal.toLocaleString('zh-CN')}
                    </Text>
                    <Pressable
                      accessibilityLabel="新建小组话题"
                      accessibilityRole="button"
                      onPress={openTopicComposer}
                      style={({ pressed }) => [
                        styles.newTopicButton,
                        pressed && styles.pressed,
                      ]}
                    >
                      <SymbolView
                        name={{
                          android: 'add_comment',
                          ios: 'square.and.pencil',
                          web: 'add_comment',
                        }}
                        size={13}
                        tintColor={colors.surface}
                        weight="semibold"
                      />
                      <Text style={styles.newTopicText}>发话题</Text>
                    </Pressable>
                  </View>
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
        refreshControl={
          <AppRefreshControl
            onRefresh={() =>
              void Promise.all([groupQuery.refetch(), topicsQuery.refetch()])
            }
            refreshing={
              (groupQuery.isRefetching || topicsQuery.isRefetching) &&
              !groupQuery.isPending &&
              !topicsQuery.isPending
            }
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
              topic={item}
            />
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />
      <TopicComposer
        onClose={() => setComposerVisible(false)}
        onCreated={(topicId) => {
          setComposerVisible(false);
          router.push({
            pathname: '/group/topic/[id]',
            params: { id: String(topicId) },
          });
        }}
        target={{ groupName: name, kind: 'group' }}
        visible={composerVisible}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  content: { padding: 20, paddingBottom: 44 },
  groupHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingBottom: 8,
  },
  icon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 21,
    height: 76,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 76,
  },
  iconFallback: { color: colors.subtle, fontSize: 22, fontWeight: '800' },
  groupMain: { flex: 1, marginLeft: 17 },
  title: {
    color: colors.ink,
    fontSize: 25,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  meta: { color: colors.muted, fontSize: 12, marginTop: 7 },
  descriptionCard: {
    backgroundColor: colors.surface,
    borderRadius: 21,
    padding: 18,
  },
  description: { color: colors.muted, fontSize: 14, lineHeight: 22 },
  descriptionToggle: {
    alignSelf: 'flex-start',
    marginTop: 12,
    justifyContent: 'center',
    minHeight: 44,
  },
  descriptionToggleText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 4,
    paddingTop: 18,
  },
  sectionTitle: { color: colors.ink, fontSize: 19, fontWeight: '800' },
  sectionRight: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  sectionCount: { color: colors.subtle, fontSize: 12 },
  newTopicButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 13,
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 12,
  },
  newTopicText: { color: colors.surface, fontSize: 13, fontWeight: '800' },
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
