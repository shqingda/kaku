// 个人内容入口：通知、动态与日志。
import { useMemo } from 'react';
import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { useNotifications } from '@/features/notifications/use-notifications';
import { AccountMenuRow, createMenuGroupStyles } from './account-menu-row';
import { useTheme } from '@/features/theme/theme-provider';

export function AccountContentMenu({ username }: { username: string }) {
  const colors = useTheme();
  const styles = useMemo(() => createMenuGroupStyles(colors), [colors]);
  const notificationsQuery = useNotifications();

  return (
    <>
      <Text style={styles.menuSectionTitle}>我的</Text>
      <View style={styles.menuGroup}>
        <AccountMenuRow
          colors={colors}
          badge={notificationsQuery.data?.unreadCount}
          description="回复、好友与修订消息"
          icon={{
            android: 'notifications',
            ios: 'bell',
            web: 'notifications',
          }}
          label="通知"
          onPress={() => router.push('/notifications')}
        />
        <AccountMenuRow
          colors={colors}
          description="收藏与进度变化"
          hasDivider
          icon={{
            android: 'history',
            ios: 'clock.arrow.circlepath',
            web: 'history',
          }}
          label="我的动态"
          onPress={() =>
            router.push({
              pathname: '/user/timeline/[username]',
              params: { username },
            })
          }
        />
        <AccountMenuRow
          colors={colors}
          description="公开发布的日志"
          hasDivider
          icon={{
            android: 'article',
            ios: 'doc.text',
            web: 'article',
          }}
          label="我的日志"
          onPress={() =>
            router.push({
              pathname: '/user/blogs/[username]',
              params: { username },
            })
          }
        />
      </View>
    </>
  );
}
