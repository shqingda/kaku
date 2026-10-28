import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SPACING, TYPE } from '@/constants/design';
import { AccountDeviceSessionsCard } from '@/features/account/account-device-sessions-card';
import { AccountSignInPanel } from '@/features/account/account-sign-in-panel';
import { useAuth } from '@/features/auth/auth-provider';
import { useTheme } from '@/features/theme/theme-provider';

export default function DevicesScreen() {
  const colors = useTheme();
  const { isLoading, session } = useAuth();

  return (
    <SafeAreaView edges={['bottom']} style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
            <Text style={[styles.message, { color: colors.muted }]}>正在读取登录状态</Text>
          </View>
        ) : session ? <AccountDeviceSessionsCard /> : <AccountSignInPanel />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: SPACING.xl },
  loading: { alignItems: 'center', gap: SPACING.md },
  message: { ...TYPE.body },
});
