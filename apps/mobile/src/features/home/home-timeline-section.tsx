import { useState } from 'react';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { HIT_SLOP, MIN_TOUCH_SIZE, SPACING, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { CachedDataNotice } from '@/features/shared/cached-data-notice';
import { useTheme } from '@/features/theme/theme-provider';
import { FriendTimelineRow } from '@/features/timeline/friend-timeline-row';
import { TimelineComposer } from '@/features/timeline/timeline-composer';
import type { useFriendTimeline } from '@/features/timeline/use-friend-timeline';

// 首页的好友动态预览：最多 4 条，读取中/失败/为空都有明确状态，刷新失败时保留旧内容。
export function HomeTimelineSection({
  timelineQuery,
}: {
  timelineQuery: ReturnType<typeof useFriendTimeline>;
}) {
  const colors = useTheme();
  const styles = createStyles(colors);
  const [composerVisible, setComposerVisible] = useState(false);
  const items = timelineQuery.data?.pages[0]?.items.slice(0, 4) ?? [];

  return (
    <View style={styles.timelineSection}>
      <View style={styles.timelineHeading}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>好友动态</Text>
        <Pressable
          accessibilityLabel="发布动态"
          accessibilityRole="button"
          hitSlop={HIT_SLOP}
          onPress={() => setComposerVisible(true)}
          style={({ pressed }) => [
            styles.timelinePublishButton,
            pressed && styles.timelinePublishButtonPressed,
          ]}
        >
          <View style={styles.timelinePublishIcon}>
            <SymbolView
              name={{
                android: 'edit',
                ios: 'square.and.pencil',
                web: 'edit',
              }}
              size={16}
              tintColor={colors.ink}
              weight="semibold"
            />
          </View>
          <Text style={styles.timelinePublishText}>发布</Text>
        </Pressable>
      </View>
      <View style={styles.timelineCard}>
        {timelineQuery.isPending ? (
          <View style={styles.timelineInlineState}>
            <ActivityIndicator color={colors.accent} size="small" />
            <Text style={styles.timelineEmptyText}>正在读取好友动态</Text>
          </View>
        ) : timelineQuery.isError && items.length === 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => void timelineQuery.refetch()}
            style={({ pressed }) => [
              styles.timelineInlineState,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.timelineErrorText}>暂时没有加载出来，点此重试</Text>
          </Pressable>
        ) : items.length === 0 ? (
          <View style={styles.timelineInlineState}>
            <Text style={styles.timelineEmptyText}>还没有好友动态</Text>
          </View>
        ) : (
          <>
            {timelineQuery.isError ? (
              <View style={styles.timelineCachedNotice}>
                <CachedDataNotice onRetry={() => void timelineQuery.refetch()} />
              </View>
            ) : null}
            {items.map((item, index) => (
              <FriendTimelineRow
                hasDivider={index > 0}
                item={item}
                key={item.id}
              />
            ))}
            <Pressable
              accessibilityLabel="查看全部好友动态"
              accessibilityRole="button"
              onPress={() => router.push('/timeline')}
              style={({ pressed }) => [
                styles.timelineAllButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.timelineAllText}>查看全部动态</Text>
              <SymbolView
                name={{
                  android: 'chevron_right',
                  ios: 'chevron.right',
                  web: 'chevron_right',
                }}
                size={12}
                tintColor={colors.accent}
                weight="semibold"
              />
            </Pressable>
          </>
        )}
      </View>
      <TimelineComposer
        onClose={() => setComposerVisible(false)}
        visible={composerVisible}
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  sectionTitle: {
    color: colors.ink,
    fontSize: TYPE.title.fontSize,
    fontWeight: '800',
    letterSpacing: TYPE.title.letterSpacing,
  },
  timelineSection: { marginTop: SPACING.xxl },
  timelineHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xs,
  },
  timelineCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    marginTop: SPACING.lg,
    overflow: 'hidden',
    paddingHorizontal: SPACING.lg,
  },
  timelineCachedNotice: { marginTop: SPACING.lg },
  timelinePublishButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderCurve: 'continuous',
    borderRadius: 12,
    flexDirection: 'row',
    gap: SPACING.xs,
    minHeight: MIN_TOUCH_SIZE,
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
  },
  timelinePublishButtonPressed: { backgroundColor: colors.track },
  timelinePublishIcon: {
    alignItems: 'center',
    height: 18,
    justifyContent: 'center',
    width: 18,
  },
  timelinePublishText: {
    color: colors.ink,
    fontSize: TYPE.body.fontSize,
    fontWeight: '700',
    includeFontPadding: false,
    lineHeight: TYPE.body.lineHeight,
    textAlignVertical: 'center',
  },
  timelineAllButton: {
    alignItems: 'center',
    borderTopColor: colors.divider,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 50,
    paddingHorizontal: SPACING.xs,
  },
  timelineAllText: { color: colors.accent, fontSize: TYPE.caption.fontSize, fontWeight: '700' },
  timelineInlineState: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
    justifyContent: 'center',
    minHeight: 88,
    paddingHorizontal: SPACING.lg,
  },
  timelineEmptyText: { color: colors.muted, fontSize: TYPE.caption.fontSize },
  timelineErrorText: { color: colors.accent, fontSize: TYPE.caption.fontSize, fontWeight: '600' },
  pressed: { opacity: 0.62 },
});
