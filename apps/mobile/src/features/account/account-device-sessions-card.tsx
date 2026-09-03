// 登录设备卡片：设备会话列表、退出单台设备与退出其他登录。
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

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

  function confirmRevokeOtherSessions() {
    Alert.alert(
      '退出其他登录？',
      '其他设备需要重新用 Bangumi 登录。当前这台设备不受影响。',
      [
        { style: 'cancel', text: '取消' },
        {
          onPress: () => {
            void revokeOtherSessions.mutateAsync().catch((caughtError: unknown) => {
              Alert.alert(
                '未能退出其他登录',
                caughtError instanceof Error
                  ? caughtError.message
                  : '请稍后重试。',
              );
            });
          },
          style: 'destructive',
          text: '退出其他登录',
        },
      ],
    );
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
              accessibilityLabel="退出其他登录"
              accessibilityRole="button"
              disabled={revokeOtherSessions.isPending}
              hitSlop={8}
              onPress={confirmRevokeOtherSessions}
              style={({ pressed }) =>
                (pressed || revokeOtherSessions.isPending) &&
                styles.pressed
              }
            >
              <Text style={styles.revokeOtherText}>退出其他登录</Text>
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
                disabled={revokeSession.isPending}
                hitSlop={8}
                onPress={() =>
                  void revokeSession.mutateAsync(deviceSession.sessionId)
                }
                style={({ pressed }) => pressed && styles.pressed}
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
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  sessionsHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sessionsTitle: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  sessionsHeadingActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  revokeOtherText: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  sessionMessage: { paddingTop: 14 },
  sessionError: { color: colors.accent, fontSize: 13 },
  sessionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  sessionRowBorder: {
    borderTopColor: colors.track,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sessionCopy: { flex: 1 },
  sessionNameRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  sessionName: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  currentSession: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '700',
  },
  sessionMeta: { color: colors.subtle, fontSize: 11, marginTop: 4 },
  revokeSessionText: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  pressed: { opacity: 0.62 },
});
