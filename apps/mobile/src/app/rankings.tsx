import { useEffect, useMemo, useRef, useState } from 'react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/design';
import {
  getSubjectTypeLabel,
  SUBJECT_TYPES,
} from '@/features/catalog/subject-types';
import { SubjectTypeTabs } from '@/features/catalog/subject-type-tabs';
import { PagedListFooter } from '@/features/shared/paged-list-footer';
import { CachedDataNotice } from '@/features/shared/cached-data-notice';
import { RankedSubjectRow } from '@/features/discover/ranked-subject-row';
import { useBangumiRankedSubjects } from '@/features/discover/use-discover';

export default function RankingsScreen() {
  const { type } = useLocalSearchParams<{ type?: string }>();
  const initialType = Number(type);
  const [subjectType, setSubjectType] = useState(() =>
    SUBJECT_TYPES.some((item) => item.id === initialType) ? initialType : 2,
  );
  const subjectTypeLabel = getSubjectTypeLabel(subjectType);
  const rankingQuery = useBangumiRankedSubjects(subjectType);
  const entranceOpacity = useRef(new Animated.Value(0)).current;
  const entranceTranslateY = useRef(new Animated.Value(6)).current;
  const subjects = useMemo(
    () => rankingQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [rankingQuery.data],
  );
  const total = rankingQuery.data?.pages[0]?.total;

  useEffect(() => {
    let active = true;

    void AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (!active) return;

      if (reduceMotion) {
        entranceOpacity.setValue(1);
        entranceTranslateY.setValue(0);
        return;
      }

      Animated.parallel([
        Animated.timing(entranceOpacity, {
          duration: 180,
          easing: Easing.out(Easing.cubic),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(entranceTranslateY, {
          duration: 220,
          easing: Easing.out(Easing.cubic),
          toValue: 0,
          useNativeDriver: true,
        }),
      ]).start();
    });

    return () => {
      active = false;
      entranceOpacity.stopAnimation();
      entranceTranslateY.stopAnimation();
    };
  }, [entranceOpacity, entranceTranslateY]);

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen
        options={{
          headerBackButtonDisplayMode: 'minimal',
          headerShadowVisible: false,
          title: `${subjectTypeLabel}排行榜`,
        }}
      />
      <Animated.FlatList
        contentContainerStyle={styles.content}
        data={subjects}
        initialNumToRender={Platform.OS === 'android' ? 6 : 12}
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
              text={`Bangumi 暂时没有返回可显示的${subjectTypeLabel}。`}
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
        maxToRenderPerBatch={Platform.OS === 'android' ? 6 : 12}
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
        style={{
          opacity: entranceOpacity,
          transform: [{ translateY: entranceTranslateY }],
        }}
        updateCellsBatchingPeriod={Platform.OS === 'android' ? 60 : 40}
        windowSize={Platform.OS === 'android' ? 5 : 7}
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
  subjectTypeTabs: { paddingBottom: 14 },
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
