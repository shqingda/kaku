import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SubjectTypeTabs } from '@/features/catalog/subject-type-tabs';
import { usePrefetchSubject } from '@/features/catalog/use-catalog-subject';
import {
  prefetchCharacter,
  prefetchPerson,
} from '@/features/people/use-public-entity';
import type { PublicPersonSummary } from '@/features/people-browser/model';
import { AppRefreshControl } from '@/features/shared/app-refresh-control';
import { AppState } from '@/features/shared/app-state';
import { PagedListFooter } from '@/features/shared/paged-list-footer';
import { SubjectSearchField } from '@/features/shared/subject-search-field';

import type { DiscoverSubject } from './model';
import {
  EXPLORE_SEARCH_TYPES,
  exploreSearchKindLabel,
  exploreSearchUnit,
  type ExploreSearchMode,
} from './explore-search';
import { useExploreStyles } from './explore-styles';

type SearchResult = DiscoverSubject | PublicPersonSummary;

export function ExploreSearchResults({
  draft,
  hasNextPage,
  isError,
  isFetchNextPageError,
  isFetchingNextPage,
  isPending,
  isRefetching,
  items,
  keyword,
  onChangeDraft,
  onChangeSearchTab,
  onLoadMore,
  onRefresh,
  onRetry,
  onSubmitSearch,
  searchMode,
  selectedSearchTab,
  total,
}: {
  draft: string;
  hasNextPage: boolean;
  isError: boolean;
  isFetchNextPageError: boolean;
  isFetchingNextPage: boolean;
  isPending: boolean;
  isRefetching: boolean;
  items: SearchResult[];
  keyword: string;
  onChangeDraft: (value: string) => void;
  onChangeSearchTab: (tabId: number) => void;
  onLoadMore: () => void;
  onRefresh: () => void;
  onRetry: () => void;
  onSubmitSearch: () => void;
  searchMode: ExploreSearchMode;
  selectedSearchTab: number;
  total: number;
}) {
  const { styles } = useExploreStyles();
  const kindLabel = exploreSearchKindLabel(searchMode, selectedSearchTab);
  const unit = exploreSearchUnit(searchMode);

  return (
    <FlatList<SearchResult>
      contentContainerStyle={styles.searchContent}
      data={items}
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
        items.length > 0 ? (
          <PagedListFooter
            hasNextPage={hasNextPage}
            isError={isFetchNextPageError}
            isFetching={isFetchingNextPage}
            loadedCount={items.length}
            onRetry={onLoadMore}
            total={total}
          />
        ) : null
      }
      ListHeaderComponent={
        <>
          <SubjectSearchField
            onChangeText={onChangeDraft}
            onSubmit={onSubmitSearch}
            style={styles.searchBar}
            value={draft}
          />
          <SubjectTypeTabs
            contentContainerStyle={styles.subjectTypeTabs}
            onChange={onChangeSearchTab}
            selectedType={selectedSearchTab}
            types={EXPLORE_SEARCH_TYPES}
          />
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>搜索结果</Text>
              <Text style={styles.sectionMeta}>
                {kindLabel} · “{keyword}” ·{' '}
                {total ? `${total} 个${unit}` : '查询中'}
              </Text>
            </View>
          </View>
        </>
      }
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage && !isFetchNextPageError) {
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
      renderItem={({ index, item }) =>
        'kind' in item ? (
          <PersonSearchResultRow item={item} />
        ) : (
          <SubjectSearchResultRow
            index={index}
            isLast={index === items.length - 1}
            item={item}
          />
        )
      }
      showsVerticalScrollIndicator={false}
      style={styles.searchList}
    />
  );
}

function PersonSearchResultRow({ item }: { item: PublicPersonSummary }) {
  const { styles } = useExploreStyles();
  const queryClient = useQueryClient();
  const pathname =
    item.kind === 'character' ? '/character/[id]' : '/person/[id]';

  return (
    <View
      style={[
        styles.resultItem,
        styles.firstResultItem,
        styles.lastResultItem,
      ]}
    >
      <Pressable
        accessibilityHint="打开人物详情"
        accessibilityLabel={`${item.name}，${item.kind === 'character' ? '角色' : '人物'}`}
        accessibilityRole="button"
        onPress={() =>
          router.push({ pathname, params: { id: String(item.id) } })
        }
        onPressIn={() => {
          if (item.kind === 'character') {
            prefetchCharacter(queryClient, item.id);
          } else {
            prefetchPerson(queryClient, item.id);
          }
        }}
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
          <Text maxFontSizeMultiplier={1.3} numberOfLines={2} style={styles.resultTitle}>
            {item.name}
          </Text>
          <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={styles.resultMeta}>
            {item.categories.join(' · ') ||
              (item.kind === 'character' ? '角色' : '人物')}
          </Text>
          {item.metadata ? (
            <Text maxFontSizeMultiplier={1.3} numberOfLines={2} style={styles.resultMeta}>
              {item.metadata}
            </Text>
          ) : null}
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
    </View>
  );
}

function SubjectSearchResultRow({
  index,
  isLast,
  item,
}: {
  index: number;
  isLast: boolean;
  item: DiscoverSubject;
}) {
  const { styles } = useExploreStyles();
  const prefetchSubject = usePrefetchSubject();

  return (
    <View
      style={[
        styles.resultItem,
        index === 0 && styles.firstResultItem,
        isLast && styles.lastResultItem,
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
        onPressIn={() => prefetchSubject.prefetch(item.id)}
        onPressOut={prefetchSubject.cancel}
        style={({ pressed }) => [
          styles.resultRow,
          index > 0 && styles.resultBorder,
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.resultCover}>
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
        <View style={styles.resultMain}>
          <Text maxFontSizeMultiplier={1.3} numberOfLines={2} style={styles.resultTitle}>
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
}
