import { useMemo, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
  FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/features/theme/theme-provider';
import type { BrowseSort } from '@/features/browse/model';
import { useBrowseSubjects } from '@/features/browse/use-browse-subjects';
import {
  getSubjectTypeFromSlug,
  getSubjectTypeLabel,
} from '@/features/catalog/subject-types';
import { SubjectTypeTabs } from '@/features/catalog/subject-type-tabs';
import type { DiscoverSubject } from '@/features/discover/model';
import { AppRefreshControl } from '@/features/shared/app-refresh-control';
import { CachedDataNotice } from '@/features/shared/cached-data-notice';
import { PagedListFooter } from '@/features/shared/paged-list-footer';
import { ScrollToTopButton } from '@/features/shared/scroll-to-top-button';

const SORTS: Array<{ id: BrowseSort; label: string }> = [
  { id: 'rank', label: '排名' },
  { id: 'trends', label: '热度' },
  { id: 'collects', label: '收藏' },
  { id: 'date', label: '日期' },
];

function useThemedStyles() {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return { colors, styles };
}

export default function BrowseScreen() {
  const { colors, styles } = useThemedStyles();
  const { tag: initialTag, type } = useLocalSearchParams<{
    tag?: string;
    type?: string;
  }>();
  const normalizedInitialTag = typeof initialTag === 'string'
    ? initialTag.trim().slice(0, 30)
    : '';
  const [subjectType, setSubjectType] = useState<number>(() => getSubjectTypeFromSlug(type));
  const [sort, setSort] = useState<BrowseSort>('rank');
  const [yearDraft, setYearDraft] = useState('');
  const [tagDraft, setTagDraft] = useState(normalizedInitialTag);
  const [year, setYear] = useState<number>();
  const [tag, setTag] = useState<string | undefined>(
    normalizedInitialTag || undefined,
  );
  const listRef = useRef<FlatList<DiscoverSubject>>(null);
  const [showsScrollToTop, setShowsScrollToTop] = useState(false);
  const browseQuery = useBrowseSubjects({ sort, subjectType, tag, year });
  const items = useMemo(
    () => browseQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [browseQuery.data],
  );

  function applyFilters() {
    const parsedYear = Number(yearDraft);
    setYear(Number.isInteger(parsedYear) && parsedYear >= 1900 ? parsedYear : undefined);
    setTag(tagDraft.trim() || undefined);
    Keyboard.dismiss();
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen options={{ title: '分类浏览' }} />
      <FlatList
        ref={listRef}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.content}
        data={items}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          <BrowseState
            error={browseQuery.isError}
            loading={browseQuery.isPending}
            onRetry={() => void browseQuery.refetch()}
          />
        }
        ListFooterComponent={items.length ? (
          <PagedListFooter
            hasNextPage={Boolean(browseQuery.hasNextPage)}
            isError={browseQuery.isFetchNextPageError}
            isFetching={browseQuery.isFetchingNextPage}
            loadedCount={items.length}
            onRetry={() => void browseQuery.fetchNextPage()}
          />
        ) : null}
        ListHeaderComponent={
          <View>
            <View style={styles.hero}>
              <Text style={styles.title}>分类浏览</Text>
              <Text style={styles.subtitle}>组合类型、排序、年份与标签</Text>
            </View>
            <SubjectTypeTabs
              contentContainerStyle={styles.typeTabs}
              onChange={setSubjectType}
              selectedType={subjectType}
            />
            <View style={styles.sorts}>
              {SORTS.map((item) => (
                <Pressable
                  accessibilityLabel={`按${item.label}排序`}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: sort === item.id }}
                  key={item.id}
                  onPress={() => setSort(item.id)}
                  style={[styles.sort, sort === item.id && styles.sortSelected]}
                >
                  <Text style={[styles.sortText, sort === item.id && styles.sortTextSelected]}>
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.filterCard}>
              <TextInput
                accessibilityLabel="筛选年份"
                accessibilityHint="输入四位年份，例如 2026"
                keyboardType="number-pad"
                maxLength={4}
                onChangeText={setYearDraft}
                placeholder="年份，如 2026"
                placeholderTextColor={colors.subtle}
                style={styles.filterInput}
                value={yearDraft}
              />
              <View style={styles.filterDivider} />
              <TextInput
                accessibilityLabel="筛选标签"
                accessibilityHint="输入 Bangumi 标签，例如 TV 或科幻"
                maxLength={30}
                onChangeText={setTagDraft}
                onSubmitEditing={applyFilters}
                placeholder="标签，如 TV、科幻"
                placeholderTextColor={colors.subtle}
                returnKeyType="search"
                style={styles.filterInput}
                value={tagDraft}
              />
              <Pressable
                accessibilityLabel="应用筛选条件"
                accessibilityRole="button"
                onPress={applyFilters}
                style={({ pressed }) => [
                  styles.applyButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.applyText}>应用</Text>
              </Pressable>
            </View>
            <Text style={styles.resultTitle}>
              {getSubjectTypeLabel(subjectType)} · {SORTS.find((item) => item.id === sort)?.label}
              {year ? ` · ${year}` : ''}{tag ? ` · ${tag}` : ''}
            </Text>
            {items.length > 0 && browseQuery.isError ? (
              <CachedDataNotice onRetry={() => void browseQuery.refetch()} />
            ) : null}
          </View>
        }
        numColumns={2}
        onEndReached={() => {
          if (browseQuery.hasNextPage && !browseQuery.isFetchingNextPage) {
            void browseQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.45}
        onScroll={(event) => {
          const nextVisible = event.nativeEvent.contentOffset.y > 720;
          setShowsScrollToTop((current) =>
            current === nextVisible ? current : nextVisible,
          );
        }}
        scrollEventThrottle={80}
        refreshControl={
          <AppRefreshControl
            onRefresh={() => void browseQuery.refetch()}
            refreshing={browseQuery.isRefetching && !browseQuery.isPending}
          />
        }
        renderItem={({ item }) => <BrowseCard item={item} />}
        showsVerticalScrollIndicator={false}
      />
      <ScrollToTopButton
        onPress={() =>
          listRef.current?.scrollToOffset({ animated: true, offset: 0 })
        }
        visible={showsScrollToTop}
      />
    </SafeAreaView>
  );
}

function BrowseCard({ item }: { item: DiscoverSubject }) {
  const { styles } = useThemedStyles();

  return (
    <Pressable
      accessibilityLabel={`打开${item.title}`}
      accessibilityRole="button"
      accessibilityHint="进入条目详情"
      onPress={() => router.push({ pathname: '/subject/[id]', params: { id: String(item.id) } })}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.cover}>
        <Text style={styles.coverFallback}>{item.title.slice(0, 1)}</Text>
        {item.coverUrl ? (
          <Image contentFit="cover" source={item.coverUrl} style={StyleSheet.absoluteFill} transition={120} />
        ) : null}
      </View>
      <Text maxFontSizeMultiplier={1.35} numberOfLines={2} style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardMeta}>{item.score ? `${item.score.toFixed(1)} 分` : '暂无评分'}</Text>
    </Pressable>
  );
}

function BrowseState({ error, loading, onRetry }: { error: boolean; loading: boolean; onRetry: () => void }) {
  const { styles } = useThemedStyles();

  return (
    <View style={styles.state}>
      <Text style={styles.stateTitle}>{loading ? '正在筛选条目' : error ? '分类浏览失败' : '没有匹配条目'}</Text>
      <Text style={styles.stateText}>{error ? '请检查网络后重试。' : '可以减少筛选条件再试。'}</Text>
      {error ? (
        <Pressable
          accessibilityLabel="重试分类浏览"
          accessibilityRole="button"
          onPress={onRetry}
          style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
        >
          <Text style={styles.retryText}>重试</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  content: { paddingBottom: 44, paddingHorizontal: 20 },
  gridRow: { gap: 14 },
  hero: { paddingHorizontal: 4, paddingTop: 24 },
  title: { color: colors.ink, fontSize: 32, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { color: colors.muted, fontSize: 14, marginTop: 7 },
  typeTabs: { paddingBottom: 2, paddingTop: 20 },
  sorts: { flexDirection: 'row', gap: 8, paddingTop: 12 },
  sort: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, justifyContent: 'center', minHeight: 44, paddingHorizontal: 14 },
  sortSelected: { backgroundColor: colors.accentSoft },
  sortText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  sortTextSelected: { color: colors.accent },
  filterCard: { alignItems: 'center', backgroundColor: colors.surface, borderCurve: 'continuous', borderRadius: 18, flexDirection: 'row', height: 56, marginTop: 14, paddingHorizontal: 13 },
  filterInput: { color: colors.ink, flex: 1, fontSize: 13, height: '100%', includeFontPadding: false, lineHeight: 20, paddingHorizontal: 7, paddingVertical: 0, textAlignVertical: 'center' },
  filterDivider: { backgroundColor: colors.divider, height: 24, width: StyleSheet.hairlineWidth },
  applyButton: { alignItems: 'center', backgroundColor: colors.ink, borderRadius: 13, height: 44, justifyContent: 'center', paddingHorizontal: 14 },
  applyText: { color: colors.surface, fontSize: 12, fontWeight: '800' },
  resultTitle: { color: colors.ink, fontSize: 20, fontWeight: '800', marginBottom: 15, marginTop: 28 },
  card: { flex: 1, marginBottom: 22, maxWidth: '48%' },
  cover: { alignItems: 'center', backgroundColor: colors.track, borderRadius: 18, height: 218, justifyContent: 'center', overflow: 'hidden', width: '100%' },
  coverFallback: { color: colors.subtle, fontSize: 20, fontWeight: '700' },
  cardTitle: { color: colors.ink, fontSize: 14, fontWeight: '700', lineHeight: 19, marginTop: 9, minHeight: 40 },
  cardMeta: { color: colors.subtle, fontSize: 11, marginTop: 4 },
  state: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 22, padding: 34, width: '100%' },
  stateTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  stateText: { color: colors.muted, fontSize: 13, marginTop: 7 },
  retryText: { color: colors.accent, fontSize: 13, fontWeight: '800', marginTop: 14 },
  retry: { alignItems: 'center', justifyContent: 'center', minHeight: 44, minWidth: 72 },
  pressed: { opacity: 0.62 },
});
