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
import { PublicUserBlogRow } from '@/features/users/public-user-blog-row';
import { usePublicUserBlogs } from '@/features/users/use-public-user';

export default function PublicUserBlogsScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const blogsQuery = usePublicUserBlogs(username);
  const blogs = useMemo(
    () => blogsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [blogsQuery.data],
  );
  const total = blogsQuery.data?.pages[0]?.total ?? 0;

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen options={{ title: '日志' }} />
      <FlatList
        contentContainerStyle={styles.content}
        data={blogs}
        initialNumToRender={12}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          blogsQuery.isPending ? (
            <State text="正在读取公开日志。" title="日志加载中" />
          ) : blogsQuery.isError ? (
            <State
              action={() => void blogsQuery.refetch()}
              text="请检查网络后重试。"
              title="日志读取失败"
            />
          ) : (
            <State text="该用户没有公开日志。" title="暂无日志" />
          )
        }
        ListFooterComponent={
          blogs.length > 0 ? (
            <PagedListFooter
              hasNextPage={blogsQuery.hasNextPage}
              isError={blogsQuery.isFetchNextPageError}
              isFetching={blogsQuery.isFetchingNextPage}
              loadedCount={blogs.length}
              onRetry={() => void blogsQuery.fetchNextPage()}
              total={total}
            />
          ) : null
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>公开日志</Text>
            <Text style={styles.meta}>
              @{username} · {total ? `${total} 篇` : '读取中'}
            </Text>
          </View>
        }
        maxToRenderPerBatch={12}
        onEndReached={() => {
          if (
            blogsQuery.hasNextPage &&
            !blogsQuery.isFetchingNextPage &&
            !blogsQuery.isFetchNextPageError
          ) {
            void blogsQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.45}
        onRefresh={() => void blogsQuery.refetch()}
        refreshing={blogsQuery.isRefetching && !blogsQuery.isPending}
        removeClippedSubviews={Platform.OS === 'android'}
        renderItem={({ index, item }) => (
          <View
            style={[
              styles.item,
              index === 0 && styles.firstItem,
              index === blogs.length - 1 && styles.lastItem,
            ]}
          >
            <PublicUserBlogRow
              hasDivider={index > 0}
              item={item}
              onPress={() =>
                router.push({
                  pathname: '/blog/[id]',
                  params: { id: String(item.id) },
                })
              }
            />
          </View>
        )}
        showsVerticalScrollIndicator={false}
        windowSize={7}
      />
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
  header: { paddingBottom: 18, paddingHorizontal: 4, paddingTop: 18 },
  title: {
    color: COLORS.ink,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  meta: { color: COLORS.muted, fontSize: 13, marginTop: 6 },
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
  stateTitle: { color: COLORS.ink, fontSize: 18, fontWeight: '800' },
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
