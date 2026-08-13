import { useState } from 'react';
import { SymbolView } from 'expo-symbols';
import { Alert, Pressable, StyleSheet } from 'react-native';

import { COLORS, HIT_SLOP } from '@/constants/design';
import { ReportSheet } from '@/features/reports/report-sheet';

import { useBlocklist, useSetUserBlocked } from './use-blocklist';

// 用户主页的溢出菜单：管理类操作（屏蔽、举报）收进"⋯"，
// 与加好友的胶囊并排，避免在头像旁堆叠过多按钮。
export function ProfileOverflow({
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
  const [reportVisible, setReportVisible] = useState(false);
  const isBlocked = blocklistQuery.data?.includes(userId) ?? false;

  function applyBlock(shouldBlock: boolean) {
    setBlocked.mutate(shouldBlock, {
      onError: (error) => {
        Alert.alert(
          shouldBlock ? '没有屏蔽该用户' : '没有取消屏蔽',
          error.message,
        );
      },
    });
  }

  function confirmBlock() {
    if (isBlocked) {
      Alert.alert('取消屏蔽？', `恢复显示 ${nickname} 的内容。`, [
        { style: 'cancel', text: '取消' },
        { onPress: () => applyBlock(false), text: '取消屏蔽' },
      ]);
      return;
    }

    Alert.alert('屏蔽该用户？', `屏蔽后不再看到 ${nickname} 发布的内容。`, [
      { style: 'cancel', text: '取消' },
      { onPress: () => applyBlock(true), style: 'destructive', text: '屏蔽' },
    ]);
  }

  function openMenu() {
    Alert.alert(nickname, undefined, [
      {
        onPress: () => setReportVisible(true),
        text: '举报该用户',
      },
      {
        onPress: confirmBlock,
        style: isBlocked ? undefined : 'destructive',
        text: isBlocked ? '取消屏蔽' : '屏蔽该用户',
      },
      { style: 'cancel', text: '取消' },
    ]);
  }

  return (
    <>
      <Pressable
        accessibilityLabel={`更多操作：${nickname}`}
        accessibilityRole="button"
        hitSlop={HIT_SLOP}
        onPress={openMenu}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <SymbolView
          name={{ android: 'more_horiz', ios: 'ellipsis', web: 'more_horiz' }}
          size={17}
          tintColor={COLORS.muted}
          weight="semibold"
        />
      </Pressable>
      <ReportSheet
        onClose={() => setReportVisible(false)}
        onSubmitted={() =>
          Alert.alert('举报已提交', '感谢你的反馈，Bangumi 会进行审核。')
        }
        target={{ id: userId, label: nickname, type: 6 }}
        visible={reportVisible}
      />
    </>
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
