import { SPACING, TYPE } from '@/constants/design';
import { userErrorMessage } from '@/lib/user-error-message';
import { useCallback, useState } from 'react';
import {
  router,
  Stack,
  useLocalSearchParams,
  usePathname,
} from 'expo-router';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/constants/theme';
import { rememberReturnTo } from '@/lib/auth-redirect';
import { playWarningHaptic } from '@/lib/haptics';
import { useAuth } from '@/features/auth/auth-provider';
import { DiscussionStatus } from '@/features/discussions/discussion-status';
import { IndexComposer } from '@/features/indexes/index-composer';
import { IndexDetailHeader } from '@/features/indexes/index-detail-header';
import { PublicIndexItemRow } from '@/features/indexes/public-index-item-row';
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
import { AppActionMenu } from '@/features/shared/app-action-menu';
import { AppRefreshControl } from '@/features/shared/app-refresh-control';
import { AppState } from '@/features/shared/app-state';
import { InvalidRouteState } from '@/features/shared/invalid-route-state';
import { HeaderShareButton } from '@/features/shared/header-share-button';
import { ScrollToTopButton } from '@/features/shared/scroll-to-top-button';
import { usePagedList } from '@/features/shared/use-paged-list';
import { useTheme } from '@/features/theme/theme-provider';
import { parsePositiveIntegerRouteParam } from '@/lib/route-params';

export default function PublicIndexScreen() {
  const colors = useTheme();
  const styles = createStyles(colors);
  const { id } = useLocalSearchParams<{ id: string }>();
  const pathname = usePathname();
  const { session } = useAuth();
  const [composerVisible, setComposerVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const indexId = parsePositiveIntegerRouteParam(id);
  const indexQuery = usePublicIndex(indexId ?? 0);
  const itemsQuery = usePublicIndexItems(indexId ?? 0);
  const items = usePagedList(itemsQuery);
  const deleteIndex = useDeleteIndex();
  const collectionQuery = useIndexCollection(indexId ?? 0);
  const setCollection = useSetIndexCollection(indexId ?? 0);
  const index = indexQuery.data;
  const itemTotal = items.total ?? 0;
  const isOwnIndex =
    Boolean(session) && index?.authorUsername === session?.user.username;
  const renderItem = useCallback(
    ({ item }: { item: PublicIndexItem }) => (
      <PublicIndexItemRow item={item} />
    ),
    [],
  );

  function openMenu() {
    if (!index) {
      return;
    }

    setMenuVisible(true);
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
              onSuccess: () => {
                playWarningHaptic();
                router.back();
              },
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
      <Stack.Screen
        options={{
          title: index?.title ?? '目录',
          headerRight: () =>
            index ? (
              <HeaderShareButton
                path={`/index/${indexId}`}
                title={index.title}
              />
            ) : null,
        }}
      />
      <FlatList
        {...items.listProps}
        contentContainerStyle={styles.content}
        data={items.items}
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
          items.items.length > 0 ? (
            <PagedListFooter {...items.footerProps} />
          ) : undefined
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
              <IndexDetailHeader
                index={index}
                collected={Boolean(collectionQuery.data)}
                collectionPending={setCollection.isPending}
                onOpenMenu={isOwnIndex ? openMenu : undefined}
                onOpenAuthor={index.authorUsername ? () =>
                  router.push({
                    pathname: '/user/[username]',
                    params: { username: index.authorUsername! },
                  }) : undefined
                }
                onToggleCollection={toggleCollection}
              />
            ) : null}
            {index ? (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>收录条目</Text>
                <Text style={styles.sectionMeta}>
                  已加载 {items.items.length} · 共 {itemTotal.toLocaleString('zh-CN')}
                </Text>
              </View>
            ) : null}
          </>
        }
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
        renderItem={renderItem}
      />
      <ScrollToTopButton
        onPress={items.scrollToTop}
        visible={items.visible}
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
      <AppActionMenu
        actions={[
          {
            id: 'edit-index',
            label: '编辑目录',
            onPress: () => setComposerVisible(true),
            symbol: { android: 'edit', ios: 'square.and.pencil', web: 'edit' },
          },
          {
            id: 'delete-index',
            label: '删除目录',
            onPress: confirmDelete,
            symbol: { android: 'delete', ios: 'trash', web: 'delete' },
          },
        ]}
        onClose={() => setMenuVisible(false)}
        title={index?.title}
        visible={menuVisible}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  content: { gap: SPACING.md, padding: SPACING.xl, paddingBottom: SPACING.xxl + SPACING.md },
  sectionTitle: {
    color: colors.ink,
    fontSize: TYPE.title.fontSize,
    fontWeight: '800',
  },
  sectionHeader: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xs,
    paddingTop: SPACING.lg,
  },
  sectionMeta: { color: colors.subtle, fontSize: TYPE.caption.fontSize },
});
