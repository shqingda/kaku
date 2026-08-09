import { useMemo } from 'react';
import { Image } from 'expo-image';
import {
  type Href,
  Link,
  router,
  Stack,
  useLocalSearchParams,
} from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/design';
import { getSubjectTypeLabel } from '@/features/catalog/subject-types';
import { DiscussionStatus } from '@/features/discussions/discussion-status';
import {
  usePublicIndex,
  usePublicIndexItems,
} from '@/features/indexes/use-indexes';
import type { PublicIndexItem } from '@/features/indexes/model';
import { PagedListFooter } from '@/features/shared/paged-list-footer';
import { InvalidRouteState } from '@/features/shared/invalid-route-state';
import { parsePositiveIntegerRouteParam } from '@/lib/route-params';

export default function PublicIndexScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const indexId = parsePositiveIntegerRouteParam(id);
  const indexQuery = usePublicIndex(indexId ?? 0);
  const itemsQuery = usePublicIndexItems(indexId ?? 0);
  const index = indexQuery.data;
  const items = useMemo(
    () => itemsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [itemsQuery.data],
  );
  const itemTotal = itemsQuery.data?.pages[0]?.total ?? 0;

  if (!indexId) {
    return <InvalidRouteState message="这个目录链接缺少有效编号。" />;
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen options={{ title: index?.title ?? '目录' }} />
      <FlatList
        contentContainerStyle={styles.content}
        data={items}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        ListEmptyComponent={
          itemsQuery.isPending ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>正在读取目录条目。</Text>
            </View>
          ) : itemsQuery.isError ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>目录条目读取失败。</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => void itemsQuery.refetch()}
                style={({ pressed }) => [
                  styles.retry,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.retryText}>重试</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>目录中暂无条目。</Text>
            </View>
          )
        }
        ListFooterComponent={
          items.length > 0 ? (
            <PagedListFooter
              hasNextPage={Boolean(itemsQuery.hasNextPage)}
              isError={itemsQuery.isFetchNextPageError}
              isFetching={itemsQuery.isFetchingNextPage}
              loadedCount={items.length}
              onRetry={() => void itemsQuery.fetchNextPage()}
              total={itemTotal}
            />
          ) : null
        }
        ListHeaderComponent={
          <>
            <DiscussionStatus
              errorText="目录读取失败，请检查网络后重试。"
              isError={indexQuery.isError}
              isPending={indexQuery.isPending}
              loadingText="正在读取目录内容…"
              onRetry={() => void indexQuery.refetch()}
            />
            {index ? (
              <View style={styles.headerCard}>
                <Text style={styles.title}>{index.title}</Text>
                {index.authorUsername ? (
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: '/user/[username]',
                        params: { username: index.authorUsername! },
                      })
                    }
                  >
                    <Text style={styles.author}>{index.author}</Text>
                  </Pressable>
                ) : (
                  <Text style={styles.author}>{index.author}</Text>
                )}
                {index.description ? (
                  <Text style={styles.description}>{index.description}</Text>
                ) : null}
                <Text style={styles.stats}>
                  {index.itemCount} 项 · {index.collects} 收藏 ·{' '}
                  {index.replyCount} 回复
                </Text>
              </View>
            ) : null}
            {index ? (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>收录条目</Text>
                <Text style={styles.sectionMeta}>
                  已加载 {items.length} · 共 {itemTotal.toLocaleString('zh-CN')}
                </Text>
              </View>
            ) : null}
          </>
        }
        onEndReached={() => {
          if (
            itemsQuery.hasNextPage &&
            !itemsQuery.isFetchingNextPage &&
            !itemsQuery.isFetchNextPageError
          ) {
            void itemsQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.45}
        onRefresh={() =>
          void Promise.all([indexQuery.refetch(), itemsQuery.refetch()])
        }
        refreshing={
          (indexQuery.isRefetching || itemsQuery.isRefetching) &&
          !indexQuery.isPending &&
          !itemsQuery.isPending
        }
        renderItem={({ item }) => {
          const href = getIndexItemHref(item);
          const row = (
            <Pressable
              accessibilityHint={href ? '进入详情' : undefined}
              accessibilityLabel={`打开${item.title}`}
              accessibilityRole="button"
              style={styles.subjectRow}
            >
              {href ? <Link.AppleZoom>
                <View style={styles.cover}>
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
              </Link.AppleZoom> : (
                <View style={styles.cover}>
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
              )}
              <View style={styles.subjectMain}>
                <Text numberOfLines={2} style={styles.subjectTitle}>
                  {item.title}
                </Text>
                <Text numberOfLines={2} style={styles.subjectMeta}>
                  {getIndexItemLabel(item)}
                  {item.kind === 'subject'
                    ? ` · ${item.score ? `${item.score.toFixed(1)} 分` : '暂无评分'}`
                    : ''}
                  {item.comment ? ` · ${item.comment}` : ''}
                </Text>
              </View>
              <SymbolView
                name={{
                  android: 'chevron_right',
                  ios: 'chevron.right',
                  web: 'chevron_right',
                }}
                size={14}
                tintColor={COLORS.subtle}
                weight="semibold"
              />
            </Pressable>
          );

          return href ? <Link asChild href={href}>{row}</Link> : row;
        }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

function getIndexItemLabel(item: PublicIndexItem) {
  if (item.kind === 'subject' && item.type) {
    return getSubjectTypeLabel(item.type);
  }
  return {
    blog: '日志',
    character: '角色',
    episode: '章节',
    groupTopic: '小组话题',
    person: '人物',
    subject: '条目',
    subjectTopic: '条目话题',
  }[item.kind];
}

function getIndexItemHref(item: PublicIndexItem): Href | undefined {
  switch (item.kind) {
    case 'subject':
      return { pathname: '/subject/[id]', params: { id: String(item.id) } };
    case 'character':
      return { pathname: '/character/[id]', params: { id: String(item.id) } };
    case 'person':
      return { pathname: '/person/[id]', params: { id: String(item.id) } };
    case 'blog':
      return { pathname: '/blog/[id]', params: { id: String(item.id) } };
    case 'groupTopic':
      return {
        pathname: '/group/topic/[id]',
        params: { id: String(item.id) },
      };
    case 'episode':
      return item.parentId && item.episodeNumber
        ? {
            pathname: '/subject/[id]/episode/[episodeNumber]',
            params: {
              episodeNumber: String(item.episodeNumber),
              id: String(item.parentId),
            },
          }
        : undefined;
    case 'subjectTopic':
      return item.parentId
        ? {
            pathname: '/subject/[id]/topic/[topicId]',
            params: {
              id: String(item.parentId),
              topicId: String(item.id),
            },
          }
        : undefined;
  }
}

const styles = StyleSheet.create({
  screen: { backgroundColor: COLORS.background, flex: 1 },
  content: { gap: 10, padding: 20, paddingBottom: 44 },
  headerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: 20,
  },
  title: {
    color: COLORS.ink,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  author: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },
  description: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 16,
  },
  stats: { color: COLORS.subtle, fontSize: 12, marginTop: 14 },
  sectionTitle: {
    color: COLORS.ink,
    fontSize: 19,
    fontWeight: '800',
  },
  sectionHeader: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingTop: 14,
  },
  sectionMeta: { color: COLORS.subtle, fontSize: 12 },
  subjectRow: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    flexDirection: 'row',
    minHeight: 92,
    padding: 10,
  },
  cover: {
    alignItems: 'center',
    backgroundColor: COLORS.track,
    borderRadius: 11,
    height: 72,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 51,
  },
  coverFallback: { color: COLORS.subtle, fontSize: 14, fontWeight: '700' },
  subjectMain: { flex: 1, marginLeft: 13 },
  subjectTitle: {
    color: COLORS.ink,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  subjectMeta: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  pressed: { opacity: 0.62 },
  empty: { alignItems: 'center', padding: 28 },
  emptyText: { color: COLORS.muted, fontSize: 14 },
  retry: {
    backgroundColor: COLORS.accentSoft,
    borderRadius: 12,
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  retryText: { color: COLORS.accent, fontSize: 13, fontWeight: '800' },
});
