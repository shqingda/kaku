import { useState } from 'react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
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
import { HIT_SLOP, SPACING, TYPE } from '@/constants/design';
import { AppRefreshControl } from '@/features/shared/app-refresh-control';
import { AppState } from '@/features/shared/app-state';
import { useAuth } from '@/features/auth/auth-provider';
import { SubjectTypeTabs } from '@/features/catalog/subject-type-tabs';
import { getSubjectTypeLabel } from '@/features/catalog/subject-types';
import { PublicUserBlogRow } from '@/features/users/public-user-blog-row';
import { PublicUserCollectionRow } from '@/features/users/public-user-collection-row';
import { PublicUserFriendCard } from '@/features/users/public-user-friend-card';
import { PublicUserTimelineRow } from '@/features/users/public-user-timeline-row';
import { PublicUserProfileSummary } from '@/features/users/public-user-profile-summary';
import {
  ProfileSectionHeader,
  ProfileSectionStatus,
  profileSectionMeta,
} from '@/features/users/public-user-profile-section';
import { TimelineComposer } from '@/features/timeline/timeline-composer';
import { SectionAction } from '@/features/shared/section-action';
import { HeaderShareButton } from '@/features/shared/header-share-button';
import { useTheme } from '@/features/theme/theme-provider';
import {
  usePublicUser,
  usePublicUserBlogs,
  usePublicUserCollections,
  usePublicUserFriends,
  usePublicUserTimeline,
} from '@/features/users/use-public-user';

// Bangumi P1 的角色/人物收藏接口仍不稳定，暂时隐藏所有人的角色与人物
// 收藏入口。相关页面、查询和接口均保留，待上游恢复后重新打开。
const SHOW_ENTITY_ENTRY = false;

export default function PublicUserScreen() {
  const colors = useTheme();
  const styles = createStyles(colors);
  const { username } = useLocalSearchParams<{ username: string }>();
  const { session } = useAuth();
  const [composerVisible, setComposerVisible] = useState(false);
  const userQuery = usePublicUser(username);
  const blogsQuery = usePublicUserBlogs(username);
  const [collectionSubjectType, setCollectionSubjectType] = useState(2);
  const collectionSubjectTypeLabel = getSubjectTypeLabel(
    collectionSubjectType,
  );
  const collectionsQuery = usePublicUserCollections(
    username,
    collectionSubjectType,
  );
  const friendsQuery = usePublicUserFriends(username);
  const timelineQuery = usePublicUserTimeline(username);
  const user = userQuery.data;
  const isOwnProfile = Boolean(user && session?.user.username === user.username);
  const blogsPage = blogsQuery.data?.pages[0];
  const collectionsPage = collectionsQuery.data?.pages[0];
  const friendsPage = friendsQuery.data?.pages[0];
  const timelinePage = timelineQuery.data?.pages[0];
  const blogs = blogsPage?.items ?? [];
  const collections = collectionsPage?.items ?? [];
  const friends = friendsPage?.items ?? [];
  const timeline = timelinePage?.items ?? [];
  const isRefreshing =
    userQuery.isRefetching ||
    blogsQuery.isRefetching ||
    collectionsQuery.isRefetching ||
    friendsQuery.isRefetching ||
    timelineQuery.isRefetching;

  async function refreshProfile() {
    await Promise.all([
      userQuery.refetch(),
      blogsQuery.refetch(),
      collectionsQuery.refetch(),
      friendsQuery.refetch(),
      timelineQuery.refetch(),
    ]);
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen
        options={{
          title: user?.nickname ?? '用户主页',
          headerRight: () => (
            <HeaderShareButton
              path={`/user/${username}`}
              title={user?.nickname ?? ''}
            />
          ),
        }}
      />
      {userQuery.isPending ? (
        <AppState text="正在读取公开资料。" title="加载中" />
      ) : userQuery.isError || !user ? (
        <AppState
          action={() => void userQuery.refetch()}
          text="用户可能不存在，或网络暂时不可用。"
          title="用户资料读取失败"
        />
      ) : (
        <FlatList
          contentContainerStyle={styles.content}
          data={collections}
          keyExtractor={(item) => String(item.id)}
          ListEmptyComponent={
            <ProfileSectionStatus
              emptyText={`该用户没有公开${collectionSubjectTypeLabel}收藏。`}
              isError={collectionsQuery.isError}
              isPending={collectionsQuery.isPending}
              onRetry={() => void collectionsQuery.refetch()}
            />
          }
          ListHeaderComponent={
            <>
              <PublicUserProfileSummary
                user={user}
                showActions={Boolean(session && !isOwnProfile)}
                onOpenEntities={SHOW_ENTITY_ENTRY ? () =>
                  router.push({
                    pathname: '/user/entities/[username]',
                    params: { username: user.username },
                  }) : undefined
                }
              />
              <ProfileSectionHeader
                title="好友"
                meta={profileSectionMeta(
                  friendsQuery.isPending,
                  friendsQuery.isError,
                  friends.length,
                  friendsPage?.total,
                )}
                action={friendsQuery.hasNextPage ? (
                  <SectionAction
                    accessibilityHint="打开完整好友列表"
                    label="查看全部"
                    onPress={() =>
                      router.push({
                        pathname: '/user/friends/[username]',
                        params: { username: user.username },
                      })
                    }
                    style={styles.sectionAction}
                  />
                ) : null}
              />
              {friends.length > 0 ? (
                <ScrollView
                  contentContainerStyle={styles.friendList}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                >
                  {friends.map((friend) => (
                    <PublicUserFriendCard
                      compact
                      friend={friend}
                      key={friend.username}
                      onPress={() =>
                        router.push({
                          pathname: '/user/[username]',
                          params: { username: friend.username },
                        })
                      }
                    />
                  ))}
                </ScrollView>
              ) : (
                <ProfileSectionStatus
                  emptyText="暂无公开好友。"
                  isError={friendsQuery.isError}
                  isPending={friendsQuery.isPending}
                  onRetry={() => void friendsQuery.refetch()}
                />
              )}
              <ProfileSectionHeader
                title="时间线"
                meta={isOwnProfile ? undefined : (
                  timelineQuery.isPending ? '读取中' :
                  timelineQuery.isError ? '暂不可用' : `最近 ${timeline.length} 条`
                )}
                action={isOwnProfile ? (
                  <Pressable
                    accessibilityLabel="发布动态"
                    accessibilityRole="button"
                    hitSlop={HIT_SLOP}
                    onPress={() => setComposerVisible(true)}
                    style={({ pressed }) => [
                      styles.timelinePublishButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <SymbolView
                      name={{
                        android: 'edit',
                        ios: 'square.and.pencil',
                        web: 'edit',
                      }}
                      size={15}
                      tintColor={colors.ink}
                      weight="semibold"
                    />
                    <Text style={styles.timelinePublishText}>发布</Text>
                  </Pressable>
                ) : null}
              />
              <View style={styles.timelineList}>
                {timeline.length === 0 ? (
                  <ProfileSectionStatus
                    emptyText="暂无公开动态。"
                    isError={timelineQuery.isError}
                    isPending={timelineQuery.isPending}
                    onRetry={() => void timelineQuery.refetch()}
                  />
                ) : null}
                {timeline.map((item, index) => (
                  <PublicUserTimelineRow
                    hasDivider={index > 0}
                    item={item}
                    key={item.id}
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
                ))}
                {timeline.length > 0 ? (
                  <SectionAction
                    accessibilityLabel="查看全部动态"
                    label="全部动态"
                    onPress={() =>
                      router.push({
                        pathname: '/user/timeline/[username]',
                        params: { username: user.username },
                      })
                    }
                    style={styles.timelineAllButton}
                  />
                ) : null}
              </View>
              <ProfileSectionHeader
                title="日志"
                meta={profileSectionMeta(
                  blogsQuery.isPending,
                  blogsQuery.isError,
                  blogs.length,
                  blogsPage?.total,
                  '最近 ',
                )}
                action={blogsQuery.hasNextPage ? (
                  <SectionAction
                    accessibilityHint="打开完整日志列表"
                    label="查看全部"
                    onPress={() =>
                      router.push({
                        pathname: '/user/blogs/[username]',
                        params: { username: user.username },
                      })
                    }
                    style={styles.sectionAction}
                  />
                ) : null}
              />
              <View style={styles.blogList}>
                {blogs.length === 0 ? (
                  <ProfileSectionStatus
                    emptyText="暂无公开日志。"
                    isError={blogsQuery.isError}
                    isPending={blogsQuery.isPending}
                    onRetry={() => void blogsQuery.refetch()}
                  />
                ) : null}
                {blogs.map((blog, index) => (
                  <PublicUserBlogRow
                    hasDivider={index > 0}
                    item={blog}
                    key={blog.id}
                    onPress={() =>
                      router.push({
                        pathname: '/blog/[id]',
                        params: { id: String(blog.id) },
                      })
                    }
                  />
                ))}
              </View>
              <ProfileSectionHeader
                title={`${collectionSubjectTypeLabel}收藏`}
                meta={profileSectionMeta(
                  collectionsQuery.isPending,
                  collectionsQuery.isError,
                  collections.length,
                  collectionsPage?.total,
                )}
                action={collectionsQuery.hasNextPage ? (
                  <SectionAction
                    accessibilityHint={`打开完整${collectionSubjectTypeLabel}收藏列表`}
                    label="查看全部"
                    onPress={() =>
                      router.push({
                        pathname: '/user/collections/[username]',
                        params: {
                          type: String(collectionSubjectType),
                          username: user.username,
                        },
                      })
                    }
                    style={styles.sectionAction}
                  />
                ) : null}
              />
              <SubjectTypeTabs
                contentContainerStyle={styles.collectionTypeTabs}
                onChange={setCollectionSubjectType}
                selectedType={collectionSubjectType}
              />
            </>
          }
          refreshControl={
            <AppRefreshControl
              onRefresh={() => void refreshProfile()}
              refreshing={isRefreshing}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.collectionCard}>
              <PublicUserCollectionRow
                item={item}
                onPress={() =>
                  router.push({
                    pathname: '/subject/[id]',
                    params: { id: String(item.id) },
                  })
                }
              />
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
      <TimelineComposer
        onClose={() => setComposerVisible(false)}
        visible={composerVisible}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  content: {
    gap: SPACING.lg,
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl + SPACING.xl,
  },
  sectionAction: {
    marginLeft: SPACING.md,
  },
  friendList: { gap: SPACING.lg, paddingBottom: SPACING.sm },
  timelineList: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    overflow: 'hidden',
    paddingHorizontal: SPACING.lg,
  },
  timelinePublishButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderCurve: 'continuous',
    borderRadius: 11,
    flexDirection: 'row',
    gap: SPACING.xs,
    height: 32,
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
  },
  timelinePublishText: {
    color: colors.ink,
    ...TYPE.caption,
    fontWeight: '700',
    includeFontPadding: false,
  },
  timelineAllButton: {
    borderTopColor: colors.divider,
    borderTopWidth: StyleSheet.hairlineWidth,
    justifyContent: 'space-between',
    minHeight: 50,
    paddingHorizontal: SPACING.xs / 2,
  },
  blogList: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    paddingHorizontal: SPACING.lg,
  },
  collectionTypeTabs: { paddingBottom: SPACING.md },
  collectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    marginBottom: SPACING.xs / 2,
    overflow: 'hidden',
    paddingHorizontal: SPACING.md,
  },
  pressed: { opacity: 0.62 },
});
