import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MIN_TOUCH_SIZE, SPACING, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { CatalogStatusBanner } from '@/features/catalog/catalog-status-banner';
import { CachedDataNotice } from '@/features/shared/cached-data-notice';
import { useTheme } from '@/features/theme/theme-provider';

import { DiscussionStatus } from './discussion-status';
import { EpisodeDetailsCard } from './episode-details-card';

type QueryState = {
  hasData: boolean;
  isError: boolean;
  isFetching: boolean;
  isPending: boolean;
  refetch: () => void;
};

// 章节讨论列表的头部：章节卡片、资料状态、讨论标题，以及讨论区当前状态
// （防剧透折叠、展示缓存时的刷新失败提示，或读取中/失败）。
export function EpisodeDiscussionHeader({
  catalog,
  comments,
  details,
  discussionCount,
  fromOfflinePack,
  hiddenDiscussion,
  isTrack,
  onRevealDiscussion,
}: {
  catalog: QueryState;
  comments: QueryState;
  details: ComponentProps<typeof EpisodeDetailsCard>;
  discussionCount: number;
  fromOfflinePack: boolean;
  hiddenDiscussion: boolean;
  isTrack: boolean;
  onRevealDiscussion: () => void;
}) {
  const colors = useTheme();
  const styles = createStyles(colors);

  return (
    <>
      <EpisodeDetailsCard {...details} />
      <CatalogStatusBanner
        fromOfflinePack={fromOfflinePack}
        isError={catalog.isError}
        isPending={catalog.isPending}
        isRefreshing={catalog.isFetching && !catalog.isPending}
        onRetry={catalog.refetch}
      />
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>本{isTrack ? '曲' : '集'}讨论</Text>
        <Text style={styles.count}>Bangumi {discussionCount}</Text>
      </View>
      {hiddenDiscussion ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>讨论已折叠</Text>
          <Text style={styles.emptyText}>防剧透已开启。当前章节尚未标记已看，或观看进度未知；从通知进入也需手动展开。</Text>
          <Pressable accessibilityRole="button" onPress={onRevealDiscussion} style={styles.spoilerButton}>
            <Text style={styles.spoilerAction}>仅本次展开讨论</Text>
          </Pressable>
        </View>
      ) : comments.hasData && comments.isError ? (
        <CachedDataNotice onRetry={comments.refetch} />
      ) : (
        <DiscussionStatus
          isError={comments.isError}
          isPending={catalog.isPending || Boolean(details.episode && comments.isPending)}
          onRetry={comments.refetch}
        />
      )}
    </>
  );
}

export function EpisodeEmptyDiscussion({ isTrack }: { isTrack: boolean }) {
  const colors = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>还没有人讨论这一{isTrack ? '曲' : '集'}</Text>
      <Text style={styles.emptyText}>Bangumi 暂无本{isTrack ? '曲' : '集'}评论。</Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.xs,
  },
  sectionTitle: { color: colors.ink, ...TYPE.title, fontWeight: '800' },
  count: { color: colors.accent, ...TYPE.caption, fontWeight: '700' },
  empty: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: SPACING.xl + SPACING.xs,
  },
  emptyTitle: { color: colors.ink, ...TYPE.body, fontWeight: '700' },
  emptyText: { color: colors.muted, ...TYPE.caption, marginTop: SPACING.sm },
  spoilerButton: { minHeight: MIN_TOUCH_SIZE, justifyContent: 'center', marginTop: SPACING.md },
  spoilerAction: { ...TYPE.body, color: colors.accent },
});
