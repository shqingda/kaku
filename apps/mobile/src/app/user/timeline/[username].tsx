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
import { PublicUserTimelineRow } from '@/features/users/public-user-timeline-row';
import { usePublicUserTimeline } from '@/features/users/use-public-user';
import type { PublicTimelineItem } from '@/features/users/model';

const UserTimelineRow = memo(function UserTimelineRow({
  hasDivider,
  isFirst,
  isLast,
  item,
}: {
  hasDivider: boolean;
  isFirst: boolean;
  isLast: boolean;
  item: PublicTimelineItem;
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
      <PublicUserTimelineRow
        hasDivider={hasDivider}
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
  );
});

export default function PublicUserTimelineScreen() {
  const colors = useTheme();
  const styles = createStyles(colors);
  const { username } = useLocalSearchParams<{ username: string }>();
  const timelineQuery = usePublicUserTimeline(username);
  const timeline = usePagedList(timelineQuery);
  const renderItem = useCallback(
    ({ index, item }: { index: number; item: PublicTimelineItem }) => (
      <UserTimelineRow
        hasDivider={index > 0}
        isFirst={index === 0}
        isLast={index === timeline.items.length - 1}
        item={item}
      />
    ),
    [timeline.items.length],
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
        {...timeline.listProps}
        contentContainerStyle={styles.content}
        data={timeline.items}
        initialNumToRender={12}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          timelineQuery.fetchStatus === 'paused' ? (
            <AppState
              action={() => void timelineQuery.refetch()}
              text="恢复联网后将继续读取公开动态。"
              title="当前离线"
            />
          ) : timelineQuery.isPending ? (
            <SkeletonList
              accessibilityLabel="正在读取公开动态。"
              count={4}
              rowHeight={84}
            />
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
          timeline.items.length > 0 ? (
            <PagedListFooter {...timeline.footerProps} />
          ) : undefined
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>时间线</Text>
            <Text style={styles.subtitle}>@{username} 的公开动态</Text>
            {timeline.items.length > 0 && (timelineQuery.isError || timelineQuery.fetchStatus === 'paused') ? (
              <CachedDataNotice onRetry={() => void timelineQuery.refetch()} />
            ) : null}
          </View>
        }
        maxToRenderPerBatch={12}
        refreshControl={
          <AppRefreshControl
            onRefresh={timeline.refresh}
            refreshing={timeline.refreshing}
          />
        }
        renderItem={renderItem}
        updateCellsBatchingPeriod={40}
        windowSize={7}
      />
      <ScrollToTopButton
        onPress={timeline.scrollToTop}
        visible={timeline.visible}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  content: { paddingBottom: SPACING.xxl + SPACING.md, paddingHorizontal: SPACING.xl },
  header: {
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.xs,
    paddingTop: SPACING.xl,
  },
  title: {
    color: colors.ink,
    fontSize: TYPE.display.fontSize,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  subtitle: { color: colors.muted, fontSize: TYPE.caption.fontSize, marginTop: SPACING.sm },
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
