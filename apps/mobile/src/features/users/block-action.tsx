import { SymbolView } from 'expo-symbols';
import { Alert, Pressable, StyleSheet } from 'react-native';

import { COLORS, HIT_SLOP } from '@/constants/design';

import { useBlocklist, useSetUserBlocked } from './use-blocklist';

// 用户主页的溢出菜单：管理类操作（屏蔽）收进"⋯"，与加好友的胶囊并排。
export function BlockAction({
  nickname,
  userId,
  username,
}: {
  nickname: string;
  userId: number;
  username: string;
}) {
  const blocklistQuery = useBlocklist();
  const setBlocked = useSetUserBlocked(username);
  const isBlocked = blocklistQuery.data?.includes(userId) ?? false;

  function apply(shouldBlock: boolean) {
    setBlocked.mutate(shouldBlock, {
      onError: (error) => {
        Alert.alert(
          shouldBlock ? '没有屏蔽该用户' : '没有取消屏蔽',
          error.message,
        );
      },
    });
  }

  function open() {
    if (isBlocked) {
      Alert.alert('取消屏蔽？', `恢复显示 ${nickname} 的内容。`, [
        { style: 'cancel', text: '取消' },
        { onPress: () => apply(false), text: '取消屏蔽' },
      ]);
      return;
    }

    Alert.alert('屏蔽该用户？', `屏蔽后不再看到 ${nickname} 发布的内容。`, [
      { style: 'cancel', text: '取消' },
      { onPress: () => apply(true), style: 'destructive', text: '屏蔽' },
    ]);
  }

  return (
    <Pressable
      accessibilityLabel={isBlocked ? `取消屏蔽 ${nickname}` : `屏蔽 ${nickname}`}
      accessibilityRole="button"
      hitSlop={HIT_SLOP}
      onPress={open}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
      ]}
    >
      <SymbolView
        name={{ android: 'more_horiz', ios: 'ellipsis', web: 'more_horiz' }}
        size={17}
        tintColor={COLORS.muted}
        weight="semibold"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.track,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  pressed: { opacity: 0.62 },
});
