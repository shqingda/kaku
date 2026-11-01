import { memo, useCallback, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HIT_SLOP, MIN_TOUCH_SIZE, SPACING, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-provider';
import { AppRefreshControl } from '@/features/shared/app-refresh-control';
import { AppState } from '@/features/shared/app-state';
import { CachedDataNotice } from '@/features/shared/cached-data-notice';
import { PagedListFooter } from '@/features/shared/paged-list-footer';
import { ScrollToTopButton } from '@/features/shared/scroll-to-top-button';
import { usePagedList } from '@/features/shared/use-paged-list';
import { useTheme } from '@/features/theme/theme-provider';
import { FriendTimelineRow } from '@/features/timeline/friend-timeline-row';
import { TimelineComposer } from '@/features/timeline/timeline-composer';
import { useFriendTimeline } from '@/features/timeline/use-friend-timeline';
import type { FriendTimelineItem } from '@/features/timeline/model';
import { rememberReturnTo } from '@/lib/auth-redirect';

const TimelineRow = memo(function TimelineRow({
  hasDivider,
  item,
}: {
  hasDivider: boolean;
  item: FriendTimelineItem;
}) {
  return <FriendTimelineRow hasDivider={hasDivider} item={item} />;
});

export default function FriendTimelineScreen() {
  const colors = useTheme();
  const styles = createStyles(colors);
  const { isLoading: isAuthLoading, session } = useAuth();
  const timelineQuery = useFriendTimeline();
  const timeline = usePagedList(timelineQuery);
  const [composerVisible, setComposerVisible] = useState(false);
  const renderItem = useCallback(
    ({ index, item }: { index: number; item: FriendTimelineItem }) => (
      <TimelineRow hasDivider={index > 0} item={item} />
    ),
    [],
  );

  if (isAuthLoading || !session) {
    return (
      <SafeAreaView edges={['bottom']} style={styles.screen}>
        <Stack.Screen options={{ title: '好友动态' }} />
        <View style={styles.accountState}>
          {isAuthLoading ? (
            <AppState title="正在读取登录状态" text="确认登录状态后即可读取好友动态。" />
          ) : (
            <AppState
              action={() => {
                rememberReturnTo('/timeline');
                router.push('/account');
              }}
              actionLabel="去登录"
              title="登录后查看好友动态"
              text="登录后即可查看好友的最新活动。"
            />
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen options={{ title: '好友动态' }} />
      <FlatList
        {...timeline.listProps}
        contentContainerStyle={styles.content}
        data={timeline.items}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          timelineQuery.fetchStatus === 'paused' ? (
            <AppState
              action={() => void timelineQuery.refetch()}
              actionAccessibilityLabel="重试加载好友动态"
              text="恢复连接后可继续读取好友动态。"
              title="当前离线"
            />
          ) : timelineQuery.isPending ? (
            <AppState
              actionAccessibilityLabel="重试加载好友动态"
              text="新的好友活动会显示在这里。"
              title="正在读取好友动态"
            />
          ) : timelineQuery.isError ? (
            <AppState
              action={() => void timelineQuery.refetch()}
              actionAccessibilityLabel="重试加载好友动态"
              text="Bangumi 偶尔会响应较慢，稍后重试即可。"
              title="好友动态读取失败"
            />
          ) : (
            <AppState
              text="新的好友活动会显示在这里。"
              title="还没有好友动态"
            />
          )
        }
        ListFooterComponent={
          timeline.items.length > 0 ? (
            <PagedListFooter {...timeline.footerProps} />
          ) : undefined
        }
        ListHeaderComponent={
          timeline.items.length > 0 && (timelineQuery.isError || timelineQuery.fetchStatus === 'paused') ? (
            <CachedDataNotice onRetry={() => void timelineQuery.refetch()} />
          ) : undefined
        }
        refreshControl={
          <AppRefreshControl
            onRefresh={timeline.refresh}
            refreshing={timeline.refreshing}
          />
        }
        renderItem={renderItem}
      />
      <ScrollToTopButton
        onPress={timeline.scrollToTop}
        visible={timeline.visible}
      />
      <TimelineComposer
        onClose={() => setComposerVisible(false)}
        visible={composerVisible}
      />
      <View style={styles.publishFabLayer} pointerEvents="box-none">
        <Pressable
          accessibilityLabel="发布动态"
          accessibilityRole="button"
          hitSlop={HIT_SLOP}
          onPress={() => setComposerVisible(true)}
          style={({ pressed }) => [
            styles.publishFab,
            pressed && styles.pressed,
          ]}
        >
          <SymbolView
            name={{ android: 'edit', ios: 'square.and.pencil', web: 'edit' }}
            size={16}
            tintColor={colors.surface}
            weight="semibold"
          />
          <Text style={styles.publishFabText}>发布动态</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  accountState: { padding: SPACING.xl },
  content: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    margin: SPACING.xl,
    overflow: 'hidden',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  publishFabLayer: {
    alignItems: 'center',
    bottom: SPACING.xl + SPACING.xs,
    left: SPACING.none,
    position: 'absolute',
    right: SPACING.none,
    zIndex: 15,
  },
  publishFab: {
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderCurve: 'continuous',
    borderRadius: 999,
    elevation: Platform.OS === 'android' ? 8 : 0,
    flexDirection: 'row',
    gap: SPACING.sm,
    justifyContent: 'center',
    minHeight: MIN_TOUCH_SIZE,
    paddingHorizontal: SPACING.lg,
    shadowColor: '#000000',
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  publishFabText: { color: colors.surface, ...TYPE.caption, fontWeight: '700' },
  pressed: { opacity: 0.62 },
});
