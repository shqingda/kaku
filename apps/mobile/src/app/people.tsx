import { useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { Link, Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/constants/theme';
import { AppRefreshControl } from '@/features/shared/app-refresh-control';
import { AppState } from '@/features/shared/app-state';
import { CachedDataNotice } from '@/features/shared/cached-data-notice';
import {
  CHARACTER_TYPES,
  PEOPLE_GENDERS,
  PEOPLE_KINDS,
  PEOPLE_SORTS,
  PERSON_TYPES,
  type PeopleKind,
  type PeopleSort,
  type PublicPersonSummary,
} from '@/features/people-browser/model';
import { useGlobalPeople } from '@/features/people-browser/use-global-people';
import { PagedListFooter } from '@/features/shared/paged-list-footer';
import { SubjectSearchField } from '@/features/shared/subject-search-field';
import { usePeopleSearch } from '@/features/people-browser/use-people-search';
import { useTheme } from '@/features/theme/theme-provider';

export default function PeopleScreen() {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [kind, setKind] = useState<PeopleKind>('character');
  const [sort, setSort] = useState<PeopleSort>('collects');
  const [type, setType] = useState<number>();
  const [gender, setGender] = useState<number>();
  const [draft, setDraft] = useState('');
  const [keyword, setKeyword] = useState('');
  const peopleQuery = useGlobalPeople(
    kind,
    sort,
    type,
    gender,
    !keyword,
  );
  const searchQuery = usePeopleSearch(kind, keyword);
  const activeQuery = keyword ? searchQuery : peopleQuery;
  const people = useMemo(
    () => activeQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [activeQuery.data],
  );
  const typeOptions = kind === 'character' ? CHARACTER_TYPES : PERSON_TYPES;
  const totalPages = peopleQuery.data?.pages[0]?.totalPages;

  function changeKind(nextKind: PeopleKind) {
    setKind(nextKind);
    setType(undefined);
    setGender(undefined);
  }

  function updateDraft(value: string) {
    setDraft(value);
    if (!value) setKeyword('');
  }

  function submitSearch() {
    const nextKeyword = draft.trim();
    if (!nextKeyword) return;
    setKeyword(nextKeyword);
    Keyboard.dismiss();
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen options={{ title: '人物' }} />
      <FlatList
        contentContainerStyle={styles.content}
        data={people}
        initialNumToRender={10}
        key={keyword ? `search:${kind}` : `browse:${kind}`}
        keyExtractor={(item) => `${item.kind}-${item.id}`}
        ListEmptyComponent={
          activeQuery.isPending ? (
            <AppState
              title={keyword ? '正在搜索' : '人物加载中'}
              text={keyword ? `正在查找“${keyword}”。` : '正在读取 Bangumi 公开人物资料。'}
            />
          ) : activeQuery.isError ? (
            <AppState
              action={() => void activeQuery.refetch()}
              title={keyword ? '搜索失败' : '人物读取失败'}
              text="Bangumi 偶尔会响应较慢，请稍后重试。"
            />
          ) : (
            <AppState
              title={keyword ? '没有搜索结果' : '暂无人物'}
              text={keyword ? `没有找到与“${keyword}”相关的资料。` : '当前筛选条件下没有找到资料。'}
            />
          )
        }
        ListFooterComponent={
          people.length > 0 ? (
            <PagedListFooter
              hasNextPage={Boolean(activeQuery.hasNextPage)}
              isError={activeQuery.isFetchNextPageError}
              isFetching={activeQuery.isFetchingNextPage}
              loadedCount={people.length}
              onRetry={() => void activeQuery.fetchNextPage()}
              total={keyword ? searchQuery.data?.pages[0]?.total : undefined}
            />
          ) : null
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>人物</Text>
            <Text style={styles.meta}>
              {keyword
                ? `搜索${kind === 'character' ? '虚构角色' : '现实人物'}`
                : `浏览虚构角色与现实人物${totalPages ? ` · ${totalPages} 页` : ''}`}
            </Text>
            <SubjectSearchField
              accessibilityLabel="搜索角色或人物"
              onChangeText={updateDraft}
              onSubmit={submitSearch}
              placeholder={kind === 'character' ? '搜索虚构角色' : '搜索现实人物'}
              style={styles.searchField}
              value={draft}
            />
            <View style={styles.kindTabs}>
              {PEOPLE_KINDS.map((item) => (
                <FilterButton
                  key={item.id}
                  label={item.label}
                  onPress={() => changeKind(item.id)}
                  selected={kind === item.id}
                  wide
                />
              ))}
            </View>
            {keyword ? (
              <View style={styles.searchSummary}>
                <Text numberOfLines={1} style={styles.searchSummaryText}>
                  “{keyword}” · {searchQuery.data?.pages[0]?.total ?? 0} 个结果
                </Text>
                <Pressable
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => {
                    setDraft('');
                    setKeyword('');
                  }}
                  style={({ pressed }) => pressed && styles.pressed}
                >
                  <Text style={styles.clearSearch}>清除</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <FilterRow label="排序">
                  {PEOPLE_SORTS.map((item) => (
                    <FilterButton
                      key={item.id}
                      label={item.label}
                      onPress={() => setSort(item.id)}
                      selected={sort === item.id}
                    />
                  ))}
                </FilterRow>
                <FilterRow label="类型">
                  {typeOptions.map((item) => (
                    <FilterButton
                      key={item.id ?? 'all'}
                      label={item.label}
                      onPress={() => setType(item.id)}
                      selected={type === item.id}
                    />
                  ))}
                </FilterRow>
                <FilterRow label="性别">
                  {PEOPLE_GENDERS.map((item) => (
                    <FilterButton
                      key={item.id ?? 'all'}
                      label={item.label}
                      onPress={() => setGender(item.id)}
                      selected={gender === item.id}
                    />
                  ))}
                </FilterRow>
              </>
            )}
            {people.length > 0 && activeQuery.isError ? (
              <CachedDataNotice onRetry={() => void activeQuery.refetch()} />
            ) : null}
          </View>
        }
        maxToRenderPerBatch={10}
        onEndReached={() => {
          if (
            activeQuery.hasNextPage &&
            !activeQuery.isFetchingNextPage &&
            !activeQuery.isFetchNextPageError
          ) {
            void activeQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.45}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <AppRefreshControl
            onRefresh={() => void activeQuery.refetch()}
            refreshing={activeQuery.isRefetching && !activeQuery.isPending}
          />
        }
        removeClippedSubviews={Platform.OS === 'android'}
        renderItem={({ index, item }) => (
          <PersonRow
            hasDivider={index > 0}
            isFirst={index === 0}
            isLast={index === people.length - 1}
            item={item}
          />
        )}
        showsVerticalScrollIndicator={false}
        windowSize={7}
      />
    </SafeAreaView>
  );
}

function FilterRow({ children, label }: { children: React.ReactNode; label: string }) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.filterSection}>
      <Text style={styles.filterLabel}>{label}</Text>
      <ScrollView
        contentContainerStyle={styles.filterOptions}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </View>
  );
}

function FilterButton({ label, onPress, selected, wide = false }: {
  label: string;
  onPress: () => void;
  selected: boolean;
  wide?: boolean;
}) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.filter,
        wide && styles.kindTab,
        selected && styles.filterSelected,
      ]}
    >
      <Text style={[styles.filterText, selected && styles.filterTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

function PersonRow({ hasDivider, isFirst, isLast, item }: {
  hasDivider: boolean;
  isFirst: boolean;
  isLast: boolean;
  item: PublicPersonSummary;
}) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const pathname = item.kind === 'character' ? '/character/[id]' : '/person/[id]';
  return (
    <View style={[
      styles.rowCard,
      isFirst && styles.firstRowCard,
      isLast && styles.lastRowCard,
    ]}>
      <Link asChild href={{ pathname, params: { id: String(item.id) } }}>
        <Pressable
          android_ripple={{ color: colors.track }}
          style={StyleSheet.flatten([
            styles.row,
            hasDivider && styles.rowDivider,
          ])}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarFallback}>{item.name.slice(0, 1)}</Text>
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
          <View style={styles.rowMain}>
            <Text numberOfLines={2} style={styles.rowTitle}>{item.name}</Text>
            {item.categories.length > 0 ? (
              <Text numberOfLines={1} style={styles.categories}>
                {item.categories.join(' · ')}
              </Text>
            ) : null}
            <Text numberOfLines={2} style={styles.rowMeta}>
              {item.metadata || (item.kind === 'character' ? '虚构角色' : '现实人物')}
            </Text>
          </View>
          <View style={styles.trailing}>
            {item.commentCount > 0 ? (
              <View style={styles.commentCount}>
                <SymbolView
                  name={{ android: 'chat_bubble_outline', ios: 'bubble.left', web: 'chat_bubble_outline' }}
                  size={11}
                  tintColor={colors.subtle}
                />
                <Text style={styles.commentText}>{item.commentCount}</Text>
              </View>
            ) : null}
            <Text style={styles.chevron}>›</Text>
          </View>
        </Pressable>
      </Link>
    </View>
  );
}


const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  content: { paddingBottom: 48, paddingHorizontal: 20 },
  header: { paddingBottom: 18, paddingTop: 20 },
  title: { color: colors.ink, fontSize: 30, fontWeight: '800', letterSpacing: -0.8 },
  meta: { color: colors.muted, fontSize: 13, marginTop: 6 },
  searchField: { marginTop: 20 },
  kindTabs: { flexDirection: 'row', gap: 8, marginTop: 12 },
  kindTab: { flex: 1, minHeight: 44 },
  filterSection: { alignItems: 'center', flexDirection: 'row', marginTop: 12 },
  filterLabel: { color: colors.subtle, fontSize: 11, fontWeight: '700', width: 40 },
  filterOptions: { gap: 8, paddingRight: 12 },
  filter: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 15,
  },
  filterSelected: { backgroundColor: colors.ink },
  filterText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  filterTextSelected: { color: colors.surface },
  searchSummary: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: 4,
  },
  searchSummaryText: { color: colors.muted, flex: 1, fontSize: 13 },
  clearSearch: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  rowCard: { backgroundColor: colors.surface, paddingHorizontal: 16 },
  firstRowCard: { borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  lastRowCard: { borderBottomLeftRadius: 22, borderBottomRightRadius: 22 },
  row: { alignItems: 'center', flexDirection: 'row', minHeight: 122, paddingVertical: 16 },
  rowDivider: { borderTopColor: colors.divider, borderTopWidth: StyleSheet.hairlineWidth },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: 18,
    height: 86,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 70,
  },
  avatarFallback: { color: colors.accent, fontSize: 20, fontWeight: '800' },
  rowMain: { flex: 1, marginLeft: 14, minWidth: 0 },
  rowTitle: { color: colors.ink, fontSize: 16, fontWeight: '800', lineHeight: 22 },
  categories: { color: colors.accentRich, fontSize: 12, fontWeight: '700', marginTop: 7 },
  rowMeta: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 7 },
  trailing: { alignItems: 'flex-end', alignSelf: 'stretch', justifyContent: 'space-between', marginLeft: 8, paddingVertical: 5 },
  commentCount: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  commentText: { color: colors.subtle, fontSize: 10, fontWeight: '600' },
  chevron: { color: colors.subtle, fontSize: 26, fontWeight: '300' },
  pressed: { opacity: 0.62 },
});
