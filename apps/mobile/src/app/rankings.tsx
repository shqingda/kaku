import { useMemo } from 'react';
import { router, Stack } from 'expo-router';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/design';
import { PagedListFooter } from '@/features/shared/paged-list-footer';
import { RankedSubjectRow } from '@/features/discover/ranked-subject-row';
import { useBangumiRankedSubjects } from '@/features/discover/use-discover';

export default function RankingsScreen() {
  const rankingQuery = useBangumiRankedSubjects();
  const subjects = useMemo(
    () => rankingQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [rankingQuery.data],
  );
  const total = rankingQuery.data?.pages[0]?.total ?? 0;

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen
        options={{
          headerBackButtonDisplayMode: 'minimal',
          headerShadowVisible: false,
          title: '动画排行榜',
        }}
      />
      <FlatList
        contentContainerStyle={styles.content}
        data={subjects}
        initialNumToRender={12}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          rankingQuery.isPending ? (
            <RankingState
              text="正在读取 Bangumi 综合排名。"
              title="排行榜加载中"
            />
          ) : rankingQuery.isError ? (
            <RankingState
              action={() => void rankingQuery.refetch()}
              text="请检查网络后重试，已经加载的数据不会被覆盖。"
              title="排行榜读取失败"
            />
          ) : (
            <RankingState
              text="Bangumi 暂时没有返回可显示的动画。"
              title="暂无排行数据"
            />
          )
        }
        ListFooterComponent={
          subjects.length > 0 ? (
            <PagedListFooter
              hasNextPage={rankingQuery.hasNextPage}
              isError={rankingQuery.isFetchNextPageError}
              isFetching={rankingQuery.isFetchingNextPage}
              loadedCount={subjects.length}
              onRetry={() => void rankingQuery.fetchNextPage()}
              total={total}
            />
          ) : null
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>动画排行榜</Text>
            <Text style={styles.subtitle}>
              Bangumi 综合排名 · {total ? `${total} 个条目` : '读取中'}
            </Text>
          </View>
        }
        maxToRenderPerBatch={12}
        onEndReached={() => {
          if (
            rankingQuery.hasNextPage &&
            !rankingQuery.isFetchingNextPage &&
            !rankingQuery.isFetchNextPageError
          ) {
            void rankingQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.45}
        removeClippedSubviews={Platform.OS === 'android'}
        renderItem={({ index, item }) => (
          <View
            style={[
              styles.item,
              index === 0 && styles.firstItem,
              index === subjects.length - 1 && styles.lastItem,
            ]}
          >
            <RankedSubjectRow
              hasDivider={index > 0}
              item={item}
              onPress={() =>
                router.push({
                  pathname: '/subject/[id]',
                  params: { id: String(item.id) },
                })
              }
              position={index + 1}
            />
          </View>
        )}
        showsVerticalScrollIndicator={false}
        updateCellsBatchingPeriod={40}
        windowSize={7}
      />
    </SafeAreaView>
  );
}

function RankingState({
  action,
  text,
  title,
}: {
  action?: () => void;
  text: string;
  title: string;
}) {
  return (
    <View style={styles.state}>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateText}>{text}</Text>
      {action ? (
        <Pressable
          accessibilityRole="button"
          onPress={action}
          style={({ pressed }) => [
            styles.retry,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.retryText}>重试</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: COLORS.background, flex: 1 },
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
    color: COLORS.ink,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 7,
  },
  item: {
    backgroundColor: COLORS.surface,
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
  state: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: 30,
  },
  stateTitle: {
    color: COLORS.ink,
    fontSize: 17,
    fontWeight: '800',
  },
  stateText: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 7,
    textAlign: 'center',
  },
  retry: {
    backgroundColor: COLORS.accentSoft,
    borderRadius: 13,
    marginTop: 15,
    paddingHorizontal: 17,
    paddingVertical: 9,
  },
  retryText: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '800',
  },
  pressed: { opacity: 0.62 },
});
