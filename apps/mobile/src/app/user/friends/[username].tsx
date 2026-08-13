import { useMemo } from 'react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/design';
import { AppState } from '@/features/shared/app-state';
import { PagedListFooter } from '@/features/shared/paged-list-footer';
import { PublicUserFriendCard } from '@/features/users/public-user-friend-card';
import { usePublicUserFriends } from '@/features/users/use-public-user';

export default function PublicUserFriendsScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const friendsQuery = usePublicUserFriends(username);
  const friends = useMemo(
    () => friendsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [friendsQuery.data],
  );
  const total = friendsQuery.data?.pages[0]?.total ?? 0;

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen options={{ title: '好友' }} />
      <FlatList
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.content}
        data={friends}
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
          friends.length > 0 ? (
            <PagedListFooter
              hasNextPage={friendsQuery.hasNextPage}
              isError={friendsQuery.isFetchNextPageError}
              isFetching={friendsQuery.isFetchingNextPage}
              loadedCount={friends.length}
              onRetry={() => void friendsQuery.fetchNextPage()}
              total={total}
            />
          ) : null
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>公开好友</Text>
            <Text style={styles.meta}>
              @{username} · {total ? `${total} 位` : '读取中'}
            </Text>
          </View>
        }
        numColumns={3}
        onEndReached={() => {
          if (
            friendsQuery.hasNextPage &&
            !friendsQuery.isFetchingNextPage &&
            !friendsQuery.isFetchNextPageError
          ) {
            void friendsQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.45}
        onRefresh={() => void friendsQuery.refetch()}
        refreshing={friendsQuery.isRefetching && !friendsQuery.isPending}
        renderItem={({ item }) => (
          <PublicUserFriendCard
            friend={item}
            onPress={() =>
              router.push({
                pathname: '/user/[username]',
                params: { username: item.username },
              })
            }
          />
        )}
        showsVerticalScrollIndicator={false}
        windowSize={7}
      />
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  screen: { backgroundColor: COLORS.background, flex: 1 },
  content: {
    paddingBottom: 44,
    paddingHorizontal: 20,
  },
  header: { paddingBottom: 18, paddingHorizontal: 4, paddingTop: 18 },
  title: {
    color: COLORS.ink,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  meta: { color: COLORS.muted, fontSize: 13, marginTop: 6 },
  row: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pressed: { opacity: 0.62 },
});
