import type { ComponentProps } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { SPACING, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { prefetchChannel } from '@/features/channels/use-channel';
import { prefetchCommunity } from '@/features/community/use-community';
import { prefetchExplore, prefetchRankings } from '@/features/discover/use-discover';
import { PressableScale } from '@/features/shared/pressable-scale';
import { useTheme } from '@/features/theme/theme-provider';

// 首页「发现」入口；按下时预取目标页数据，松手跳转时通常已有内容。
export function HomeQuickActions() {
  const colors = useTheme();
  const styles = createStyles(colors);
  const queryClient = useQueryClient();

  return (
    <View style={styles.quickSection}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>发现</Text>
      <View style={styles.quickCard}>
        <QuickActionRow
          href="/explore"
          icon={{
            android: 'calendar_month',
            ios: 'calendar',
            web: 'calendar_month',
          }}
          label="综合"
          meta="频道、放送、排行榜与社区入口"
          onPressIn={() => prefetchExplore(queryClient)}
        />
        <QuickActionRow
          hasDivider
          href={{ pathname: '/channel/[type]', params: { type: 'anime' } }}
          icon={{ android: 'grid_view', ios: 'square.grid.2x2', web: 'grid_view' }}
          label="频道"
          meta="浏览动画、阅读、音乐、游戏与三次元"
          onPressIn={() => prefetchChannel(queryClient, 2)}
        />
        <QuickActionRow
          hasDivider
          href="/rankings"
          icon={{ android: 'leaderboard', ios: 'chart.bar', web: 'leaderboard' }}
          label="排行榜"
          meta="浏览动画、书籍、音乐、游戏与三次元"
          onPressIn={() => prefetchRankings(queryClient)}
        />
        <QuickActionRow
          hasDivider
          href="/community"
          icon={{
            android: 'forum',
            ios: 'bubble.left.and.bubble.right',
            web: 'forum',
          }}
          label="社区"
          meta="看看公开小组和最新话题"
          onPressIn={() => prefetchCommunity(queryClient)}
        />
      </View>
    </View>
  );
}

function QuickActionRow({
  hasDivider = false,
  href,
  icon,
  label,
  meta,
  onPressIn,
}: {
  hasDivider?: boolean;
  href: Href;
  icon: ComponentProps<typeof SymbolView>['name'];
  label: string;
  meta: string;
  onPressIn?: () => void;
}) {
  const colors = useTheme();
  const styles = createStyles(colors);

  return (
    <PressableScale
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityHint={meta}
      onPress={() => router.push(href)}
      onPressIn={onPressIn}
      style={({ pressed }) => [
        styles.quickActionRow,
        hasDivider && styles.quickDivider,
        pressed && styles.pressed,
      ]}
    >
        <View style={styles.quickIcon}>
          <SymbolView
            name={icon}
            size={19}
            tintColor={colors.accent}
            weight="medium"
          />
        </View>
        <View style={styles.quickCopy}>
          <Text style={styles.quickLabel}>{label}</Text>
          <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={styles.quickMeta}>
            {meta}
          </Text>
        </View>
        <SymbolView
          name={{
            android: 'chevron_right',
            ios: 'chevron.right',
            web: 'chevron_right',
          }}
          size={14}
          tintColor={colors.subtle}
          weight="semibold"
        />
    </PressableScale>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  sectionTitle: {
    color: colors.ink,
    fontSize: TYPE.title.fontSize,
    fontWeight: '800',
    letterSpacing: TYPE.title.letterSpacing,
  },
  quickSection: { marginTop: SPACING.xxl },
  quickCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    marginTop: SPACING.lg,
    overflow: 'hidden',
    paddingHorizontal: SPACING.lg,
  },
  quickActionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 82,
    width: '100%',
  },
  quickDivider: {
    borderTopColor: colors.divider,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  quickIcon: {
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: 12,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  quickCopy: { flex: 1, marginLeft: SPACING.md, minWidth: 0 },
  quickLabel: { color: colors.ink, fontSize: TYPE.body.fontSize, fontWeight: '800' },
  quickMeta: { color: colors.muted, fontSize: TYPE.caption.fontSize, marginTop: SPACING.xs },
  pressed: { opacity: 0.62 },
});
