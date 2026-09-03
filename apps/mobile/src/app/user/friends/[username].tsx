import { memo, useCallback, useMemo } from 'react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/constants/theme';
import { AppState } from '@/features/shared/app-state';
import { CachedDataNotice } from '@/features/shared/cached-data-notice';
import { PagedListFooter } from '@/features/shared/paged-list-footer';
import { ScrollToTopButton } from '@/features/shared/scroll-to-top-button';
import { usePagedList } from '@/features/shared/use-paged-list';
import { useTheme } from '@/features/theme/theme-provider';
import { PublicUserFriendCard } from '@/features/users/public-user-friend-card';
import { usePublicUserFriends } from '@/features/users/use-public-user';
import type { PublicUserFriend } from '@/features/users/model';

const UserFriendRow = memo(function UserFriendRow({
  friend,
  onPressItem,
}: {
  friend: PublicUserFriend;
  onPressItem: (username: string) => void;
}) {
  return (
    <PublicUserFriendCard
      friend={friend}
      onPress={() => onPressItem(friend.username)}
    />
  );
});

export default function PublicUserFriendsScreen() {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { username } = useLocalSearchParams<{ username: string }>();
  const friendsQuery = usePublicUserFriends(username);
  const friends = usePagedList(friendsQuery);
  const openFriend = useCallback((friendUsername: string) => {
    router.push({
      pathname: '/user/[username]',
      params: { username: friendUsername },
    });
  }, []);
  const renderItem = useCallback(
    ({ item }: { item: PublicUserFriend }) => (
      <UserFriendRow friend={item} onPressItem={openFriend} />
    ),
    [openFriend],
  );

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen options={{ title: '好友' }} />
      <FlatList
        {...friends.listProps}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.content}
        data={friends.items}
        initialNumToRender={18}
        keyExtractor={(item) => item.username}
        ListEmptyComponent={
          friendsQuery.isPending ? (
            <AppState text="正在读取公开好友。" title="好友加载中" />
          ) : friendsQuery.isError ? (
            <AppState
              action={() => void friendsQuery.refetch()}
              text="请检查网络后重试。"
              title="好友读取失败"
            />
          ) : (
            <AppState text="该用户没有公开好友。" title="暂无好友" />
          )
        }
        ListFooterComponent={
          friends.items.length > 0 ? (
            <PagedListFooter {...friends.footerProps} />
          ) : null
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>公开好友</Text>
            <Text style={styles.meta}>
              @{username} · {friends.total ? `${friends.total} 位` : '读取中'}
            </Text>
            {friends.items.length > 0 && friendsQuery.isError ? (
              <CachedDataNotice onRetry={() => void friendsQuery.refetch()} />
            ) : null}
          </View>
        }
        numColumns={3}
        onRefresh={friends.refresh}
        refreshing={friends.refreshing}
        renderItem={renderItem}
        windowSize={7}
      />
      <ScrollToTopButton
        onPress={friends.scrollToTop}
        visible={friends.visible}
      />
    </SafeAreaView>
  );
}


const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  content: {
    paddingBottom: 44,
    paddingHorizontal: 20,
  },
  header: { paddingBottom: 18, paddingHorizontal: 4, paddingTop: 18 },
  title: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  meta: { color: colors.muted, fontSize: 13, marginTop: 6 },
  row: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
});
