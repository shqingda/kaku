import { router } from 'expo-router';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HIT_SLOP, MIN_TOUCH_SIZE, SPACING, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { AccountSignInPanel } from '@/features/account/account-sign-in-panel';
import { useAuth } from '@/features/auth/auth-provider';
import { AppRefreshControl } from '@/features/shared/app-refresh-control';
import { AppState } from '@/features/shared/app-state';
import { useTheme } from '@/features/theme/theme-provider';
import { type BlockedUserName, readBlockedUserNames } from '@/features/users/blocked-user-names';
import { useBlocklist, useSetUserBlocked } from '@/features/users/use-blocklist';
import { playSuccessHaptic } from '@/lib/haptics';
import { loadStatus } from '@/lib/query-status';
import { userErrorMessage } from '@/lib/user-error-message';

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
            <AppState title="还没有屏蔽任何人" text="在用户主页的“⋯”菜单里可以屏蔽对方。" />
          )
        }
        ListHeaderComponent={
          blockedIds.length > 0 ? (
            <Text style={styles.intro}>这些用户的回复、吐槽、评论、话题和动态不会显示，也不会给你发通知。</Text>
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
  // 没设置用户名的账号，用户名就是数字 ID，所以名字未知时仍可以尝试取消。
  const setBlocked = useSetUserBlocked(name?.username ?? String(userId));
  const label = name?.nickname ?? `用户 ${userId}`;

  function unblock() {
    setBlocked.mutate(false, {
      onError: (error) => Alert.alert('没有取消屏蔽', userErrorMessage(error)),
      onSuccess: () => playSuccessHaptic(),
    });
  }

  const copy = (
    <View style={styles.rowCopy}>
      <Text numberOfLines={1} style={styles.rowTitle}>{label}</Text>
      {name ? null : <Text style={styles.rowMeta}>在其他设备屏蔽</Text>}
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
      <Pressable
        accessibilityLabel={`取消屏蔽${label}`}
        accessibilityRole="button"
        accessibilityState={{ disabled: setBlocked.isPending }}
        disabled={setBlocked.isPending}
        hitSlop={HIT_SLOP}
        onPress={unblock}
        style={({ pressed }) => [styles.action, (pressed || setBlocked.isPending) && styles.pressed]}
      >
        <Text style={styles.actionText}>{setBlocked.isPending ? '处理中' : '取消屏蔽'}</Text>
      </Pressable>
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
  action: { justifyContent: 'center', marginLeft: SPACING.md, minHeight: MIN_TOUCH_SIZE },
  actionText: { color: colors.accent, ...TYPE.caption, fontWeight: '800' },
  pressed: { opacity: 0.62 },
});
