import { useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {
  FlatList,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/design';
import { SubjectTypeTabs } from '@/features/catalog/subject-type-tabs';
import { getSubjectTypeLabel } from '@/features/catalog/subject-types';
import type { DiscoverSubject } from '@/features/discover/model';
import { PagedListFooter } from '@/features/shared/paged-list-footer';
import { RankedSubjectRow } from '@/features/discover/ranked-subject-row';
import {
  useBangumiCalendar,
  useBangumiRankedSubjects,
  useBangumiSearch,
} from '@/features/discover/use-discover';

function currentWeekdayId() {
  const day = new Date().getDay();
  return day === 0 ? 7 : day;
}

export default function ExploreScreen() {
  const { q } = useLocalSearchParams<{ q?: string }>();
  const initialKeyword = typeof q === 'string' ? q.trim() : '';
  const [draft, setDraft] = useState(initialKeyword);
  const [keyword, setKeyword] = useState(initialKeyword);
  const [selectedDay, setSelectedDay] = useState(currentWeekdayId);
  const [selectedSearchType, setSelectedSearchType] = useState(2);
  const calendarQuery = useBangumiCalendar();
  const rankedQuery = useBangumiRankedSubjects(selectedSearchType);
  const searchQuery = useBangumiSearch(keyword, selectedSearchType);
  const searchSubjects = useMemo(
    () => searchQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [searchQuery.data],
  );
  const searchTotal = searchQuery.data?.pages[0]?.total ?? 0;
  const selectedCalendarDay = useMemo(
    () =>
      calendarQuery.data?.find((day) => day.id === selectedDay) ??
      calendarQuery.data?.[0],
    [calendarQuery.data, selectedDay],
  );

  function submitSearch() {
    const nextKeyword = draft.trim();

    if (nextKeyword) {
      setKeyword(nextKeyword);
      Keyboard.dismiss();
    }
  }

  function updateDraft(value: string) {
    setDraft(value);

    if (!value) {
      setKeyword('');
    }
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen
        options={{
          headerBackButtonDisplayMode: 'minimal',
          headerShown: true,
          headerShadowVisible: false,
          title: '发现',
        }}
      />
      {keyword ? (
        <SearchResults
          draft={draft}
          hasNextPage={searchQuery.hasNextPage}
          isError={searchQuery.isError}
          isFetchNextPageError={searchQuery.isFetchNextPageError}
          isFetchingNextPage={searchQuery.isFetchingNextPage}
          isPending={searchQuery.isPending}
          keyword={keyword}
          onChangeDraft={updateDraft}
          onChangeSubjectType={setSelectedSearchType}
          onLoadMore={() => void searchQuery.fetchNextPage()}
          onRetry={() => void searchQuery.refetch()}
          onSubmit={submitSearch}
          subjects={searchSubjects}
          subjectType={selectedSearchType}
          total={searchTotal}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <SearchField
            draft={draft}
            onChangeDraft={updateDraft}
            onSubmit={submitSearch}
          />
          <SubjectTypeTabs
            contentContainerStyle={styles.subjectTypeTabs}
            onChange={setSelectedSearchType}
            selectedType={selectedSearchType}
          />
          <View>
            <Pressable
              onPress={() => router.push('/community')}
              style={({ pressed }) => [
                styles.communityEntry,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.communityCopy}>
                <View style={styles.communityIcon}>
                  <SymbolView
                    name={{
                      android: 'forum',
                      ios: 'bubble.left.and.bubble.right',
                      web: 'forum',
                    }}
                    size={19}
                    tintColor={COLORS.accent}
                  />
                </View>
                <View style={styles.communityText}>
                  <Text style={styles.communityTitle}>社区</Text>
                  <Text style={styles.communityMeta}>公开小组与最新话题</Text>
                </View>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>每日放送</Text>
                <Text style={styles.sectionMeta}>看看今天有哪些新节目</Text>
              </View>
            </View>

            {calendarQuery.isPending ? (
              <State title="正在读取放送表" text="本周动画加载中。" />
            ) : calendarQuery.isError ? (
              <State
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
                  {calendarQuery.data.map((day) => {
                    const isSelected = day.id === selectedCalendarDay?.id;

                    return (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        key={day.id}
                        onPress={() => setSelectedDay(day.id)}
                        style={[
                          styles.dayTab,
                          isSelected && styles.dayTabSelected,
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
                    <State title="今天暂无条目" text="放送表还没有相关数据。" />
                  }
                  renderItem={({ item }) => <CalendarCard item={item} />}
                  showsHorizontalScrollIndicator={false}
                />
              </>
            )}
            <RankingSection
              isError={rankedQuery.isError}
              isPending={rankedQuery.isPending}
              onRetry={() => void rankedQuery.refetch()}
              subjects={rankedQuery.data?.pages[0]?.items ?? []}
              subjectType={selectedSearchType}
            />
          </View>
        </ScrollView>
      )}
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
  return (
    <View style={styles.searchBar}>
      <SymbolView
        name={{ android: 'search', ios: 'magnifyingglass', web: 'search' }}
        size={17}
        tintColor={COLORS.subtle}
      />
      <TextInput
        clearButtonMode="while-editing"
        onChangeText={onChangeDraft}
        onSubmitEditing={onSubmit}
        placeholder="搜索条目"
        placeholderTextColor={COLORS.subtle}
        returnKeyType="search"
        style={styles.searchInput}
        value={draft}
      />
    </View>
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
  const subjectTypeLabel = getSubjectTypeLabel(subjectType);

  return (
    <View>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>{subjectTypeLabel}排行榜</Text>
          <Text style={styles.sectionMeta}>Bangumi 综合排名</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.push({
              pathname: '/rankings',
              params: { type: String(subjectType) },
            })
          }
          style={({ pressed }) => [
            styles.sectionAction,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.sectionActionText}>查看全部</Text>
          <Text style={styles.sectionActionChevron}>›</Text>
        </Pressable>
      </View>
      {isPending ? (
        <State
          title="正在读取排行榜"
          text={`高评分${subjectTypeLabel}加载中。`}
        />
      ) : isError ? (
        <State action={onRetry} title="排行榜读取失败" text="请稍后重试。" />
      ) : (
        <View style={styles.rankingList}>
          {subjects.slice(0, 10).map((item, index) => (
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
  return (
    <Pressable
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
            source={item.coverUrl}
            style={StyleSheet.absoluteFill}
            transition={140}
          />
        ) : null}
      </View>
      <Text ellipsizeMode="tail" numberOfLines={2} style={styles.calendarTitle}>
        {item.title}
      </Text>
      <Text style={styles.calendarMeta}>
        {item.score ? `${item.score.toFixed(1)} 分` : '暂无评分'}
      </Text>
    </Pressable>
  );
}

function SearchResults({
  draft,
  hasNextPage,
  isError,
  isFetchNextPageError,
  isFetchingNextPage,
  isPending,
  keyword,
  onChangeDraft,
  onChangeSubjectType,
  onLoadMore,
  onRetry,
  onSubmit,
  subjects,
  subjectType,
  total,
}: {
  draft: string;
  hasNextPage: boolean;
  isError: boolean;
  isFetchNextPageError: boolean;
  isFetchingNextPage: boolean;
  isPending: boolean;
  keyword: string;
  onChangeDraft: (value: string) => void;
  onChangeSubjectType: (subjectType: number) => void;
  onLoadMore: () => void;
  onRetry: () => void;
  onSubmit: () => void;
  subjects: DiscoverSubject[];
  subjectType: number;
  total: number;
}) {
  return (
    <FlatList
      contentContainerStyle={styles.searchContent}
      data={subjects}
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      keyExtractor={(item) => String(item.id)}
      ListEmptyComponent={
        isPending ? (
          <State title="正在搜索" text="正在查询 Bangumi 条目。" />
        ) : isError ? (
          <State
            action={onRetry}
            title="搜索失败"
            text="请检查网络后重试。"
          />
        ) : (
          <State title="没有找到结果" text="可以尝试原名或更短的关键词。" />
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
            onChange={onChangeSubjectType}
            selectedType={subjectType}
          />
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>搜索结果</Text>
              <Text style={styles.sectionMeta}>
                {getSubjectTypeLabel(subjectType)} · “{keyword}” ·{' '}
                {total ? `${total} 个条目` : '查询中'}
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
      renderItem={({ index, item }) => (
        <View
          style={[
            styles.resultItem,
            index === 0 && styles.firstResultItem,
            index === subjects.length - 1 && styles.lastResultItem,
          ]}
        >
            <Pressable
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
      )}
      showsVerticalScrollIndicator={false}
      style={styles.searchList}
    />
  );
}

function State({
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
        <Pressable onPress={action} style={styles.retry}>
          <Text style={styles.retryText}>重试</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: COLORS.background, flex: 1 },
  content: { paddingBottom: 48, paddingHorizontal: 20 },
  searchList: { flex: 1 },
  searchContent: { paddingBottom: 48, paddingHorizontal: 20 },
  communityEntry: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
    padding: 18,
  },
  communityTitle: { color: COLORS.ink, fontSize: 17, fontWeight: '800' },
  communityMeta: { color: COLORS.muted, fontSize: 12, marginTop: 5 },
  communityCopy: { alignItems: 'center', flexDirection: 'row' },
  communityIcon: {
    alignItems: 'center',
    backgroundColor: COLORS.accentSoft,
    borderRadius: 14,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  communityText: { marginLeft: 13 },
  searchBar: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 17,
    flexDirection: 'row',
    marginTop: 14,
    paddingHorizontal: 15,
  },
  searchInput: {
    color: COLORS.ink,
    flex: 1,
    fontSize: 16,
    height: 50,
    marginLeft: 9,
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
    color: COLORS.ink,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  sectionMeta: { color: COLORS.muted, fontSize: 13, marginTop: 5 },
  sectionAction: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingBottom: 3,
    paddingLeft: 12,
    paddingVertical: 6,
  },
  sectionActionText: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  sectionActionChevron: {
    color: COLORS.accent,
    fontSize: 20,
    marginLeft: 3,
  },
  dayTabs: { gap: 8, paddingBottom: 18 },
  dayTab: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  dayTabSelected: { backgroundColor: COLORS.accentSoft },
  dayTabText: { color: COLORS.muted, fontSize: 13, fontWeight: '700' },
  dayTabTextSelected: { color: COLORS.accent },
  calendarList: { gap: 14, paddingRight: 20 },
  calendarCard: { width: 126 },
  calendarCover: {
    alignItems: 'center',
    backgroundColor: COLORS.track,
    borderRadius: 18,
    height: 175,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 126,
  },
  coverFallback: { color: COLORS.subtle, fontSize: 20, fontWeight: '700' },
  calendarTitle: {
    color: COLORS.ink,
    fontSize: 14,
    fontWeight: '700',
    height: 38,
    lineHeight: 19,
    marginTop: 9,
  },
  calendarMeta: { color: COLORS.subtle, fontSize: 11, marginTop: 5 },
  resultItem: {
    backgroundColor: COLORS.surface,
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
    backgroundColor: COLORS.surface,
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
    borderTopColor: COLORS.track,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  resultCover: {
    alignItems: 'center',
    backgroundColor: COLORS.track,
    borderRadius: 11,
    height: 88,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 62,
  },
  resultMain: { flex: 1, marginLeft: 14 },
  resultTitle: {
    color: COLORS.ink,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 21,
  },
  resultMeta: { color: COLORS.subtle, fontSize: 12, marginTop: 7 },
  chevron: { color: COLORS.subtle, fontSize: 26, marginLeft: 8 },
  state: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    minWidth: 300,
    padding: 30,
  },
  stateTitle: { color: COLORS.ink, fontSize: 17, fontWeight: '800' },
  stateText: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
    textAlign: 'center',
  },
  retry: {
    backgroundColor: COLORS.accentSoft,
    borderRadius: 13,
    marginTop: 15,
    paddingHorizontal: 17,
    paddingVertical: 9,
  },
  retryText: { color: COLORS.accent, fontSize: 13, fontWeight: '800' },
  pressed: { opacity: 0.62 },
});
