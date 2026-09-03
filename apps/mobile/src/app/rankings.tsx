import { memo, useCallback, useEffect, useState } from 'react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/constants/theme';
import {
  getSubjectTypeLabel,
  SUBJECT_TYPES,
} from '@/features/catalog/subject-types';
import { SubjectTypeTabs } from '@/features/catalog/subject-type-tabs';
import { AppRefreshControl } from '@/features/shared/app-refresh-control';
import { AppState } from '@/features/shared/app-state';
import { PagedListFooter } from '@/features/shared/paged-list-footer';
import { CachedDataNotice } from '@/features/shared/cached-data-notice';
import { ScrollToTopButton } from '@/features/shared/scroll-to-top-button';
import { usePagedList } from '@/features/shared/use-paged-list';
import { RankedSubjectRow } from '@/features/discover/ranked-subject-row';
import { useBangumiRankedSubjects } from '@/features/discover/use-discover';
import type { DiscoverSubject } from '@/features/discover/model';
import { useTheme } from '@/features/theme/theme-provider';

export default function RankingsScreen() {
  const colors = useTheme();
  const styles = createStyles(colors);
  const { type } = useLocalSearchParams<{ type?: string }>();
  const initialType = Number(type);
  const [subjectType, setSubjectType] = useState(() =>
    SUBJECT_TYPES.some((item) => item.id === initialType) ? initialType : 2,
  );
  // 路由参数变化时同步本地状态（页面被复用时不重新初始化 useState）。
  useEffect(() => {
    const next = Number(type);
    if (SUBJECT_TYPES.some((item) => item.id === next)) {
      setSubjectType(next);
    }
  }, [type]);
  const subjectTypeLabel = getSubjectTypeLabel(subjectType);
  const rankingQuery = useBangumiRankedSubjects(subjectType);
  const rankings = usePagedList(rankingQuery);
  const openSubject = useCallback((id: number) => {
    router.push({ pathname: '/subject/[id]', params: { id: String(id) } });
  }, []);
  const renderItem = useCallback(
    ({ index, item }: { index: number; item: DiscoverSubject }) => (
      <RankingRow
        isFirst={index === 0}
        isLast={index === rankings.items.length - 1}
        item={item}
        onPressItem={openSubject}
        position={index + 1}
        styles={styles}
      />
    ),
    [openSubject, rankings.items.length, styles],
  );

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen
        options={{
          headerBackButtonDisplayMode: 'minimal',
          headerShadowVisible: false,
          title: `${subjectTypeLabel}排行榜`,
        }}
      />
      <FlatList
        {...rankings.listProps}
        contentContainerStyle={styles.content}
        data={rankings.items}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          rankingQuery.isPending ? (
            <AppState
              text="正在读取 Bangumi 综合排名。"
              title="排行榜加载中"
            />
          ) : rankingQuery.isError ? (
            <AppState
              action={() => void rankingQuery.refetch()}
              text="请检查网络后重试，已经加载的数据不会被覆盖。"
              title="排行榜读取失败"
            />
          ) : (
            <AppState
              text={`Bangumi 暂时没有返回可显示的${subjectTypeLabel}。`}
              title="暂无排行数据"
            />
          )
        }
        ListFooterComponent={
          rankings.items.length > 0 ? (
            <PagedListFooter {...rankings.footerProps} />
          ) : null
        }
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={styles.title}>{subjectTypeLabel}排行榜</Text>
              <Text style={styles.subtitle}>
                Bangumi 综合排名
              </Text>
            </View>
            <SubjectTypeTabs
              contentContainerStyle={styles.subjectTypeTabs}
              onChange={setSubjectType}
              selectedType={subjectType}
            />
            {rankingQuery.data && rankingQuery.isError ? (
              <CachedDataNotice onRetry={() => void rankingQuery.refetch()} />
            ) : null}
          </>
        }
        refreshControl={
          <AppRefreshControl
            onRefresh={rankings.refresh}
            refreshing={rankings.refreshing}
          />
        }
        renderItem={renderItem}
      />
      <ScrollToTopButton
        onPress={rankings.scrollToTop}
        visible={rankings.visible}
      />
    </SafeAreaView>
  );
}

const RankingRow = memo(function RankingRow({
  isFirst,
  isLast,
  item,
  onPressItem,
  position,
  styles,
}: {
  isFirst: boolean;
  isLast: boolean;
  item: DiscoverSubject;
  onPressItem: (id: number) => void;
  position: number;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View
      style={[
        styles.item,
        isFirst && styles.firstItem,
        isLast && styles.lastItem,
      ]}
    >
      <RankedSubjectRow
        hasDivider={position > 1}
        item={item}
        onPress={() => onPressItem(item.id)}
        position={position}
      />
    </View>
  );
});

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  content: {
    paddingBottom: 44,
    paddingHorizontal: 20,
  },
  header: {
    paddingBottom: 18,
    paddingHorizontal: 4,
    paddingTop: 24,
  },
  title: {
    color: colors.ink,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 7,
  },
  subjectTypeTabs: { paddingBottom: 14 },
  item: {
    backgroundColor: colors.surface,
    overflow: 'hidden',
    paddingHorizontal: 14,
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
