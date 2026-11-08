import { useEffect, useState } from 'react';
import { SymbolView } from 'expo-symbols';
import { Alert, Pressable, StyleSheet } from 'react-native';

import { HIT_SLOP } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { AppActionMenu } from '@/features/shared/app-action-menu';
import { ReportSheet } from '@/features/reports/report-sheet';
import { useAuth } from '@/features/auth/auth-provider';
import { useTheme } from '@/features/theme/theme-provider';

import { rememberBlockedUserName } from './blocked-user-names';
import { useBlocklist } from './use-blocklist';

// 用户主页的溢出菜单：举报收进"⋯"，与加好友的胶囊并排。
// 不提供屏蔽：Bangumi P1 写入屏蔽名单返回 500（bangumi/server-private#1787），
// 只读取用户在 Bangumi 网页上的“绝交”名单来隐藏内容。
export function ProfileOverflow({
  nickname,
  userId,
  username,
}: {
  nickname: string;
  userId: number;
  username: string;
}) {
  const colors = useTheme();
  const styles = createStyles(colors);
  const blocklistQuery = useBlocklist();
  const [reportVisible, setReportVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const isBlocked = blocklistQuery.data?.includes(userId) ?? false;
  const { session } = useAuth();
  const ownerId = session?.user.id;

  // 打开已绝交用户的主页时记下名字，名单页才能显示昵称并跳回主页。
  useEffect(() => {
    if (isBlocked && ownerId) {
      rememberBlockedUserName(ownerId, userId, { nickname, username });
    }
  }, [isBlocked, nickname, ownerId, userId, username]);

  function openMenu() {
    setMenuVisible(true);
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
          tintColor={colors.muted}
          weight="semibold"
        />
      </Pressable>
      <AppActionMenu
        actions={[
          {
            id: 'report-user',
            label: '举报该用户',
            onPress: () => setReportVisible(true),
            symbol: { android: 'flag', ios: 'flag', web: 'flag' },
          },
        ]}
        onClose={() => setMenuVisible(false)}
        title={nickname}
        visible={menuVisible}
      />
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

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.track,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  pressed: { opacity: 0.62 },
});
