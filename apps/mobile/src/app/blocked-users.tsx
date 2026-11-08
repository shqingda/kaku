import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MIN_TOUCH_SIZE, SPACING, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { AccountSignInPanel } from '@/features/account/account-sign-in-panel';
import { useAuth } from '@/features/auth/auth-provider';
import { AppRefreshControl } from '@/features/shared/app-refresh-control';
import { AppState } from '@/features/shared/app-state';
import { useTheme } from '@/features/theme/theme-provider';
import { type BlockedUserName, readBlockedUserNames } from '@/features/users/blocked-user-names';
import { useBlocklist } from '@/features/users/use-blocklist';
import { loadStatus } from '@/lib/query-status';

// 只读名单：来自用户在 Bangumi 网页上的“绝交”。Kaku 内无法屏蔽或取消，
// 因为 Bangumi P1 的写入接口返回 500（bangumi/server-private#1787）。
export default function BlockedUsersScreen() {
  const colors = useTheme();
  const styles = createStyles(colors);
  const { isLoading, session } = useAuth();
  const blocklistQuery = useBlocklist();
  const status = loadStatus(blocklistQuery);
  const blockedIds = blocklistQuery.data ?? [];
  const names = session ? readBlockedUserNames(session.user.id) : {};

  if (!isLoading && !session) {
    return (
      <SafeAreaView edges={['bottom']} style={styles.screen}>
        <View style={styles.content}><AccountSignInPanel /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <FlatList
        contentContainerStyle={styles.content}
        data={blockedIds}
        keyExtractor={String}
        ListEmptyComponent={
          isLoading || status.isPending ? (
            <AppState title="正在读取屏蔽名单" text="名单加载中。" />
          ) : status.isError ? (
            <AppState
              action={() => void blocklistQuery.refetch()}
              title="屏蔽名单读取失败"
              text="请检查网络后重试。"
            />
          ) : (
            <AppState title="还没有屏蔽任何人" text="在 Bangumi 网页上与某人绝交后，Kaku 会隐藏对方的内容，并在这里列出。" />
          )
        }
        ListHeaderComponent={
          blockedIds.length > 0 ? (
            <Text style={styles.intro}>你在 Bangumi 网页上绝交的用户。Kaku 不显示他们的回复、吐槽、评论、话题和动态，Bangumi 也不会给你发对方的通知。</Text>
          ) : undefined
        }
        refreshControl={
          <AppRefreshControl
            onRefresh={() => void blocklistQuery.refetch()}
            refreshing={blocklistQuery.isRefetching && !blocklistQuery.isPending}
          />
        }
        renderItem={({ index, item }) => (
          <BlockedUserRow
            hasDivider={index > 0}
            isFirst={index === 0}
            isLast={index === blockedIds.length - 1}
            name={names[item]}
            styles={styles}
            userId={item}
          />
        )}
      />
    </SafeAreaView>
  );
}

function BlockedUserRow({
  hasDivider,
  isFirst,
  isLast,
  name,
  styles,
  userId,
}: {
  hasDivider: boolean;
  isFirst: boolean;
  isLast: boolean;
  name?: BlockedUserName;
  styles: ReturnType<typeof createStyles>;
  userId: number;
}) {
  const label = name?.nickname ?? `用户 ${userId}`;

  const copy = (
    <View style={styles.rowCopy}>
      <Text numberOfLines={1} style={styles.rowTitle}>{label}</Text>
      {name ? null : <Text style={styles.rowMeta}>打开过对方主页后会显示昵称</Text>}
    </View>
  );

  return (
    <View
      style={[
        styles.row,
        hasDivider && styles.rowDivider,
        isFirst && styles.firstRow,
        isLast && styles.lastRow,
      ]}
    >
      {name ? (
        <Pressable
          accessibilityLabel={`打开${label}的主页`}
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/user/[username]', params: { username: name.username } })}
          style={({ pressed }) => [styles.rowMain, pressed && styles.pressed]}
        >
          {copy}
        </Pressable>
      ) : (
        <View style={styles.rowMain}>{copy}</View>
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  content: { padding: SPACING.xl },
  intro: { color: colors.muted, ...TYPE.caption, marginBottom: SPACING.lg },
  row: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    flexDirection: 'row',
    minHeight: MIN_TOUCH_SIZE + SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  rowDivider: { borderTopColor: colors.divider, borderTopWidth: StyleSheet.hairlineWidth },
  firstRow: { borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  lastRow: { borderBottomLeftRadius: 22, borderBottomRightRadius: 22 },
  rowMain: { flex: 1, justifyContent: 'center', minHeight: MIN_TOUCH_SIZE, minWidth: 0 },
  rowCopy: { gap: SPACING.xs },
  rowTitle: { color: colors.ink, ...TYPE.body, fontWeight: '700' },
  rowMeta: { color: colors.subtle, ...TYPE.micro },
  pressed: { opacity: 0.62 },
});
