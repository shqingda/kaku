import { userErrorMessage } from '@/lib/user-error-message';
import { useMemo, useState } from 'react';
import { Image } from 'expo-image';
import {
  type Href,
  Link,
  router,
  Stack,
  useLocalSearchParams,
  usePathname,
} from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/constants/theme';
import { rememberReturnTo } from '@/lib/auth-redirect';
import { useAuth } from '@/features/auth/auth-provider';
import { getSubjectTypeLabel } from '@/features/catalog/subject-types';
import { DiscussionStatus } from '@/features/discussions/discussion-status';
import { IndexComposer } from '@/features/indexes/index-composer';
import {
  usePublicIndex,
  usePublicIndexItems,
} from '@/features/indexes/use-indexes';
import { useDeleteIndex } from '@/features/indexes/use-create-index';
import {
  useIndexCollection,
  useSetIndexCollection,
} from '@/features/indexes/use-index-collection';
import type { PublicIndexItem } from '@/features/indexes/model';
import { PagedListFooter } from '@/features/shared/paged-list-footer';
import { AppRefreshControl } from '@/features/shared/app-refresh-control';
import { AppState } from '@/features/shared/app-state';
import { InvalidRouteState } from '@/features/shared/invalid-route-state';
import { useTheme } from '@/features/theme/theme-provider';
import { parsePositiveIntegerRouteParam } from '@/lib/route-params';

export default function PublicIndexScreen() {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const pathname = usePathname();
  const { session } = useAuth();
  const [composerVisible, setComposerVisible] = useState(false);
  const indexId = parsePositiveIntegerRouteParam(id);
  const indexQuery = usePublicIndex(indexId ?? 0);
  const itemsQuery = usePublicIndexItems(indexId ?? 0);
  const deleteIndex = useDeleteIndex();
  const collectionQuery = useIndexCollection(indexId ?? 0);
  const setCollection = useSetIndexCollection(indexId ?? 0);
  const index = indexQuery.data;
  const items = useMemo(
    () => itemsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [itemsQuery.data],
  );
  const itemTotal = itemsQuery.data?.pages[0]?.total ?? 0;
  const isOwnIndex =
    Boolean(session) && index?.authorUsername === session?.user.username;

  function openMenu() {
    if (!index) {
      return;
    }

    Alert.alert(index.title, undefined, [
      {
        onPress: () => setComposerVisible(true),
        text: '编辑目录',
      },
      {
        onPress: confirmDelete,
        style: 'destructive',
        text: '删除目录',
      },
      { style: 'cancel', text: '取消' },
    ]);
  }

  function confirmDelete() {
    if (!indexId) {
      return;
    }

    Alert.alert(
      '删除这个目录？',
      '目录及其收录条目会被永久删除，无法恢复。',
      [
        { style: 'cancel', text: '取消' },
        {
          onPress: () => {
            deleteIndex.mutate(indexId, {
              onError: (error) => Alert.alert('目录没有删除', userErrorMessage(error)),
              onSuccess: () => router.back(),
            });
          },
          style: 'destructive',
          text: '删除',
        },
      ],
    );
  }

  function toggleCollection() {
    if (!indexId) {
      return;
    }

    if (!session) {
      Alert.alert(
        '登录后收藏目录',
        '收藏会保存到你的 Bangumi 账户。',
        [
          { style: 'cancel', text: '取消' },
          {
            onPress: () => {
              rememberReturnTo(pathname);
              router.push('/account');
            },
            text: '去登录',
          },
        ],
      );
      return;
    }

    const collected = collectionQuery.data === true;
    setCollection.mutate(!collected, {
      onError: (error) => Alert.alert('收藏没有保存', userErrorMessage(error)),
    });
  }

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
            <AppState text="正在读取目录条目。" title="条目加载中" />
          ) : itemsQuery.isError ? (
            <AppState
              action={() => void itemsQuery.refetch()}
              text="请检查网络后重试。"
              title="目录条目读取失败"
            />
          ) : (
            <AppState text="目录中暂无条目。" title="暂无条目" />
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
                <View style={styles.titleRow}>
                  <Text style={styles.title}>{index.title}</Text>
                  {isOwnIndex ? (
                    <Pressable
                      accessibilityLabel="更多目录操作"
                      accessibilityRole="button"
                      hitSlop={8}
                      onPress={openMenu}
                      style={({ pressed }) => [
                        styles.overflowButton,
                        pressed && styles.pressed,
                      ]}
                    >
                      <SymbolView
                        name={{
                          android: 'more_horiz',
                          ios: 'ellipsis',
                          web: 'more_horiz',
                        }}
                        size={17}
                        tintColor={colors.muted}
                        weight="semibold"
                      />
                    </Pressable>
                  ) : null}
                </View>
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
                <Pressable
                  accessibilityLabel={
                    collectionQuery.data ? '取消收藏目录' : '收藏目录'
                  }
                  accessibilityRole="button"
                  accessibilityState={{ busy: setCollection.isPending }}
                  disabled={setCollection.isPending}
                  onPress={toggleCollection}
                  style={({ pressed }) => [
                    styles.collectButton,
                    collectionQuery.data && styles.collectedButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <SymbolView
                    name={
                      collectionQuery.data
                        ? { android: 'star', ios: 'star.fill', web: 'star' }
                        : { android: 'star_outline', ios: 'star', web: 'star_outline' }
                    }
                    size={14}
                    tintColor={
                      collectionQuery.data ? colors.surface : colors.accent
                    }
                    weight="semibold"
                  />
                  <Text
                    style={[
                      styles.collectText,
                      collectionQuery.data && styles.collectedText,
                    ]}
                  >
                    {collectionQuery.data ? '已收藏' : '收藏目录'}
                  </Text>
                </Pressable>
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
        refreshControl={
          <AppRefreshControl
            onRefresh={() =>
              void Promise.all([indexQuery.refetch(), itemsQuery.refetch()])
            }
            refreshing={
              (indexQuery.isRefetching || itemsQuery.isRefetching) &&
              !indexQuery.isPending &&
              !itemsQuery.isPending
            }
          />
        }
        renderItem={({ item }) => {
          const href = getIndexItemHref(item);
          const row = (
            <Pressable
              accessibilityHint={href ? '进入详情' : undefined}
              accessibilityLabel={`打开${item.title}`}
              accessibilityRole={href ? 'button' : undefined}
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
                      recyclingKey={item.coverUrl}
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
                      recyclingKey={item.coverUrl}
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
                tintColor={colors.subtle}
                weight="semibold"
              />
            </Pressable>
          );

          return href ? <Link asChild href={href}>{row}</Link> : row;
        }}
        showsVerticalScrollIndicator={false}
      />
      <IndexComposer
        editing={
          index && isOwnIndex
            ? {
                desc: index.description ?? '',
                indexId: index.id,
                isPrivate: index.isPrivate ?? false,
                title: index.title,
              }
            : null
        }
        onClose={() => setComposerVisible(false)}
        onEdited={() => setComposerVisible(false)}
        visible={composerVisible}
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

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  content: { gap: 10, padding: 20, paddingBottom: 44 },
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 20,
  },
  titleRow: { alignItems: 'flex-start', flexDirection: 'row' },
  overflowButton: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    marginLeft: 8,
    width: 32,
  },
  title: {
    color: colors.ink,
    flex: 1,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  author: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },
  description: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 16,
  },
  stats: { color: colors.subtle, fontSize: 12, marginTop: 14 },
  collectButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.accentSoft,
    borderRadius: 15,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginTop: 16,
    minHeight: 44,
    paddingHorizontal: 16,
  },
  collectedButton: { backgroundColor: colors.accent },
  collectText: { color: colors.accent, fontSize: 13, fontWeight: '800' },
  collectedText: { color: colors.surface },
  sectionTitle: {
    color: colors.ink,
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
  sectionMeta: { color: colors.subtle, fontSize: 12 },
  subjectRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 18,
    flexDirection: 'row',
    minHeight: 92,
    padding: 10,
  },
  cover: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 11,
    height: 72,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 51,
  },
  coverFallback: { color: colors.subtle, fontSize: 14, fontWeight: '700' },
  subjectMain: { flex: 1, marginLeft: 13 },
  subjectTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  subjectMeta: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  pressed: { opacity: 0.62 },
});
