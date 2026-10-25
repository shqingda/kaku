import { SPACING, TYPE } from '@/constants/design';
import { memo, useCallback } from 'react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/constants/theme';
import { AppRefreshControl } from '@/features/shared/app-refresh-control';
import { AppState } from '@/features/shared/app-state';
import { SkeletonList } from '@/features/shared/skeleton-list';
import { CachedDataNotice } from '@/features/shared/cached-data-notice';
import { PagedListFooter } from '@/features/shared/paged-list-footer';
import { ScrollToTopButton } from '@/features/shared/scroll-to-top-button';
import { usePagedList } from '@/features/shared/use-paged-list';
import { useTheme } from '@/features/theme/theme-provider';
import { PublicUserBlogRow } from '@/features/users/public-user-blog-row';
import { usePublicUserBlogs } from '@/features/users/use-public-user';
import type { PublicUserBlog } from '@/features/users/model';

const UserBlogRow = memo(function UserBlogRow({
  hasDivider,
  isFirst,
  isLast,
  item,
  onPressItem,
}: {
  hasDivider: boolean;
  isFirst: boolean;
  isLast: boolean;
  item: PublicUserBlog;
  onPressItem: (id: number) => void;
}) {
  const colors = useTheme();
  const styles = createStyles(colors);

  return (
    <View
      style={[
        styles.item,
        isFirst && styles.firstItem,
        isLast && styles.lastItem,
      ]}
    >
      <PublicUserBlogRow
        hasDivider={hasDivider}
        item={item}
        onPress={() => onPressItem(item.id)}
      />
    </View>
  );
});

export default function PublicUserBlogsScreen() {
  const colors = useTheme();
  const styles = createStyles(colors);
  const { username } = useLocalSearchParams<{ username: string }>();
  const blogsQuery = usePublicUserBlogs(username);
  const blogs = usePagedList(blogsQuery);
  const total = blogs.total ?? 0;
  const openBlog = useCallback((id: number) => {
    router.push({
      pathname: '/blog/[id]',
      params: { id: String(id) },
    });
  }, []);
  const renderItem = useCallback(
    ({ index, item }: { index: number; item: PublicUserBlog }) => (
      <UserBlogRow
        hasDivider={index > 0}
        isFirst={index === 0}
        isLast={index === blogs.items.length - 1}
        item={item}
        onPressItem={openBlog}
      />
    ),
    [blogs.items.length, openBlog],
  );

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen options={{ title: '日志' }} />
      <FlatList
        {...blogs.listProps}
        contentContainerStyle={styles.content}
        data={blogs.items}
        initialNumToRender={12}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          blogsQuery.fetchStatus === 'paused' ? (
            <AppState
              action={() => void blogsQuery.refetch()}
              text="恢复联网后将继续读取公开日志。"
              title="当前离线"
            />
          ) : blogsQuery.isPending ? (
            <SkeletonList
              accessibilityLabel="正在读取公开日志。"
              count={4}
              rowHeight={96}
            />
          ) : blogsQuery.isError ? (
            <AppState
              action={() => void blogsQuery.refetch()}
              text="请检查网络后重试。"
              title="日志读取失败"
            />
          ) : (
            <AppState text="该用户没有公开日志。" title="暂无日志" />
          )
        }
        ListFooterComponent={
          blogs.items.length > 0 ? (
            <PagedListFooter {...blogs.footerProps} />
          ) : undefined
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>公开日志</Text>
            <Text style={styles.meta}>
              @{username} · {total ? `${total} 篇` : '读取中'}
            </Text>
            {blogs.items.length > 0 && (blogsQuery.isError || blogsQuery.fetchStatus === 'paused') ? (
              <CachedDataNotice onRetry={() => void blogsQuery.refetch()} />
            ) : null}
          </View>
        }
        maxToRenderPerBatch={12}
        refreshControl={
          <AppRefreshControl
            onRefresh={blogs.refresh}
            refreshing={blogs.refreshing}
          />
        }
        renderItem={renderItem}
        windowSize={7}
      />
      <ScrollToTopButton
        onPress={blogs.scrollToTop}
        visible={blogs.visible}
      />
    </SafeAreaView>
  );
}


const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  content: { paddingBottom: SPACING.xxl + SPACING.md, paddingHorizontal: SPACING.xl },
  header: { paddingBottom: SPACING.lg, paddingHorizontal: SPACING.xs, paddingTop: SPACING.lg },
  title: {
    color: colors.ink,
    fontSize: TYPE.display.fontSize,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  meta: { color: colors.muted, fontSize: TYPE.caption.fontSize, marginTop: SPACING.sm },
  item: {
    backgroundColor: colors.surface,
    overflow: 'hidden',
    paddingHorizontal: SPACING.lg,
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
