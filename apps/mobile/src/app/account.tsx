// 账户页：只做组合与整页状态；各区块的实现在 features/account/ 下。
import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-provider';
import { AccountContentMenu } from '@/features/account/account-content-menu';
import { AccountDeviceSessionsCard } from '@/features/account/account-device-sessions-card';
import { AccountProfileCard } from '@/features/account/account-profile-card';
import { AccountSettingsMenu } from '@/features/account/account-settings-menu';
import { AccountSignInPanel } from '@/features/account/account-sign-in-panel';
import { AccountSignOutActions } from '@/features/account/account-sign-out-actions';
import { useTheme } from '@/features/theme/theme-provider';

export default function AccountScreen() {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { isLoading, session } = useAuth();

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.stateText}>正在读取登录状态</Text>
          </View>
        ) : session ? (
          <>
            <AccountProfileCard />
            <AccountContentMenu username={session.user.username} />
            <AccountDeviceSessionsCard />
            <AccountSignOutActions />
          </>
        ) : (
          <AccountSignInPanel />
        )}
        {!isLoading ? (
          <AccountSettingsMenu />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  centerState: { alignItems: 'center', gap: 12 },
  stateText: { color: colors.muted, fontSize: 14 },
});
