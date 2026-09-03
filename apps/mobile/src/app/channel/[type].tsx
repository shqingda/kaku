import { useMemo, useState, type ComponentProps } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Link, router, Stack, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/features/theme/theme-provider';
import {
  getSubjectChannelLabel,
  getSubjectTypeFromSlug,
  getSubjectTypeSlug,
  SUBJECT_TYPES,
} from '@/features/catalog/subject-types';
import { SubjectTypeTabs } from '@/features/catalog/subject-type-tabs';
import type { ChannelSubject } from '@/features/channels/model';
import type { DiscoverSubject } from '@/features/discover/model';
import { usePrefetchSubject } from '@/features/catalog/use-catalog-subject';
import { useChannel } from '@/features/channels/use-channel';
import {
  prefetchCalendar,
  prefetchRankings,
} from '@/features/discover/use-discover';
import { RankedSubjectRow } from '@/features/discover/ranked-subject-row';
import { useBangumiRankedSubjects } from '@/features/discover/use-discover';
import { AppRefreshControl } from '@/features/shared/app-refresh-control';
import { AppState } from '@/features/shared/app-state';
import { CachedDataNotice } from '@/features/shared/cached-data-notice';
import { SectionAction } from '@/features/shared/section-action';
import { readInfiniteItems, readQueryItems } from '@/lib/query-data';

function useThemedStyles() {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return { colors, styles };
}

export default function ChannelScreen() {
  const { styles } = useThemedStyles();
  const queryClient = useQueryClient();
  const { type } = useLocalSearchParams<{ type?: string }>();
  const [subjectType, setSubjectType] = useState<number>(() => getSubjectTypeFromSlug(type));
  const label = getSubjectChannelLabel(subjectType);
  const channelQuery = useChannel(subjectType);
  const rankingQuery = useBangumiRankedSubjects(subjectType);
  const channelItems = readQueryItems<ChannelSubject>(channelQuery.data);
  const ranked = readInfiniteItems<DiscoverSubject>(rankingQuery.data).slice(
    0,
    6,
  );

  function refreshChannel() {
    void Promise.all([channelQuery.refetch(), rankingQuery.refetch()]);
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen options={{ title: `${label}频道` }} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <AppRefreshControl
            onRefresh={refreshChannel}
            refreshing={
              (channelQuery.isRefetching || rankingQuery.isRefetching) &&
              !channelQuery.isPending &&
              !rankingQuery.isPending
            }
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>KAKU CHANNEL</Text>
          <Text style={styles.title}>{label}频道</Text>
          <Text style={styles.subtitle}>最近关注、口碑作品与常用入口</Text>
        </View>
        <SubjectTypeTabs
          contentContainerStyle={styles.typeTabs}
          onChange={setSubjectType}
          selectedType={subjectType}
          types={SUBJECT_TYPES}
        />

        <SectionHeading
          meta="根据最近 30 日关注"
          title="近期热门"
        />
        {channelQuery.data && channelQuery.isError ? (
          <CachedDataNotice onRetry={() => void channelQuery.refetch()} />
        ) : null}
        {channelQuery.isPending && !channelQuery.data ? (
          <View style={styles.stateSlot}>
            <AppState title="正在读取热门条目" text={`${label}频道加载中。`} />
          </View>
        ) : channelQuery.isError && !channelQuery.data ? (
          <View style={styles.stateSlot}>
            <AppState
              action={() => void channelQuery.refetch()}
              actionAccessibilityLabel="重试热门条目读取失败"
              title="热门条目读取失败"
              text="Bangumi 偶尔会响应较慢，稍后重试即可。"
            />
          </View>
        ) : channelItems.length > 0 ? (
          <ScrollView
            contentContainerStyle={styles.hotList}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {channelItems.map((item) => (
              <ChannelCard item={item} key={item.id} />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.stateSlot}>
            <AppState title="暂无热门条目" text="稍后刷新，或先去分类浏览看看。" />
          </View>
        )}

        <SectionHeading meta="快速前往常用功能" title="继续探索" />
        <View style={styles.actions}>
          <ChannelAction
            compact={subjectType === 2}
            icon={{ android: 'leaderboard', ios: 'chart.bar', web: 'leaderboard' }}
            label="排行榜"
            onPress={() =>
              router.push({
                pathname: '/rankings',
                params: { type: String(subjectType) },
              })
            }
            onPressIn={() => prefetchRankings(queryClient, subjectType)}
          />
          <ChannelAction
            compact={subjectType === 2}
            icon={{ android: 'filter_alt', ios: 'line.3.horizontal.decrease', web: 'filter_alt' }}
            label="分类浏览"
            onPress={() =>
              router.push({
                pathname: '/browse',
                params: { type: getSubjectTypeSlug(subjectType) },
              })
            }
          />
          {subjectType === 2 ? (
            <ChannelAction
              compact
              icon={{ android: 'calendar_month', ios: 'calendar', web: 'calendar_month' }}
              label="每日放送"
              onPress={() => router.push('/calendar')}
              onPressIn={() => prefetchCalendar(queryClient)}
            />
          ) : null}
        </View>

        <View style={styles.rankingHeading}>
          <SectionHeading meta="Bangumi 综合排名" title="高分精选" />
          <SectionAction
            accessibilityHint="打开完整排行榜"
            label="全部"
            onPress={() =>
              router.push({
                pathname: '/rankings',
                params: { type: String(subjectType) },
              })
            }
            onPressIn={() => prefetchRankings(queryClient, subjectType)}
            style={styles.allAction}
          />
        </View>
        {rankingQuery.data && rankingQuery.isError ? (
          <CachedDataNotice onRetry={() => void rankingQuery.refetch()} />
        ) : null}
        {rankingQuery.isPending && !rankingQuery.data ? (
          <View style={styles.stateSlot}>
            <AppState title="正在读取高分条目" text="排行榜加载中。" />
          </View>
        ) : rankingQuery.isError && !rankingQuery.data ? (
          <View style={styles.stateSlot}>
            <AppState
              action={() => void rankingQuery.refetch()}
              actionAccessibilityLabel="重试高分条目读取失败"
              title="高分条目读取失败"
              text="已经显示的热门内容不会受影响。"
            />
          </View>
        ) : ranked.length > 0 ? (
          <View style={styles.rankingList}>
            {ranked.map((item, index) => (
              <RankedSubjectRow
                hasDivider={index > 0}
                item={item}
                key={item.id}
                onPress={() =>
                  router.push({
                    pathname: '/subject/[id]',
                    params: { id: String(item.id) },
                  })
                }
                position={index + 1}
              />
            ))}
          </View>
        ) : (
          <View style={styles.stateSlot}>
            <AppState title="暂无排行数据" text="稍后刷新即可继续查看。" />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ChannelCard({ item }: { item: ChannelSubject }) {
  const { styles } = useThemedStyles();
  const prefetchSubject = usePrefetchSubject();

  return (
    <View style={styles.hotCard}>
      <Link
        asChild
        href={{ pathname: '/subject/[id]', params: { id: String(item.id) } }}
      >
        <Pressable
          accessibilityHint="进入条目详情"
          accessibilityLabel={`打开${item.title}`}
          accessibilityRole="button"
          onPressIn={() => prefetchSubject.prefetch(item.id)}
          onPressOut={prefetchSubject.cancel}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Link.AppleZoom>
            <View style={styles.cover}>
              <Text style={styles.coverFallback}>{item.title.slice(0, 1)}</Text>
              {item.coverUrl ? (
                <Image
                  contentFit="cover"
                  recyclingKey={item.coverUrl}
                  source={item.coverUrl}
                  style={StyleSheet.absoluteFill}
                  transition={120}
                />
              ) : null}
            </View>
          </Link.AppleZoom>
          <Text maxFontSizeMultiplier={1.35} numberOfLines={2} style={styles.cardTitle}>{item.title}</Text>
          <Text numberOfLines={1} style={styles.cardMeta}>
            {item.attentionCount !== undefined
              ? `${item.attentionCount} 人关注`
              : item.score
                ? `${item.score.toFixed(1)} 分`
                : '近期热门'}
          </Text>
        </Pressable>
      </Link>
    </View>
  );
}

function ChannelAction({ compact = false, icon, label, onPress, onPressIn }: {
  compact?: boolean;
  icon: ComponentProps<typeof SymbolView>['name'];
  label: string;
  onPress: () => void;
  onPressIn?: () => void;
}) {
  const { colors, styles } = useThemedStyles();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      onPressIn={onPressIn}
      style={({ pressed }) => [
        styles.action,
        compact && styles.actionCompact,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.actionIcon}>
        <SymbolView name={icon} size={18} tintColor={colors.accent} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

function SectionHeading({ meta, title }: { meta: string; title: string }) {
  const { styles } = useThemedStyles();

  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionMeta}>{meta}</Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  content: { paddingBottom: 52, paddingHorizontal: 20 },
  hero: { paddingHorizontal: 4, paddingTop: 24 },
  eyebrow: { color: colors.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.1 },
  title: { color: colors.ink, fontSize: 34, fontWeight: '800', letterSpacing: -1, marginTop: 7 },
  subtitle: { color: colors.muted, fontSize: 14, marginTop: 8 },
  typeTabs: { paddingBottom: 2, paddingTop: 22 },
  sectionHeading: { paddingHorizontal: 4, paddingTop: 30 },
  sectionTitle: { color: colors.ink, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  sectionMeta: { color: colors.muted, fontSize: 12, marginTop: 5 },
  hotList: { gap: 14, paddingRight: 20, paddingTop: 16 },
  hotCard: { width: 126 },
  cover: {
    alignItems: 'center',
    backgroundColor: colors.track,
    borderRadius: 18,
    height: 175,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 126,
  },
  coverFallback: { color: colors.subtle, fontSize: 20, fontWeight: '700' },
  cardTitle: { color: colors.ink, fontSize: 14, fontWeight: '700', lineHeight: 19, marginTop: 9, minHeight: 40 },
  cardMeta: { color: colors.subtle, fontSize: 11, marginTop: 4 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingTop: 16 },
  action: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 18,
    flexBasis: '47%',
    flexGrow: 1,
    paddingHorizontal: 8,
    paddingVertical: 16,
  },
  actionCompact: { flexBasis: '30%' },
  actionIcon: {
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: 13,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  actionLabel: { color: colors.ink, fontSize: 13, fontWeight: '700', marginTop: 9 },
  rankingHeading: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between' },
  allAction: { paddingHorizontal: 4 },
  rankingList: { backgroundColor: colors.surface, borderRadius: 22, marginTop: 16, overflow: 'hidden', paddingHorizontal: 16 },
  stateSlot: { marginTop: 16 },
  pressed: { opacity: 0.62 },
});
