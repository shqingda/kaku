import { useCallback, useEffect, useMemo, useState } from 'react';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Keyboard, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExploreOverviewBody } from '@/features/discover/explore-overview';
import {
  exploreSearchTabId,
  parseExploreSearchTab,
  type ExploreSearchMode,
} from '@/features/discover/explore-search';
import { ExploreSearchResults } from '@/features/discover/explore-search-results';
import { useExploreStyles } from '@/features/discover/explore-styles';
import {
  currentCalendarWeekdayId,
  type CalendarDay,
  type DiscoverSubject,
} from '@/features/discover/model';
import { useExploreSearch } from '@/features/discover/use-explore-search';
import {
  useBangumiCalendar,
  useBangumiRankedSubjects,
} from '@/features/discover/use-discover';
import { RecentSubjectsSection } from '@/features/history/recent-subjects-section';
import { useRecentSubjects } from '@/features/history/recent-subjects-provider';
import { RecentSearches } from '@/features/search/recent-searches';
import { useSearchDraft } from '@/features/search/search-draft';
import { useSearchHistory } from '@/features/search/search-history-provider';
import { AppRefreshControl } from '@/features/shared/app-refresh-control';
import { ScrollToTopButton } from '@/features/shared/scroll-to-top-button';
import { SubjectSearchField } from '@/features/shared/subject-search-field';
import { useScrollToTopButton } from '@/features/shared/use-scroll-to-top-button';
import { readInfiniteItems, readQueryArray } from '@/lib/query-data';

export default function ExploreScreen() {
  const { styles } = useExploreStyles();
  const { q } = useLocalSearchParams<{ q?: string }>();
  const initialKeyword = typeof q === 'string' ? q.trim() : '';
  const [draft, setDraft] = useSearchDraft();
  const [keyword, setKeyword] = useState(initialKeyword);
  const [selectedDay, setSelectedDay] = useState(currentCalendarWeekdayId);
  const [selectedSearchType, setSelectedSearchType] = useState(2);
  const [searchMode, setSearchMode] = useState<ExploreSearchMode>('subject');
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
  const {
    handleScroll: handleOverviewScroll,
    ref: overviewScrollRef,
    scrollToTop: scrollOverviewToTop,
    visible: overviewScrollVisible,
  } = useScrollToTopButton();
  const calendarQuery = useBangumiCalendar(selectedSearchType === 2);
  const rankedQuery = useBangumiRankedSubjects(selectedSearchType);
  const search = useExploreSearch(keyword, selectedSearchType, searchMode);
  const calendarDays = useMemo(
    () => readQueryArray<CalendarDay>(calendarQuery.data),
    [calendarQuery.data],
  );
  const rankedSubjects = useMemo(
    () => readInfiniteItems<DiscoverSubject>(rankedQuery.data),
    [rankedQuery.data],
  );
  const selectedCalendarDay = useMemo(
    () =>
      calendarDays.find((day) => day.id === selectedDay) ?? calendarDays[0],
    [calendarDays, selectedDay],
  );

  // 首页再次提交搜索时，Expo Router 会复用已挂载的 Explore 屏并只更新
  // query 参数；useState 的初始值不会重新计算，因此把新 q 同步回本地
  // state。搜索历史由首页提交时写入，这里不再重复记录。
  useEffect(() => {
    if (!initialKeyword) return;
    setDraft(initialKeyword);
    setKeyword(initialKeyword);
  }, [initialKeyword, setDraft]);

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

  function updateDraft(value: string) {
    setDraft(value);
    if (!value) setKeyword('');
  }

  function applySearchTab(tabId: number) {
    const next = parseExploreSearchTab(tabId);
    setSearchMode(next.mode);
    if (next.subjectType !== undefined) {
      setSelectedSearchType(next.subjectType);
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
    void search.refetch();
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
        <View style={styles.searchSlot}>
          <SubjectSearchField
            onChangeText={updateDraft}
            onSubmit={submitSearch}
            style={styles.searchBar}
            value={draft}
          />
        </View>
        <View style={styles.pane}>
          <ScrollView
            accessibilityElementsHidden={Boolean(keyword)}
            contentContainerStyle={styles.content}
            importantForAccessibility={
              keyword ? 'no-hide-descendants' : 'auto'
            }
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            onScroll={handleOverviewScroll}
            pointerEvents={keyword ? 'none' : 'auto'}
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
            {!draft ? (
              <>
                <RecentSearches
                  items={recentSearches}
                  onClear={clearSearchHistory}
                  onSelect={selectRecentSearch}
                />
                <RecentSubjectsSection
                  items={recentSubjects}
                  onClear={() => void clearRecentSubjects()}
                />
              </>
            ) : null}
            <ExploreOverviewBody
              calendarDays={calendarDays}
              calendarError={calendarQuery.isError}
              calendarPending={calendarQuery.isPending}
              hasCalendarData={Boolean(calendarQuery.data)}
              onChangeDay={setSelectedDay}
              onChangeSearchType={setSelectedSearchType}
              onRetryCalendar={() => void calendarQuery.refetch()}
              onRetryRanking={() => void rankedQuery.refetch()}
              rankingError={rankedQuery.isError}
              rankingPending={rankedQuery.isPending}
              rankedSubjects={rankedSubjects}
              selectedCalendarDay={selectedCalendarDay}
              selectedSearchType={selectedSearchType}
            />
          </ScrollView>
          {keyword ? (
            <View style={styles.searchOverlay}>
              <ExploreSearchResults
                hasNextPage={Boolean(search.hasNextPage)}
                isError={search.isError}
                isFetchNextPageError={search.isFetchNextPageError}
                isFetchingNextPage={search.isFetchingNextPage}
                isPending={search.isPending}
                isRefetching={search.isRefetching}
                items={search.items}
                keyword={keyword}
                onChangeSearchTab={applySearchTab}
                onLoadMore={() => void search.fetchNextPage()}
                onRefresh={refreshSearchResults}
                onRetry={() => void search.refetch()}
                searchMode={searchMode}
                selectedSearchTab={exploreSearchTabId(
                  searchMode,
                  selectedSearchType,
                )}
                total={search.total}
              />
            </View>
          ) : null}
        </View>
      </View>
      <ScrollToTopButton
        onPress={scrollOverviewToTop}
        visible={overviewScrollVisible && !keyword}
      />
    </SafeAreaView>
  );
}
