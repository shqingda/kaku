import { Image } from 'expo-image';
import { Link, router } from 'expo-router';
import { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { usePrefetchSubject } from '@/features/catalog/use-catalog-subject';
import { SubjectTypeTabs } from '@/features/catalog/subject-type-tabs';
import { getCollectionStatusLabel, supportsWatchProgress } from '@/features/catalog/subject-types';
import { CachedDataNotice } from '@/features/shared/cached-data-notice';
import { SectionAction } from '@/features/shared/section-action';
import { SkeletonBox } from '@/features/shared/skeleton';
import { useTheme } from '@/features/theme/theme-provider';
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
  const styles = useMemo(() => createStyles(colors), [colors]);

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
        <View style={styles.skeletonRow}>
          {[0, 1, 2].map((index) => (
            <View key={index} style={styles.skeletonCard}>
              <SkeletonBox borderRadius={14} height={146} width="100%" />
              <SkeletonBox height={13} width="88%" />
              <SkeletonBox height={11} width="55%" />
            </View>
          ))}
        </View>
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
        <>
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
        </>
      )}
    </View>
  );
}

function MediaCard({ item }: { item: PublicUserCollection }) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
        <Pressable
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
            maxFontSizeMultiplier={1.2}
            numberOfLines={2}
            style={styles.cardTitle}
          >
            {item.title}
          </Text>
          <Text numberOfLines={1} style={styles.cardMeta}>
            {progress}
          </Text>
        </Pressable>
      </Link>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  section: { marginTop: 12 },
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: 4,
  },
  headingCopy: { alignItems: 'baseline', flexDirection: 'row', gap: 8 },
  title: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.35,
  },
  count: { color: colors.subtle, fontSize: 12, fontWeight: '700' },
  typeTabs: { paddingBottom: 2, paddingTop: 4 },
  cachedNotice: { marginTop: 10 },
  list: { gap: 13, paddingRight: 4, paddingTop: 10 },
  skeletonRow: {
    flexDirection: 'row',
    gap: 13,
    marginTop: 10,
    paddingRight: 4,
  },
  skeletonCard: {
    alignItems: 'flex-start',
    flex: 1,
    gap: 9,
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
  coverFallback: { color: colors.subtle, fontSize: 16, fontWeight: '700' },
  cardTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '700',
    height: 36,
    lineHeight: 18,
    marginTop: 9,
  },
  cardMeta: { color: colors.muted, fontSize: 11, marginTop: 5 },
  state: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 9,
    justifyContent: 'center',
    marginTop: 10,
    minHeight: 76,
    paddingHorizontal: 18,
  },
  stateText: { color: colors.muted, fontSize: 13 },
  errorText: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  pressed: { opacity: 0.62 },
});
