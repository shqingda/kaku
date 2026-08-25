import { useMemo } from 'react';
import { router } from 'expo-router';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-provider';
import { buildCollectionOverview } from '@/features/collections/collection-overview-model';
import { AppState } from '@/features/shared/app-state';
import { useTheme } from '@/features/theme/theme-provider';
import { usePublicUserCollections } from '@/features/users/use-public-user';

const COLLECTION_TYPES = [2, 1, 3, 4, 6] as const;

export default function CollectionOverviewScreen() {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { isLoading: isAuthLoading, session } = useAuth();
  const username = session?.user.username ?? '';
  const animeQuery = usePublicUserCollections(username, 2);
  const bookQuery = usePublicUserCollections(username, 1);
  const musicQuery = usePublicUserCollections(username, 3);
  const gameQuery = usePublicUserCollections(username, 4);
  const realQuery = usePublicUserCollections(username, 6);
  const queries = [
    animeQuery,
    bookQuery,
    musicQuery,
    gameQuery,
    realQuery,
  ];
  const isPending = queries.some((query) => query.isPending);
  const hasError = queries.some((query) => query.isError);
  const hasCompleteData = queries.every(
    (query) => query.data?.pages[0]?.total !== undefined,
  );
  const isRefreshing = queries.some(
    (query) => query.isRefetching && !query.isPending,
  );
  const overview = buildCollectionOverview(
    COLLECTION_TYPES.map((subjectType, index) => ({
      subjectType,
      total: queries[index].data?.pages[0]?.total ?? 0,
    })),
  );

  function refresh() {
    void Promise.all(queries.map((query) => query.refetch()));
  }

  if (isAuthLoading) {
    return (
      <SafeAreaView edges={['bottom']} style={styles.screen}>
        <View style={styles.stateContainer}>
          <AppState text="正在读取账户信息。" title="准备收藏概览" />
        </View>
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView edges={['bottom']} style={styles.screen}>
        <View style={styles.stateContainer}>
          <AppState
            action={() => router.push('/account')}
            actionLabel="前往登录"
            text="连接 Bangumi 后，Kaku 才能读取你的公开收藏总数。"
            title="需要登录"
          />
        </View>
      </SafeAreaView>
    );
  }

  if (isPending && !hasCompleteData) {
    return (
      <SafeAreaView edges={['bottom']} style={styles.screen}>
        <View style={styles.stateContainer}>
          <AppState text="正在汇总五类公开收藏。" title="生成收藏概览" />
        </View>
      </SafeAreaView>
    );
  }

  if (!hasCompleteData) {
    return (
      <SafeAreaView edges={['bottom']} style={styles.screen}>
        <View style={styles.stateContainer}>
          <AppState
            action={refresh}
            text="部分收藏没有读取成功，请检查网络后重试。已有缓存不会被清除。"
            title="概览暂不完整"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            colors={[colors.accent]}
            onRefresh={refresh}
            progressBackgroundColor={colors.surface}
            refreshing={isRefreshing}
            tintColor={colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>KAKU COLLECTIONS</Text>
        <Text accessibilityRole="header" style={styles.title}>
          你的收藏概览
        </Text>
        <Text style={styles.description}>
          基于 Bangumi 当前公开收藏总数汇总，不下载完整列表，也不把它包装成年度报告。
        </Text>

        {hasError ? (
          <Pressable
            accessibilityRole="button"
            onPress={refresh}
            style={({ pressed }) => [
              styles.warning,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.warningText}>
              刷新失败，当前展示上次缓存 · 点此重试
            </Text>
          </Pressable>
        ) : null}

        <View style={styles.totalCard}>
          <Text maxFontSizeMultiplier={1.2} style={styles.totalValue}>
            {overview.total.toLocaleString('zh-CN')}
          </Text>
          <Text style={styles.totalLabel}>全部公开收藏</Text>
          <Text style={styles.totalMeta}>@{username} · 五种媒体类型</Text>
        </View>

        <View style={styles.breakdownCard}>
          <Text style={styles.cardTitle}>类型分布</Text>
          {overview.items.map((item, index) => (
            <Pressable
              accessibilityHint={`打开全部${item.label}收藏`}
              accessibilityLabel={`${item.label}收藏 ${item.total} 部`}
              accessibilityRole="button"
              key={item.subjectType}
              onPress={() =>
                router.push({
                  pathname: '/user/collections/[username]',
                  params: {
                    type: String(item.subjectType),
                    username,
                  },
                })
              }
              style={({ pressed }) => [
                styles.typeRow,
                index > 0 && styles.typeRowDivider,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.typeHeading}>
                <Text style={styles.typeLabel}>{item.label}</Text>
                <Text style={styles.typeValue}>
                  {item.total.toLocaleString('zh-CN')} 部
                </Text>
              </View>
              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    { width: `${item.percentage}%` },
                  ]}
                />
              </View>
              <Text style={styles.percentage}>
                {item.percentage.toLocaleString('zh-CN', {
                  maximumFractionDigits: 1,
                })}
                %
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.footnote}>
          收藏可见性由 Bangumi 决定。下拉可重新读取；点击任一类型可查看完整列表。
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { backgroundColor: colors.background, flex: 1 },
    stateContainer: { flex: 1, justifyContent: 'center', padding: 24 },
    content: { padding: 24, paddingBottom: 40 },
    eyebrow: {
      color: colors.accent,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1.2,
    },
    title: {
      color: colors.ink,
      fontSize: 28,
      fontWeight: '900',
      letterSpacing: -0.7,
      lineHeight: 34,
      marginTop: 8,
    },
    description: {
      color: colors.subtle,
      fontSize: 13,
      lineHeight: 20,
      marginTop: 10,
      maxWidth: 350,
    },
    warning: {
      backgroundColor: colors.accentSoft,
      borderRadius: 14,
      marginTop: 20,
      paddingHorizontal: 14,
      paddingVertical: 11,
    },
    warningText: {
      color: colors.accentRich,
      fontSize: 12,
      fontWeight: '700',
      lineHeight: 18,
    },
    totalCard: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      marginTop: 28,
      minHeight: 180,
      padding: 22,
    },
    totalValue: {
      color: colors.ink,
      fontSize: 50,
      fontWeight: '900',
      letterSpacing: -1.8,
      lineHeight: 58,
    },
    totalLabel: {
      color: colors.ink,
      fontSize: 16,
      fontWeight: '800',
      marginTop: 8,
    },
    totalMeta: { color: colors.subtle, fontSize: 12, marginTop: 6 },
    breakdownCard: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      marginTop: 12,
      paddingHorizontal: 20,
      paddingVertical: 20,
    },
    cardTitle: {
      color: colors.ink,
      fontSize: 17,
      fontWeight: '800',
      marginBottom: 6,
    },
    typeRow: { minHeight: 92, paddingVertical: 15 },
    typeRowDivider: {
      borderTopColor: colors.divider,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    typeHeading: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    typeLabel: { color: colors.ink, fontSize: 14, fontWeight: '800' },
    typeValue: { color: colors.muted, fontSize: 13, fontWeight: '700' },
    track: {
      backgroundColor: colors.track,
      borderRadius: 3,
      height: 6,
      marginTop: 13,
      overflow: 'hidden',
    },
    fill: {
      backgroundColor: colors.accent,
      borderRadius: 3,
      height: '100%',
    },
    percentage: { color: colors.subtle, fontSize: 11, marginTop: 6 },
    footnote: {
      color: colors.muted,
      fontSize: 11,
      lineHeight: 18,
      marginTop: 16,
      paddingHorizontal: 4,
    },
    pressed: { opacity: 0.62 },
  });
