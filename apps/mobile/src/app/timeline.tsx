import { memo, useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/constants/theme';
import { AppRefreshControl } from '@/features/shared/app-refresh-control';
import { AppState } from '@/features/shared/app-state';
import { PagedListFooter } from '@/features/shared/paged-list-footer';
import { ScrollToTopButton } from '@/features/shared/scroll-to-top-button';
import { usePagedList } from '@/features/shared/use-paged-list';
import { useTheme } from '@/features/theme/theme-provider';
import { FriendTimelineRow } from '@/features/timeline/friend-timeline-row';
import { TimelineComposer } from '@/features/timeline/timeline-composer';
import { useFriendTimeline } from '@/features/timeline/use-friend-timeline';
import type { FriendTimelineItem } from '@/features/timeline/model';

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
  const styles = useMemo(() => createStyles(colors), [colors]);
  const timelineQuery = useFriendTimeline();
  const timeline = usePagedList(timelineQuery);
  const [composerVisible, setComposerVisible] = useState(false);
  const renderItem = useCallback(
    ({ index, item }: { index: number; item: FriendTimelineItem }) => (
      <TimelineRow hasDivider={index > 0} item={item} />
    ),
    [],
  );

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen options={{ title: '好友动态' }} />
      <FlatList
        {...timeline.listProps}
        contentContainerStyle={styles.content}
        data={timeline.items}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          timelineQuery.isPending ? (
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
          ) : null
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
          hitSlop={8}
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
  content: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    margin: 20,
    overflow: 'hidden',
    paddingHorizontal: 18,
    paddingBottom: 8,
  },
  publishFabLayer: {
    alignItems: 'center',
    bottom: 28,
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: 15,
  },
  publishFab: {
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderCurve: 'continuous',
    borderRadius: 999,
    elevation: Platform.OS === 'android' ? 8 : 0,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 18,
    shadowColor: '#000000',
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  publishFabText: { color: colors.surface, fontSize: 13, fontWeight: '700' },
  pressed: { opacity: 0.62 },
});
