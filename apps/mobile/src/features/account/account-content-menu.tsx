// 「内容与互动」菜单组：我的动态、日志、通知、关于与更新日志。
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
      <Text style={styles.menuSectionTitle}>内容与互动</Text>
      <View style={styles.menuGroup}>
        <AccountMenuRow
          colors={colors}
          description="收藏与进度变化"
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
        <AccountMenuRow
          colors={colors}
          badge={notificationsQuery.data?.unreadCount}
          description="回复、好友与修订消息"
          hasDivider
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
          description="版本、帮助与隐私"
          hasDivider
          icon={{
            android: 'info',
            ios: 'info.circle',
            web: 'info',
          }}
          label="关于 Kaku"
          onPress={() => router.push('/about')}
        />
        <AccountMenuRow
          colors={colors}
          description="每个版本的新变化"
          hasDivider
          icon={{
            android: 'receipt_long',
            ios: 'list.bullet.rectangle',
            web: 'receipt_long',
          }}
          label="更新日志"
          onPress={() => router.push('/changelog')}
        />
      </View>
    </>
  );
}
