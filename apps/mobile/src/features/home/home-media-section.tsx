import { Image } from 'expo-image';
import { Link, router } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { MIN_TOUCH_SIZE, SPACING, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { usePrefetchSubject } from '@/features/catalog/use-catalog-subject';
import { SubjectTypeTabs } from '@/features/catalog/subject-type-tabs';
import { getCollectionStatusLabel, supportsWatchProgress } from '@/features/catalog/subject-types';
import { CachedDataNotice } from '@/features/shared/cached-data-notice';
import { PressableScale } from '@/features/shared/pressable-scale';
import { SectionAction } from '@/features/shared/section-action';
import { SkeletonBox } from '@/features/shared/skeleton';
import { useTheme } from '@/features/theme/theme-provider';
import { useReduceMotion } from '@/lib/use-reduce-motion';
import type { PublicUserCollection } from '@/features/users/model';

const HOME_TRACKING_TYPES = [
  { id: 2, label: '动画' },
  { id: 1, label: '书籍' },
  { id: 3, label: '音乐' },
  { id: 4, label: '游戏' },
  { id: 6, label: '三次元' },
] as const;

export function HomeMediaSection({
  error,
  items,
  loading,
  onRetry,
  onSubjectTypeChange,
  onSubjectTypePressIn,
  subjectType,
  title,
  total,
  username,
}: {
  error: boolean;
  items: PublicUserCollection[];
  loading: boolean;
  onRetry: () => void;
  onSubjectTypeChange: (subjectType: number) => void;
  onSubjectTypePressIn?: (subjectType: number) => void;
  subjectType: number;
  title: string;
  total: number;
  username: string;
}) {
  const colors = useTheme();
  const styles = createStyles(colors);
  const reduceMotion = useReduceMotion();
  // 收藏 tab 切换时骨架与内容都是淡入（opacity-only），替换不再突兀；
  // reduce-motion 时直接出现。
  const contentEntering = reduceMotion ? undefined : FadeIn.duration(140);

  function openAll() {
    router.push({
      pathname: '/user/collections/[username]',
      params: {
        status: 'doing',
        type: String(subjectType),
        username,
      },
    });
  }

  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <View style={styles.headingCopy}>
          <Text accessibilityRole="header" style={styles.title}>{title}</Text>
          {!loading && !error && total > 0 ? (
            <Text style={styles.count}>{total}</Text>
          ) : null}
        </View>
        {total > 0 ? (
          <SectionAction
            accessibilityHint="打开完整收藏列表"
            accessibilityLabel={`查看全部${title}`}
            color={colors.muted}
            label="全部"
            onPress={openAll}
          />
        ) : null}
      </View>

      <SubjectTypeTabs
        contentContainerStyle={styles.typeTabs}
        onChange={onSubjectTypeChange}
        onPressIn={onSubjectTypePressIn}
        selectedType={subjectType}
        types={HOME_TRACKING_TYPES}
      />

      {loading ? (
        // 与封面卡同构的骨架：3 张弹性宽度卡（约等于真实卡片的 104pt），
        // 数据到达时不跳版。
        <Animated.View entering={contentEntering} style={styles.skeletonRow}>
          {[0, 1, 2].map((index) => (
            <View key={index} style={styles.skeletonCard}>
              <SkeletonBox borderRadius={14} height={146} width="100%" />
              <SkeletonBox height={13} width="88%" />
              <SkeletonBox height={11} width="55%" />
            </View>
          ))}
        </Animated.View>
      ) : error && items.length === 0 ? (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={({ pressed }) => [styles.state, pressed && styles.pressed]}
        >
          <Text style={styles.errorText}>暂时没有加载出来，点此重试</Text>
        </Pressable>
      ) : items.length === 0 ? (
        <View style={styles.state}>
          <Text style={styles.stateText}>这里还没有条目</Text>
        </View>
      ) : (
        <Animated.View entering={contentEntering}>
          {error ? (
            <View style={styles.cachedNotice}>
              <CachedDataNotice onRetry={onRetry} />
            </View>
          ) : null}
          <ScrollView
            accessibilityLabel={title}
            contentContainerStyle={styles.list}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {items.map((item) => (
              <MediaCard item={item} key={item.id} />
            ))}
          </ScrollView>
        </Animated.View>
      )}
    </View>
  );
}

function MediaCard({ item }: { item: PublicUserCollection }) {
  const colors = useTheme();
  const styles = createStyles(colors);
  const prefetchSubject = usePrefetchSubject();
  const progress =
    supportsWatchProgress(item.subjectType) && item.totalEpisodes > 0
      ? `${item.progress}/${item.totalEpisodes} 集`
      : getCollectionStatusLabel(item.subjectType, 'doing');

  return (
    <View style={styles.card}>
      <Link
        asChild
        href={{
          pathname: '/subject/[id]',
          params: { id: String(item.id) },
        }}
      >
        <PressableScale
          accessibilityLabel={`打开${item.title}`}
          accessibilityRole="button"
          accessibilityHint="进入条目详情"
          onPressIn={() => prefetchSubject.prefetch(item.id)}
          onPressOut={prefetchSubject.cancel}
          style={({ pressed }) => [
            styles.cardButton,
            pressed && styles.pressed,
          ]}
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
          <Text
            ellipsizeMode="tail"
            numberOfLines={2}
            style={styles.cardTitle}
          >
            {item.title}
          </Text>
          <Text style={styles.cardMeta}>
            {progress}
          </Text>
        </PressableScale>
      </Link>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  section: { marginTop: SPACING.md },
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: MIN_TOUCH_SIZE,
    paddingHorizontal: SPACING.xs,
  },
  headingCopy: { flex: 1, flexWrap: 'wrap', alignItems: 'baseline', flexDirection: 'row', gap: SPACING.sm },
  title: {
    flexShrink: 1,
    color: colors.ink,
    fontSize: TYPE.title.fontSize,
    fontWeight: '800',
    letterSpacing: TYPE.title.letterSpacing,
  },
  count: { color: colors.subtle, fontSize: TYPE.caption.fontSize, fontWeight: '700' },
  typeTabs: { paddingBottom: SPACING.xs, paddingTop: SPACING.xs },
  cachedNotice: { marginTop: SPACING.md },
  list: { gap: SPACING.md, paddingRight: SPACING.xs, paddingTop: SPACING.md },
  skeletonRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.md,
    paddingRight: SPACING.xs,
  },
  skeletonCard: {
    alignItems: 'flex-start',
    flex: 1,
    gap: SPACING.sm,
  },
  card: { width: 104 },
  cardButton: { width: '100%' },
  cover: {
    alignItems: 'center',
    backgroundColor: colors.track,
    borderRadius: 14,
    height: 146,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 104,
  },
  coverFallback: { color: colors.subtle, fontSize: TYPE.heading.fontSize, fontWeight: '700' },
  cardTitle: {
    color: colors.ink,
    fontSize: TYPE.caption.fontSize,
    fontWeight: '700',
    minHeight: TYPE.caption.lineHeight * 2,
    lineHeight: TYPE.caption.lineHeight,
    marginTop: SPACING.sm,
  },
  cardMeta: { color: colors.muted, fontSize: TYPE.micro.fontSize, marginTop: SPACING.xs },
  state: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 18,
    flexDirection: 'row',
    gap: SPACING.sm,
    justifyContent: 'center',
    marginTop: SPACING.md,
    minHeight: 76,
    paddingHorizontal: SPACING.lg,
  },
  stateText: { color: colors.muted, fontSize: TYPE.caption.fontSize },
  errorText: { color: colors.accent, fontSize: TYPE.caption.fontSize, fontWeight: '600' },
  pressed: { opacity: 0.62 },
});
