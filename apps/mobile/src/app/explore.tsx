import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from 'react';
import { Image } from 'expo-image';
import {
  router,
  Stack,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {
  FlatList,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/features/theme/theme-provider';
import { AppState } from '@/features/shared/app-state';
import { SubjectTypeTabs } from '@/features/catalog/subject-type-tabs';
import {
  getSubjectTypeLabel,
  getSubjectTypeSlug,
  SUBJECT_TYPES,
} from '@/features/catalog/subject-types';
import type {
  CalendarDay,
  DiscoverSubject,
  DiscoverSubjectPage,
} from '@/features/discover/model';
import { PagedListFooter } from '@/features/shared/paged-list-footer';
import { CachedDataNotice } from '@/features/shared/cached-data-notice';
import { AppRefreshControl } from '@/features/shared/app-refresh-control';
import { ScrollToTopButton } from '@/features/shared/scroll-to-top-button';
import { useScrollToTopButton } from '@/features/shared/use-scroll-to-top-button';
import { SubjectSearchField } from '@/features/shared/subject-search-field';
import { SectionAction } from '@/features/shared/section-action';
import { RecentSearches } from '@/features/search/recent-searches';
import { useSearchHistory } from '@/features/search/search-history-provider';
import { RankedSubjectRow } from '@/features/discover/ranked-subject-row';
import { useRecentSubjects } from '@/features/history/recent-subjects-provider';
import { RecentSubjectsSection } from '@/features/history/recent-subjects-section';
import type {
  PeopleKind,
  PeopleSearchPage,
  PublicPersonSummary,
} from '@/features/people-browser/model';
import { usePeopleSearch } from '@/features/people-browser/use-people-search';
import {
  useBangumiCalendar,
  useBangumiRankedSubjects,
  useBangumiSearch,
} from '@/features/discover/use-discover';
import { readInfinitePages, readQueryArray } from '@/lib/query-data';

function currentWeekdayId() {
  const day = new Date().getDay();
  return day === 0 ? 7 : day;
}

type SearchMode = 'subject' | PeopleKind;
type SearchResult = DiscoverSubject | PublicPersonSummary;

const SEARCH_TYPES = [
  ...SUBJECT_TYPES,
  { id: 100, label: '角色' },
  { id: 101, label: '人物' },
];

function useThemedStyles() {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return { colors, styles };
}

export default function ExploreScreen() {
  const { styles } = useThemedStyles();
  const { q } = useLocalSearchParams<{ q?: string }>();
  const initialKeyword = typeof q === 'string' ? q.trim() : '';
  const [draft, setDraft] = useState(initialKeyword);
  const [keyword, setKeyword] = useState(initialKeyword);
  const [selectedDay, setSelectedDay] = useState(currentWeekdayId);
  const [selectedSearchType, setSelectedSearchType] = useState(2);
  const [searchMode, setSearchMode] = useState<SearchMode>('subject');
  const {
    addSearch,
    clearHistory: clearSearchHistory,
    items: recentSearches,
    refreshFromCloud: refreshSearchHistory,
    syncIfStale: syncSearchHistoryIfStale,
  } = useSearchHistory();
  const {
    clearHistory: clearRecentSubjects,
    items: recentSubjects,
    refreshFromCloud: refreshRecentSubjects,
    syncIfStale: syncRecentSubjectsIfStale,
  } = useRecentSubjects();
  const clearSearchFrameRef = useRef<number | null>(null);
  const {
    handleScroll: handleOverviewScroll,
    ref: overviewScrollRef,
    scrollToTop: scrollOverviewToTop,
    setVisible: setOverviewScrollVisible,
    visible: overviewScrollVisible,
  } = useScrollToTopButton();
  const calendarQuery = useBangumiCalendar(selectedSearchType === 2);
  const rankedQuery = useBangumiRankedSubjects(selectedSearchType);
  const searchQuery = useBangumiSearch(
    keyword,
    selectedSearchType,
    searchMode === 'subject',
  );
  const characterSearchQuery = usePeopleSearch(
    'character',
    keyword,
    searchMode === 'character',
  );
  const personSearchQuery = usePeopleSearch(
    'person',
    keyword,
    searchMode === 'person',
  );
  const calendarDays = useMemo(
    () => readQueryArray<CalendarDay>(calendarQuery.data),
    [calendarQuery.data],
  );
  const rankedPages = useMemo(
    () => readInfinitePages<DiscoverSubjectPage>(rankedQuery.data),
    [rankedQuery.data],
  );
  const searchPages = useMemo(
    () => readInfinitePages<DiscoverSubjectPage>(searchQuery.data),
    [searchQuery.data],
  );
  const searchSubjects = useMemo(
    () =>
      searchPages.flatMap((page) =>
        Array.isArray(page.items) ? page.items : [],
      ),
    [searchPages],
  );
  const characterPages = useMemo(
    () => readInfinitePages<PeopleSearchPage>(characterSearchQuery.data),
    [characterSearchQuery.data],
  );
  const personPages = useMemo(
    () => readInfinitePages<PeopleSearchPage>(personSearchQuery.data),
    [personSearchQuery.data],
  );
  const searchPeople = searchMode === 'character'
    ? characterPages.flatMap((page) => page.items)
    : personPages.flatMap((page) => page.items);
  const activeSearchQuery = searchMode === 'subject'
    ? searchQuery
    : searchMode === 'character'
      ? characterSearchQuery
      : personSearchQuery;
  const searchTotal = searchMode === 'subject'
    ? searchPages[0]?.total ?? 0
    : searchPeople.length > 0
      ? (searchMode === 'character'
        ? characterPages[0]?.total ?? 0
        : personPages[0]?.total ?? 0)
      : 0;
  const selectedCalendarDay = useMemo(
    () =>
      calendarDays.find((day) => day.id === selectedDay) ??
      calendarDays[0],
    [calendarDays, selectedDay],
  );

  // 首页再次提交搜索时，Expo Router 会复用已挂载的 Explore 屏并只更新
  // query 参数；useState 的初始值不会重新计算，因此把新 q 同步回本地
  // state。搜索历史由首页提交时写入，这里不再重复记录。
  useEffect(() => {
    setDraft(initialKeyword);
    setKeyword(initialKeyword);
  }, [initialKeyword]);

  useEffect(
    () => () => {
      if (clearSearchFrameRef.current !== null) {
        cancelAnimationFrame(clearSearchFrameRef.current);
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      void syncSearchHistoryIfStale();
      void syncRecentSubjectsIfStale();
    }, [syncRecentSubjectsIfStale, syncSearchHistoryIfStale]),
  );

  function rememberSearch(nextKeyword: string) {
    addSearch(nextKeyword);
  }

  function submitSearch() {
    const nextKeyword = draft.trim();

    if (nextKeyword) {
      setKeyword(nextKeyword);
      rememberSearch(nextKeyword);
      Keyboard.dismiss();
    }
  }

  function selectRecentSearch(nextKeyword: string) {
    setDraft(nextKeyword);
    setKeyword(nextKeyword);
    rememberSearch(nextKeyword);
    Keyboard.dismiss();
  }

  function clearBrowsingHistory() {
    void clearRecentSubjects();
  }

  function updateDraft(value: string) {
    setDraft(value);

    if (!value) {
      if (clearSearchFrameRef.current !== null) {
        cancelAnimationFrame(clearSearchFrameRef.current);
      }
      // iOS 的 TextInput clearButton 需要先完成原生清除帧，再卸载搜索 FlatList。
      clearSearchFrameRef.current = requestAnimationFrame(() => {
        clearSearchFrameRef.current = null;
        setKeyword('');
      });
    }
  }

  function refreshOverview() {
    void refreshRecentSubjects();
    void refreshSearchHistory();
    void rankedQuery.refetch();
    if (selectedSearchType === 2) void calendarQuery.refetch();
  }

  function refreshSearchResults() {
    void refreshSearchHistory();
    void activeSearchQuery.refetch();
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen
        options={{
          headerBackButtonDisplayMode: 'minimal',
          headerShown: true,
          headerShadowVisible: false,
          title: '综合',
        }}
      />
      <View style={styles.body}>
      {keyword ? (
        <SearchResults
          key="search-results"
          draft={draft}
          hasNextPage={activeSearchQuery.hasNextPage}
          isError={activeSearchQuery.isError}
          isFetchNextPageError={activeSearchQuery.isFetchNextPageError}
          isFetchingNextPage={activeSearchQuery.isFetchingNextPage}
          isPending={activeSearchQuery.isPending}
          isRefetching={activeSearchQuery.isRefetching}
          keyword={keyword}
          onChangeDraft={updateDraft}
          onChangeSearchType={(value) => {
            if (value === 100) {
              setSearchMode('character');
            } else if (value === 101) {
              setSearchMode('person');
            } else {
              setSearchMode('subject');
              setSelectedSearchType(value);
            }
          }}
          onLoadMore={() => void activeSearchQuery.fetchNextPage()}
          onRetry={() => void activeSearchQuery.refetch()}
          onRefresh={refreshSearchResults}
          onSubmit={submitSearch}
          people={searchPeople}
          searchMode={searchMode}
          subjects={searchSubjects}
          selectedSearchType={
            searchMode === 'character'
              ? 100
              : searchMode === 'person'
                ? 101
                : selectedSearchType
          }
          total={searchTotal}
        />
        ) : (
          <ScrollView
            key="explore-overview"
            contentContainerStyle={styles.content}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            onScroll={handleOverviewScroll}
            ref={overviewScrollRef}
            scrollEventThrottle={80}
            refreshControl={
              <AppRefreshControl
                onRefresh={refreshOverview}
                refreshing={
                  (rankedQuery.isRefetching || calendarQuery.isRefetching) &&
                  !rankedQuery.isPending &&
                  !calendarQuery.isPending
                }
              />
            }
            showsVerticalScrollIndicator={false}
            style={styles.overviewList}
          >
          <SearchField
            draft={draft}
            onChangeDraft={updateDraft}
            onSubmit={submitSearch}
          />
          {!draft ? (
            <>
              <RecentSearches
                items={recentSearches}
                onClear={clearSearchHistory}
                onSelect={selectRecentSearch}
              />
              <RecentSubjectsSection
                items={recentSubjects}
                onClear={clearBrowsingHistory}
              />
            </>
          ) : null}
          <SubjectTypeTabs
            contentContainerStyle={styles.subjectTypeTabs}
            onChange={setSelectedSearchType}
            selectedType={selectedSearchType}
          />
          <View>
            <View style={styles.exploreEntries}>
              <ExploreEntry
                featured
                icon={{ android: 'grid_view', ios: 'square.grid.2x2', web: 'grid_view' }}
                meta={`${selectedSearchType === 1 ? '阅读' : getSubjectTypeLabel(selectedSearchType)}频道 · 热门与高分精选`}
                onPress={() =>
                  router.push({
                    pathname: '/channel/[type]',
                    params: { type: getSubjectTypeSlug(selectedSearchType) },
                  })
                }
                title="频道"
              />
              <ExploreEntry
                icon={{ android: 'forum', ios: 'bubble.left.and.bubble.right', web: 'forum' }}
                meta="公开小组与最新话题"
                onPress={() => router.push('/community')}
                title="社区"
              />
              <ExploreEntry
                icon={{ android: 'article', ios: 'doc.text', web: 'article' }}
                meta="最新公开长文与用户评论"
                onPress={() => router.push('/blogs')}
                title="日志"
              />
              <ExploreEntry
                icon={{ android: 'list_alt', ios: 'list.bullet.rectangle', web: 'list_alt' }}
                meta="用户整理的主题收藏与推荐"
                onPress={() => router.push('/directories')}
                title="目录"
              />
              <ExploreEntry
                icon={{ android: 'people_outline', ios: 'person.2', web: 'people_outline' }}
                meta="虚构角色与现实人物"
                onPress={() => router.push('/people')}
                title="人物"
              />
              <ExploreEntry
                icon={{ android: 'label', ios: 'tag', web: 'label' }}
                meta="按标签浏览作品"
                onPress={() => router.push('/tags')}
                title="标签"
              />
              <ExploreEntry
                icon={{ android: 'history_edu', ios: 'book', web: 'history_edu' }}
                meta="维基修订与更新记录"
                onPress={() => router.push('/wiki')}
                title="维基"
              />
            </View>
            {selectedSearchType === 2 ? (
              <>
                <View style={styles.sectionHeader}>
                  <View>
                    <Text style={styles.sectionTitle}>每日放送</Text>
                    <Text style={styles.sectionMeta}>看看今天有哪些新节目</Text>
                  </View>
                  <SectionAction
                    accessibilityLabel="查看全部每日放送"
                    label="查看全部"
                    onPress={() => router.push('/calendar')}
                  />
                </View>
                {calendarQuery.data && calendarQuery.isError ? (
                  <CachedDataNotice onRetry={() => void calendarQuery.refetch()} />
                ) : null}
                {calendarQuery.isPending && !calendarQuery.data ? (
                  <AppState title="正在读取放送表" text="本周动画加载中。" />
                ) : calendarQuery.isError && !calendarQuery.data ? (
                  <AppState
                    action={() => void calendarQuery.refetch()}
                    title="放送表读取失败"
                    text="请检查网络后重试。"
                  />
                ) : (
                  <>
                    <ScrollView
                      contentContainerStyle={styles.dayTabs}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                    >
                      {calendarDays.map((day) => {
                        const isSelected = day.id === selectedCalendarDay?.id;

                        return (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityState={{ selected: isSelected }}
                            key={day.id}
                            onPress={() => setSelectedDay(day.id)}
                            style={({ pressed }) => [
                              styles.dayTab,
                              isSelected && styles.dayTabSelected,
                              pressed && styles.pressed,
                            ]}
                          >
                            <Text
                              style={[
                                styles.dayTabText,
                                isSelected && styles.dayTabTextSelected,
                              ]}
                            >
                              {day.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                    <FlatList
                      contentContainerStyle={styles.calendarList}
                      data={selectedCalendarDay?.subjects ?? []}
                      horizontal
                      keyExtractor={(item) => String(item.id)}
                      ListEmptyComponent={
                        <AppState title="今天暂无条目" text="放送表还没有相关数据。" />
                      }
                      renderItem={({ item }) => <CalendarCard item={item} />}
                      showsHorizontalScrollIndicator={false}
                    />
                  </>
                )}
              </>
            ) : null}
            <RankingSection
              isError={rankedQuery.isError}
              isPending={rankedQuery.isPending}
              onRetry={() => void rankedQuery.refetch()}
              subjects={
                Array.isArray(rankedPages[0]?.items)
                  ? rankedPages[0].items
                  : []
              }
              subjectType={selectedSearchType}
            />
          </View>
          </ScrollView>
        )}
      </View>
      <ScrollToTopButton
        onPress={scrollOverviewToTop}
        visible={overviewScrollVisible}
      />
    </SafeAreaView>
  );
}

function SearchField({
  draft,
  onChangeDraft,
  onSubmit,
}: {
  draft: string;
  onChangeDraft: (value: string) => void;
  onSubmit: () => void;
}) {
  const { styles } = useThemedStyles();

  return (
    <SubjectSearchField
      onChangeText={onChangeDraft}
      onSubmit={onSubmit}
      style={styles.searchBar}
      value={draft}
    />
  );
}

function ExploreEntry({
  featured = false,
  icon,
  meta,
  onPress,
  title,
}: {
  featured?: boolean;
  icon: ComponentProps<typeof SymbolView>['name'];
  meta: string;
  onPress: () => void;
  title: string;
}) {
  const { colors, styles } = useThemedStyles();

  return (
    <Pressable
      accessibilityHint={`打开${title}`}
      accessibilityLabel={title}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.exploreEntry,
        featured && styles.exploreEntryFeatured,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.exploreEntryIcon}>
        <SymbolView name={icon} size={17} tintColor={colors.accent} />
      </View>
      <View style={styles.exploreEntryText}>
        <Text style={styles.exploreEntryTitle}>{title}</Text>
        {featured ? (
          <Text numberOfLines={1} style={styles.exploreEntryMeta}>{meta}</Text>
        ) : null}
      </View>
      <SymbolView
        name={{ android: 'chevron_right', ios: 'chevron.right', web: 'chevron_right' }}
        size={13}
        tintColor={colors.subtle}
        weight="semibold"
      />
    </Pressable>
  );
}

function RankingSection({
  isError,
  isPending,
  onRetry,
  subjects,
  subjectType,
}: {
  isError: boolean;
  isPending: boolean;
  onRetry: () => void;
  subjects: DiscoverSubject[];
  subjectType: number;
}) {
  const { styles } = useThemedStyles();
  const subjectTypeLabel = getSubjectTypeLabel(subjectType);

  return (
    <View>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>{subjectTypeLabel}排行榜</Text>
          <Text style={styles.sectionMeta}>Bangumi 综合排名</Text>
        </View>
        <SectionAction
          accessibilityLabel={`查看全部${subjectTypeLabel}排行榜`}
          label="查看全部"
          onPress={() =>
            router.push({
              pathname: '/rankings',
              params: { type: String(subjectType) },
            })
          }
        />
      </View>
      {subjects.length > 0 && isError ? (
        <CachedDataNotice onRetry={onRetry} />
      ) : null}
      {isPending && subjects.length === 0 ? (
        <AppState
          title="正在读取排行榜"
          text={`高评分${subjectTypeLabel}加载中。`}
        />
      ) : isError && subjects.length === 0 ? (
        <AppState action={onRetry} title="排行榜读取失败" text="请稍后重试。" />
      ) : (
        <View style={styles.rankingList}>
          {subjects.slice(0, 6).map((item, index) => (
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
      )}
    </View>
  );
}

function CalendarCard({ item }: { item: DiscoverSubject }) {
  const { styles } = useThemedStyles();

  return (
    <Pressable
      accessibilityHint="打开条目详情"
      accessibilityLabel={`${item.title}，${item.score ? `${item.score.toFixed(1)} 分` : '暂无评分'}`}
      accessibilityRole="button"
      onPress={() =>
        router.push({
          pathname: '/subject/[id]',
          params: { id: String(item.id) },
        })
      }
      style={({ pressed }) => [
        styles.calendarCard,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.calendarCover}>
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
      <Text
        ellipsizeMode="tail"
        maxFontSizeMultiplier={1.35}
        numberOfLines={2}
        style={styles.calendarTitle}
      >
        {item.title}
      </Text>
      <Text style={styles.calendarMeta}>
        {item.score ? `${item.score.toFixed(1)} 分` : '暂无评分'}
      </Text>
    </Pressable>
  );
}

function PersonSearchResultRow({ item }: { item: PublicPersonSummary }) {
  const { styles } = useThemedStyles();
  const pathname = item.kind === 'character' ? '/character/[id]' : '/person/[id]';

  return (
    <View style={[styles.resultItem, styles.firstResultItem, styles.lastResultItem]}>
      <Pressable
        accessibilityHint="打开人物详情"
        accessibilityLabel={`${item.name}，${item.kind === 'character' ? '角色' : '人物'}`}
        accessibilityRole="button"
        onPress={() =>
          router.push({ pathname, params: { id: String(item.id) } })
        }
        style={({ pressed }) => [styles.resultRow, pressed && styles.pressed]}
      >
        <View style={styles.resultCover}>
          <Text style={styles.coverFallback}>{item.name.slice(0, 1)}</Text>
          {item.imageUrl ? (
            <Image
              contentFit="cover"
              recyclingKey={item.imageUrl}
              source={item.imageUrl}
              style={StyleSheet.absoluteFill}
              transition={120}
            />
          ) : null}
        </View>
        <View style={styles.resultMain}>
          <Text numberOfLines={2} style={styles.resultTitle}>
            {item.name}
          </Text>
          <Text numberOfLines={1} style={styles.resultMeta}>
            {item.categories.join(' · ') || (item.kind === 'character' ? '角色' : '人物')}
          </Text>
          {item.metadata ? (
            <Text numberOfLines={2} style={styles.resultMeta}>
              {item.metadata}
            </Text>
          ) : null}
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
    </View>
  );
}

function SearchResults({
  draft,
  hasNextPage,
  isError,
  isFetchNextPageError,
  isFetchingNextPage,
  isPending,
  isRefetching,
  keyword,
  onChangeDraft,
  onChangeSearchType,
  onLoadMore,
  onRetry,
  onRefresh,
  onSubmit,
  people,
  searchMode,
  subjects,
  selectedSearchType,
  total,
}: {
  draft: string;
  hasNextPage: boolean;
  isError: boolean;
  isFetchNextPageError: boolean;
  isFetchingNextPage: boolean;
  isPending: boolean;
  isRefetching: boolean;
  keyword: string;
  onChangeDraft: (value: string) => void;
  onChangeSearchType: (subjectType: number) => void;
  onLoadMore: () => void;
  onRetry: () => void;
  onRefresh: () => void;
  onSubmit: () => void;
  people: PublicPersonSummary[];
  searchMode: SearchMode;
  subjects: DiscoverSubject[];
  selectedSearchType: number;
  total: number;
}) {
  const { styles } = useThemedStyles();

  return (
    <FlatList<SearchResult>
      contentContainerStyle={styles.searchContent}
      data={searchMode === 'subject' ? subjects : people}
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      keyExtractor={(item) => String(item.id)}
      ListEmptyComponent={
        isPending ? (
          <AppState title="正在搜索" text="正在查询 Bangumi 条目。" />
        ) : isError ? (
          <AppState
            action={onRetry}
            title="搜索失败"
            text="请检查网络后重试。"
          />
        ) : (
          <AppState title="没有找到结果" text="可以尝试原名或更短的关键词。" />
        )
      }
      ListFooterComponent={
        subjects.length > 0 ? (
          <PagedListFooter
            hasNextPage={hasNextPage}
            isError={isFetchNextPageError}
            isFetching={isFetchingNextPage}
            loadedCount={subjects.length}
            onRetry={onLoadMore}
            total={total}
          />
        ) : null
      }
      ListHeaderComponent={
        <>
          <SearchField
            draft={draft}
            onChangeDraft={onChangeDraft}
            onSubmit={onSubmit}
          />
          <SubjectTypeTabs
            contentContainerStyle={styles.subjectTypeTabs}
            onChange={onChangeSearchType}
            selectedType={selectedSearchType}
            types={SEARCH_TYPES}
          />
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>搜索结果</Text>
              <Text style={styles.sectionMeta}>
                {searchMode === 'subject'
                  ? getSubjectTypeLabel(selectedSearchType)
                  : searchMode === 'character'
                    ? '角色'
                    : '人物'} · “{keyword}” ·{' '}
                {total
                  ? `${total} 个${searchMode === 'subject' ? '条目' : searchMode === 'character' ? '角色' : '人物'}`
                  : '查询中'}
              </Text>
            </View>
          </View>
        </>
      }
      onEndReached={() => {
        if (
          hasNextPage &&
          !isFetchingNextPage &&
          !isFetchNextPageError
        ) {
          onLoadMore();
        }
      }}
      onEndReachedThreshold={0.45}
      refreshControl={
        <AppRefreshControl
          onRefresh={onRefresh}
          refreshing={isRefetching && !isPending}
        />
      }
      renderItem={({ index, item }) => {
        if ('kind' in item) {
          return <PersonSearchResultRow item={item} />;
        }

        return (
        <View
          style={[
            styles.resultItem,
            index === 0 && styles.firstResultItem,
            index === subjects.length - 1 && styles.lastResultItem,
          ]}
        >
            <Pressable
              accessibilityHint="打开条目详情"
              accessibilityLabel={`${item.title}，${item.date?.slice(0, 4) ?? '时间待定'}${item.score ? `，${item.score.toFixed(1)} 分` : ''}`}
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: '/subject/[id]',
                  params: { id: String(item.id) },
                })
              }
              style={({ pressed }) => [
                styles.resultRow,
                index > 0 && styles.resultBorder,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.resultCover}>
                <Text style={styles.coverFallback}>
                  {item.title.slice(0, 1)}
                </Text>
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
              <View style={styles.resultMain}>
                <Text numberOfLines={2} style={styles.resultTitle}>
                  {item.title}
                </Text>
                <Text style={styles.resultMeta}>
                  {item.date?.slice(0, 4) ?? '时间待定'}
                  {item.score ? ` · ${item.score.toFixed(1)} 分` : ''}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
        </View>
        );
      }}
      showsVerticalScrollIndicator={false}
      style={styles.searchList}
    />
  );
}


const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  body: { backgroundColor: colors.background, flex: 1 },
  overviewList: { flex: 1 },
  content: { paddingBottom: 48, paddingHorizontal: 20 },
  searchList: { backgroundColor: colors.background, flex: 1 },
  searchContent: { paddingBottom: 48, paddingHorizontal: 20 },
  exploreEntries: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 18,
  },
  exploreEntry: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderCurve: 'continuous',
    borderRadius: 18,
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    minHeight: 58,
    paddingHorizontal: 13,
  },
  exploreEntryFeatured: { flexBasis: '100%', minHeight: 68, paddingHorizontal: 16 },
  exploreEntryIcon: {
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: 11,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  exploreEntryText: { flex: 1, marginLeft: 10, minWidth: 0, paddingRight: 5 },
  exploreEntryTitle: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  exploreEntryMeta: { color: colors.muted, fontSize: 11, marginTop: 3 },
  searchBar: {
    marginTop: 14,
  },
  subjectTypeTabs: { paddingBottom: 2, paddingTop: 12 },
  sectionHeader: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 16,
    paddingTop: 30,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  sectionMeta: { color: colors.muted, fontSize: 13, marginTop: 5 },
  dayTabs: { gap: 8, paddingBottom: 18 },
  dayTab: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  dayTabSelected: { backgroundColor: colors.accentSoft },
  dayTabText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  dayTabTextSelected: { color: colors.accent },
  calendarList: { gap: 14, paddingRight: 20 },
  calendarCard: { width: 126 },
  calendarCover: {
    alignItems: 'center',
    backgroundColor: colors.track,
    borderRadius: 18,
    height: 175,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 126,
  },
  coverFallback: { color: colors.subtle, fontSize: 20, fontWeight: '700' },
  calendarTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '700',
    minHeight: 38,
    lineHeight: 19,
    marginTop: 9,
  },
  calendarMeta: { color: colors.subtle, fontSize: 11, marginTop: 5 },
  resultItem: {
    backgroundColor: colors.surface,
    overflow: 'hidden',
    paddingHorizontal: 16,
  },
  firstResultItem: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  lastResultItem: {
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  rankingList: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    overflow: 'hidden',
    paddingHorizontal: 16,
  },
  resultRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 112,
    paddingVertical: 11,
  },
  resultBorder: {
    borderTopColor: colors.divider,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  resultCover: {
    alignItems: 'center',
    backgroundColor: colors.track,
    borderRadius: 11,
    height: 88,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 62,
  },
  resultMain: { flex: 1, marginLeft: 14 },
  resultTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 21,
  },
  resultMeta: { color: colors.subtle, fontSize: 12, marginTop: 7 },
  chevron: { color: colors.subtle, fontSize: 26, marginLeft: 8 },
  pressed: { opacity: 0.62 },
});
