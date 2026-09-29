// 登录设备卡片：设备会话列表、退出单台设备与退出其他设备。
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { useEffect, useRef } from 'react';
import { HIT_SLOP, MIN_TOUCH_SIZE, SPACING, TYPE } from '@/constants/design';
import { useAuth } from '@/features/auth/auth-provider';
import type { ThemeColors } from '@/constants/theme';
import {
  useDeviceSessions,
  useRevokeDeviceSession,
  useRevokeOtherDeviceSessions,
} from '@/features/auth/use-device-sessions';
import { useTheme } from '@/features/theme/theme-provider';

function formatSessionTime(timestamp: number) {
  return new Intl.DateTimeFormat('zh-CN', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  }).format(new Date(timestamp));
}

export function AccountDeviceSessionsCard() {
  const colors = useTheme();
  const styles = createStyles(colors);
  const sessionsQuery = useDeviceSessions();
  const revokeSession = useRevokeDeviceSession();
  const revokeOtherSessions = useRevokeOtherDeviceSessions();
  const otherSessionCount =
    sessionsQuery.data?.filter((deviceSession) => !deviceSession.current)
      .length ?? 0;

  const { session } = useAuth();
  const account = session?.user.id;
  const currentAccount = useRef(account);
  currentAccount.current = account;
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const busy = useRef(false);
  const pending = revokeSession.isPending || revokeOtherSessions.isPending;

  function confirmExit(device?: { sessionId: string; deviceName: string }) {
    const title = device ? `退出“${device.deviceName}”？` : '退出其他设备？';
    Alert.alert(title, device
      ? '该设备需要重新登录才能使用账户功能。当前设备不受影响。'
      : `其他 ${otherSessionCount} 台设备需要重新登录。当前设备不受影响。`, [
      { style: 'cancel', text: '取消' },
      { style: 'destructive', text: device ? '退出设备' : '退出其他设备', onPress: async () => {
        if (!mounted.current || busy.current) return;
        if (currentAccount.current !== account) {
          Alert.alert('账号已变化', '请重新选择要退出的设备。');
          return;
        }
        busy.current = true;
        try {
          if (device) await revokeSession.mutateAsync(device.sessionId);
          else await revokeOtherSessions.mutateAsync();
        } catch (error) {
          if (mounted.current && currentAccount.current === account) Alert.alert('未能退出设备', error instanceof Error ? error.message : '请稍后重试。');
        } finally { busy.current = false; }
      } },
    ]);
  }

  return (
    <View style={styles.sessionsCard}>
      <View style={styles.sessionsHeading}>
        <Text style={styles.sessionsTitle}>登录设备</Text>
        <View style={styles.sessionsHeadingActions}>
          {sessionsQuery.isFetching || revokeOtherSessions.isPending ? (
            <ActivityIndicator color={colors.accent} size="small" />
          ) : null}
          {otherSessionCount > 0 ? (
            <Pressable
              accessibilityLabel="退出其他设备"
              accessibilityRole="button"
              disabled={pending}
              hitSlop={HIT_SLOP}
              onPress={() => confirmExit()}
              style={({ pressed }) => [styles.action, (pressed || pending) && styles.pressed]}
            >
              <Text style={styles.revokeOtherText}>退出其他设备</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      {sessionsQuery.isError ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => void sessionsQuery.refetch()}
          style={styles.sessionMessage}
        >
          <Text style={styles.sessionError}>设备读取失败，点此重试</Text>
        </Pressable>
      ) : (
        sessionsQuery.data?.map((deviceSession, index) => (
          <View
            key={deviceSession.sessionId}
            style={[
              styles.sessionRow,
              index > 0 && styles.sessionRowBorder,
            ]}
          >
            <View style={styles.sessionCopy}>
              <View style={styles.sessionNameRow}>
                <Text style={styles.sessionName}>
                  {deviceSession.deviceName}
                </Text>
                {deviceSession.current ? (
                  <Text style={styles.currentSession}>当前设备</Text>
                ) : null}
              </View>
              <Text style={styles.sessionMeta}>
                最近使用 {formatSessionTime(deviceSession.lastUsedAt)}
              </Text>
            </View>
            {!deviceSession.current ? (
              <Pressable
                accessibilityLabel={`退出${deviceSession.deviceName}`}
                accessibilityRole="button"
                disabled={pending}
                hitSlop={HIT_SLOP}
                onPress={() => confirmExit(deviceSession)}
                style={({ pressed }) => [styles.action, (pressed || pending) && styles.pressed]}
              >
                <Text style={styles.revokeSessionText}>退出</Text>
              </Pressable>
            ) : null}
          </View>
        ))
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  sessionsCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  sessionsHeading: {
    flexWrap: 'wrap',
    gap: SPACING.sm,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  action: { minHeight: MIN_TOUCH_SIZE, justifyContent: 'center' },
  sessionsTitle: { color: colors.ink, ...TYPE.body, fontWeight: '800' },
  sessionsHeadingActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.md,
  },
  revokeOtherText: { color: colors.accent, ...TYPE.caption, fontWeight: '700' },
  sessionMessage: { paddingTop: SPACING.lg },
  sessionError: { color: colors.accent, ...TYPE.caption },
  sessionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.lg,
  },
  sessionRowBorder: {
    borderTopColor: colors.track,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sessionCopy: { flex: 1 },
  sessionNameRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  sessionName: { color: colors.ink, ...TYPE.body, fontWeight: '700' },
  currentSession: {
    color: colors.accent,
    ...TYPE.micro,
    fontWeight: '700',
  },
  sessionMeta: { color: colors.subtle, ...TYPE.micro, marginTop: SPACING.xs },
  revokeSessionText: { color: colors.accent, ...TYPE.caption, fontWeight: '700' },
  pressed: { opacity: 0.62 },
});
