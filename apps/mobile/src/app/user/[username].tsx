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
import { PublicUserBlogRow } from '@/features/users/public-user-blog-row';
import { PublicUserCollectionRow } from '@/features/users/public-user-collection-row';
import { PublicUserFriendCard } from '@/features/users/public-user-friend-card';
import { usePublicUser } from '@/features/users/use-public-user';
import { formatActivityTime } from '@/lib/format-activity-time';

export default function PublicUserScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const userQuery = usePublicUser(username);
  const user = userQuery.data;

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen options={{ title: user?.nickname ?? '用户主页' }} />
      {userQuery.isPending ? (
        <State text="正在读取公开资料和收藏。" title="加载中" />
      ) : userQuery.isError || !user ? (
        <State
          action={() => void userQuery.refetch()}
          text="用户可能不存在，或网络暂时不可用。"
          title="用户资料读取失败"
        />
      ) : (
        <FlatList
          contentContainerStyle={styles.content}
          data={user.collections}
          keyExtractor={(item) => String(item.id)}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>该用户没有公开动画收藏。</Text>
            </View>
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
                </View>
              </View>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>好友</Text>
                <View style={styles.sectionRight}>
                  <Text style={styles.sectionMeta}>
                    {user.friends.length} / {user.friendTotal}
                  </Text>
                  {user.friendTotal > user.friends.length ? (
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
              {user.friends.length > 0 ? (
                <ScrollView
                  contentContainerStyle={styles.friendList}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                >
                  {user.friends.map((friend) => (
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
                <Text style={styles.inlineEmpty}>暂无公开好友。</Text>
              )}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>时间线</Text>
                <Text style={styles.sectionMeta}>最近公开动态</Text>
              </View>
              <View style={styles.timelineList}>
                {user.timeline.length === 0 ? (
                  <Text style={styles.inlineEmpty}>暂无公开动态。</Text>
                ) : null}
                {user.timeline.map((item, index) => (
                  <Pressable
                    accessibilityRole={
                      item.subjectId ? 'button' : undefined
                    }
                    disabled={!item.subjectId}
                    key={item.id}
                    onPress={() => {
                      if (item.subjectId) {
                        router.push({
                          pathname: '/subject/[id]',
                          params: { id: String(item.subjectId) },
                        });
                      }
                    }}
                    style={({ pressed }) => [
                      styles.timelineRow,
                      index > 0 && styles.blogBorder,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.timelineText}>{item.text}</Text>
                    <Text style={styles.blogMeta}>
                      {formatActivityTime(item.createdAt)}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>日志</Text>
                <View style={styles.sectionRight}>
                  <Text style={styles.sectionMeta}>
                    最近 {user.blogs.length} / {user.blogTotal}
                  </Text>
                  {user.blogTotal > user.blogs.length ? (
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
                {user.blogs.length === 0 ? (
                  <Text style={styles.blogEmpty}>暂无公开日志。</Text>
                ) : null}
                {user.blogs.map((blog, index) => (
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
                <Text style={styles.sectionTitle}>动画收藏</Text>
                <View style={styles.sectionRight}>
                  <Text style={styles.sectionMeta}>
                    {user.collections.length} / {user.collectionTotal}
                  </Text>
                  {user.collectionTotal > user.collections.length ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() =>
                        router.push({
                          pathname: '/user/collections/[username]',
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
  timelineRow: { paddingVertical: 14 },
  timelineText: { color: COLORS.ink, fontSize: 14, lineHeight: 20 },
  inlineEmpty: {
    color: COLORS.muted,
    fontSize: 13,
    paddingHorizontal: 4,
    paddingVertical: 14,
  },
  blogList: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    marginBottom: 6,
    overflow: 'hidden',
    paddingHorizontal: 17,
  },
  blogBorder: {
    borderTopColor: COLORS.track,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  blogMeta: { color: COLORS.subtle, fontSize: 11, marginTop: 8 },
  blogEmpty: { color: COLORS.muted, fontSize: 13, paddingVertical: 18 },
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
