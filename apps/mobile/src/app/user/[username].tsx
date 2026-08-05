import { useState } from 'react';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/design';
import { useAuth } from '@/features/auth/auth-provider';
import { SubjectTypeTabs } from '@/features/catalog/subject-type-tabs';
import { getSubjectTypeLabel } from '@/features/catalog/subject-types';
import { PublicUserBlogRow } from '@/features/users/public-user-blog-row';
import { PublicUserCollectionRow } from '@/features/users/public-user-collection-row';
import { PublicUserFriendCard } from '@/features/users/public-user-friend-card';
import { PublicUserTimelineRow } from '@/features/users/public-user-timeline-row';
import {
  usePublicUser,
  usePublicUserBlogs,
  usePublicUserCollections,
  usePublicUserFriends,
  usePublicUserTimeline,
} from '@/features/users/use-public-user';

export default function PublicUserScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { session } = useAuth();
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
  const blogsPage = blogsQuery.data?.pages[0];
  const collectionsPage = collectionsQuery.data?.pages[0];
  const friendsPage = friendsQuery.data?.pages[0];
  const timelinePage = timelineQuery.data?.pages[0];
  const blogs = blogsPage?.items ?? [];
  const collections = collectionsPage?.items ?? [];
  const friends = friendsPage?.items ?? [];
  const timeline = timelinePage?.items ?? [];
  const isOwnProfile = session?.user.username === username;

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen options={{ title: user?.nickname ?? '用户主页' }} />
      {userQuery.isPending ? (
        <State text="正在读取公开资料。" title="加载中" />
      ) : userQuery.isError || !user ? (
        <State
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
            <SectionStatus
              emptyText={`该用户没有公开${collectionSubjectTypeLabel}收藏。`}
              isError={collectionsQuery.isError}
              isPending={collectionsQuery.isPending}
              onRetry={() => void collectionsQuery.refetch()}
            />
          }
          ListHeaderComponent={
            <>
              <View style={styles.profile}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarFallback}>
                    {user.nickname.slice(0, 1)}
                  </Text>
                  {user.avatarUrl ? (
                    <Image
                      contentFit="cover"
                      source={user.avatarUrl}
                      style={StyleSheet.absoluteFill}
                      transition={120}
                    />
                  ) : null}
                </View>
                <View style={styles.profileMain}>
                  <Text style={styles.nickname}>{user.nickname}</Text>
                  <Text style={styles.username}>@{user.username}</Text>
                  {user.sign ? (
                    <Text numberOfLines={3} style={styles.sign}>
                      {user.sign}
                    </Text>
                  ) : null}
                  {isOwnProfile ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => router.push('/account')}
                      style={({ pressed }) => [
                        styles.accountLink,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={styles.accountLinkText}>账户与设备</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>好友</Text>
                <View style={styles.sectionRight}>
                  <Text style={styles.sectionMeta}>
                    {sectionMeta(
                      friendsQuery.isPending,
                      friendsQuery.isError,
                      friends.length,
                      friendsPage?.total,
                    )}
                  </Text>
                  {friendsQuery.hasNextPage ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() =>
                        router.push({
                          pathname: '/user/friends/[username]',
                          params: { username: user.username },
                        })
                      }
                      style={({ pressed }) => [
                        styles.sectionAction,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={styles.sectionActionText}>查看全部</Text>
                      <Text style={styles.sectionActionChevron}>›</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
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
                <SectionStatus
                  emptyText="暂无公开好友。"
                  isError={friendsQuery.isError}
                  isPending={friendsQuery.isPending}
                  onRetry={() => void friendsQuery.refetch()}
                />
              )}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>时间线</Text>
                <View style={styles.sectionRight}>
                  <Text style={styles.sectionMeta}>
                    {timelineQuery.isPending
                      ? '读取中'
                      : timelineQuery.isError
                        ? '暂不可用'
                        : `最近 ${timeline.length} 条`}
                  </Text>
                  {timelineQuery.hasNextPage ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() =>
                        router.push({
                          pathname: '/user/timeline/[username]',
                          params: { username: user.username },
                        })
                      }
                      style={({ pressed }) => [
                        styles.sectionAction,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={styles.sectionActionText}>查看全部</Text>
                      <Text style={styles.sectionActionChevron}>›</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
              <View style={styles.timelineList}>
                {timeline.length === 0 ? (
                  <SectionStatus
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
              </View>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>日志</Text>
                <View style={styles.sectionRight}>
                  <Text style={styles.sectionMeta}>
                    {sectionMeta(
                      blogsQuery.isPending,
                      blogsQuery.isError,
                      blogs.length,
                      blogsPage?.total,
                      '最近 ',
                    )}
                  </Text>
                  {blogsQuery.hasNextPage ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() =>
                        router.push({
                          pathname: '/user/blogs/[username]',
                          params: { username: user.username },
                        })
                      }
                      style={({ pressed }) => [
                        styles.sectionAction,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={styles.sectionActionText}>查看全部</Text>
                      <Text style={styles.sectionActionChevron}>›</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
              <View style={styles.blogList}>
                {blogs.length === 0 ? (
                  <SectionStatus
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
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {collectionSubjectTypeLabel}收藏
                </Text>
                <View style={styles.sectionRight}>
                  <Text style={styles.sectionMeta}>
                    {sectionMeta(
                      collectionsQuery.isPending,
                      collectionsQuery.isError,
                      collections.length,
                      collectionsPage?.total,
                    )}
                  </Text>
                  {collectionsQuery.hasNextPage ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() =>
                        router.push({
                          pathname: '/user/collections/[username]',
                          params: {
                            type: String(collectionSubjectType),
                            username: user.username,
                          },
                        })
                      }
                      style={({ pressed }) => [
                        styles.sectionAction,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={styles.sectionActionText}>查看全部</Text>
                      <Text style={styles.sectionActionChevron}>›</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
              <SubjectTypeTabs
                contentContainerStyle={styles.collectionTypeTabs}
                onChange={setCollectionSubjectType}
                selectedType={collectionSubjectType}
              />
            </>
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
    </SafeAreaView>
  );
}

function sectionMeta(
  isPending: boolean,
  isError: boolean,
  count: number,
  total?: number,
  prefix = '',
) {
  if (isPending) {
    return '读取中';
  }

  if (isError) {
    return '暂不可用';
  }

  return `${prefix}${count} / ${total ?? count}`;
}

function SectionStatus({
  emptyText,
  isError,
  isPending,
  onRetry,
}: {
  emptyText: string;
  isError: boolean;
  isPending: boolean;
  onRetry: () => void;
}) {
  if (isPending) {
    return <Text style={styles.inlineEmpty}>正在读取…</Text>;
  }

  if (isError) {
    return (
      <View style={styles.inlineStatus}>
        <Text style={styles.inlineEmpty}>这一部分暂时读取失败。</Text>
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={({ pressed }) => [
            styles.inlineRetry,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.inlineRetryText}>重试</Text>
        </Pressable>
      </View>
    );
  }

  return <Text style={styles.inlineEmpty}>{emptyText}</Text>;
}

function State({
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
        <Pressable onPress={action} style={styles.retry}>
          <Text style={styles.retryText}>重试</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: COLORS.background, flex: 1 },
  content: { gap: 10, padding: 20, paddingBottom: 44 },
  profile: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingBottom: 16,
    paddingTop: 4,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: COLORS.track,
    borderRadius: 38,
    height: 76,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 76,
  },
  avatarFallback: { color: COLORS.subtle, fontSize: 24, fontWeight: '800' },
  profileMain: { flex: 1, marginLeft: 16 },
  nickname: {
    color: COLORS.ink,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  username: { color: COLORS.subtle, fontSize: 12, marginTop: 4 },
  sign: { color: COLORS.muted, fontSize: 13, lineHeight: 19, marginTop: 8 },
  accountLink: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 40,
    paddingHorizontal: 14,
  },
  accountLinkText: { color: COLORS.accent, fontSize: 13, fontWeight: '700' },
  sectionHeader: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 4,
    paddingHorizontal: 4,
    paddingTop: 12,
  },
  sectionTitle: { color: COLORS.ink, fontSize: 19, fontWeight: '800' },
  sectionMeta: { color: COLORS.subtle, fontSize: 12 },
  sectionRight: { alignItems: 'center', flexDirection: 'row' },
  sectionAction: {
    alignItems: 'center',
    flexDirection: 'row',
    marginLeft: 10,
    paddingVertical: 4,
  },
  sectionActionText: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  sectionActionChevron: {
    color: COLORS.accent,
    fontSize: 18,
    marginLeft: 2,
  },
  friendList: { gap: 10, paddingBottom: 5 },
  timelineList: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    overflow: 'hidden',
    paddingHorizontal: 17,
  },
  inlineEmpty: {
    color: COLORS.muted,
    fontSize: 13,
    paddingHorizontal: 4,
    paddingVertical: 14,
  },
  inlineStatus: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inlineRetry: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  inlineRetryText: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  blogList: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    marginBottom: 6,
    overflow: 'hidden',
    paddingHorizontal: 17,
  },
  blogEmpty: { color: COLORS.muted, fontSize: 13, paddingVertical: 18 },
  collectionTypeTabs: { paddingBottom: 4 },
  collectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    overflow: 'hidden',
    paddingHorizontal: 10,
  },
  pressed: { opacity: 0.62 },
  empty: { alignItems: 'center', padding: 28 },
  emptyText: { color: COLORS.muted, fontSize: 14 },
  state: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 32,
  },
  stateTitle: { color: COLORS.ink, fontSize: 19, fontWeight: '800' },
  stateText: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    textAlign: 'center',
  },
  retry: {
    backgroundColor: COLORS.accentSoft,
    borderRadius: 14,
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryText: { color: COLORS.accent, fontSize: 14, fontWeight: '800' },
});
