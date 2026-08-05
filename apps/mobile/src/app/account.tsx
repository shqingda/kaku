import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/design';
import { useAuth } from '@/features/auth/auth-provider';
import {
  useDeviceSessions,
  useRevokeDeviceSession,
} from '@/features/auth/use-device-sessions';

function formatSessionTime(timestamp: number) {
  return new Intl.DateTimeFormat('zh-CN', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  }).format(new Date(timestamp));
}

export default function AccountScreen() {
  const {
    error,
    disconnectBangumi,
    isLoading,
    isSigningIn,
    session,
    signIn,
    signOut,
  } = useAuth();
  const sessionsQuery = useDeviceSessions();
  const revokeSession = useRevokeDeviceSession();

  async function handleSignIn() {
    if (await signIn()) {
      router.replace('/');
    }
  }

  function confirmDisconnect() {
    Alert.alert(
      '断开 Bangumi？',
      '将退出所有 Kaku 设备并删除 Kaku 保存的 Bangumi 凭证。Bangumi 没有开放 OAuth 撤销接口，授权令牌会在 Bangumi 侧到期。',
      [
        { style: 'cancel', text: '取消' },
        {
          onPress: () => void disconnectBangumi(),
          style: 'destructive',
          text: '断开全部设备',
        },
      ],
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={COLORS.accent} />
            <Text style={styles.stateText}>正在读取登录状态</Text>
          </View>
        ) : session ? (
          <>
            <View style={styles.profileCard}>
              <View style={styles.avatar}>
                <SymbolView
                  name={{
                    android: 'account_circle',
                    ios: 'person.crop.circle.fill',
                    web: 'account_circle',
                  }}
                  size={72}
                  tintColor={COLORS.subtle}
                />
                {session.user.avatarUrl ? (
                  <Image
                    contentFit="cover"
                    source={session.user.avatarUrl}
                    style={StyleSheet.absoluteFill}
                  />
                ) : null}
              </View>
              <Text style={styles.nickname}>{session.user.nickname}</Text>
              <Text style={styles.username}>@{session.user.username}</Text>
              <View style={styles.connectedBadge}>
                <View style={styles.connectedDot} />
                <Text style={styles.connectedText}>已连接 Bangumi</Text>
              </View>
            </View>
            <View style={styles.sessionsCard}>
              <View style={styles.sessionsHeading}>
                <Text style={styles.sessionsTitle}>登录设备</Text>
                {sessionsQuery.isFetching ? (
                  <ActivityIndicator color={COLORS.accent} size="small" />
                ) : null}
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
            <Pressable
              accessibilityRole="button"
              onPress={() => void signOut()}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.secondaryButtonText}>退出登录</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={confirmDisconnect}
              style={({ pressed }) => [
                styles.disconnectButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.disconnectButtonText}>断开 Bangumi</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.intro}>
              <View style={styles.logoMark}>
                <Text style={styles.logoText}>K</Text>
              </View>
              <Text style={styles.title}>连接 Bangumi</Text>
              <Text style={styles.description}>
                登录后同步收藏、观看进度和评分。Kaku 不会在手机里保存 Bangumi
                密钥。
              </Text>
            </View>
            {error ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
            <Pressable
              accessibilityRole="button"
              disabled={isSigningIn}
              onPress={() => void handleSignIn()}
              style={({ pressed }) => [
                styles.primaryButton,
                (pressed || isSigningIn) && styles.pressed,
              ]}
            >
              {isSigningIn ? (
                <ActivityIndicator color={COLORS.surface} />
              ) : (
                <Text style={styles.primaryButtonText}>使用 Bangumi 登录</Text>
              )}
            </Pressable>
            <Text style={styles.privacyText}>
              授权在系统浏览器中完成，密码不会经过 Kaku。
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: COLORS.background, flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  centerState: { alignItems: 'center', gap: 12 },
  stateText: { color: COLORS.muted, fontSize: 14 },
  intro: { alignItems: 'center', marginBottom: 32 },
  logoMark: {
    alignItems: 'center',
    backgroundColor: COLORS.accentSoft,
    borderRadius: 22,
    height: 76,
    justifyContent: 'center',
    marginBottom: 22,
    width: 76,
  },
  logoText: { color: COLORS.accent, fontSize: 36, fontWeight: '800' },
  title: {
    color: COLORS.ink,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  description: {
    color: COLORS.muted,
    fontSize: 15,
    lineHeight: 23,
    marginTop: 12,
    maxWidth: 320,
    textAlign: 'center',
  },
  errorCard: {
    backgroundColor: COLORS.accentSoft,
    borderRadius: 16,
    marginBottom: 14,
    padding: 14,
  },
  errorText: {
    color: COLORS.accent,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    height: 54,
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: '800',
  },
  privacyText: {
    color: COLORS.subtle,
    fontSize: 12,
    marginTop: 14,
    textAlign: 'center',
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 28,
    padding: 32,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: COLORS.track,
    borderRadius: 38,
    height: 76,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 76,
  },
  nickname: {
    color: COLORS.ink,
    fontSize: 24,
    fontWeight: '800',
    marginTop: 18,
  },
  username: { color: COLORS.muted, fontSize: 14, marginTop: 4 },
  connectedBadge: {
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 99,
    flexDirection: 'row',
    gap: 7,
    marginTop: 18,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  connectedDot: {
    backgroundColor: '#34C759',
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  connectedText: { color: COLORS.muted, fontSize: 13, fontWeight: '700' },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    marginTop: 14,
  },
  secondaryButtonText: { color: COLORS.accent, fontSize: 15, fontWeight: '700' },
  disconnectButton: { alignItems: 'center', marginTop: 16, paddingVertical: 10 },
  disconnectButtonText: { color: COLORS.muted, fontSize: 13, fontWeight: '600' },
  sessionsCard: {
    backgroundColor: COLORS.surface,
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
  sessionsTitle: { color: COLORS.ink, fontSize: 15, fontWeight: '800' },
  sessionMessage: { paddingTop: 14 },
  sessionError: { color: COLORS.accent, fontSize: 13 },
  sessionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  sessionRowBorder: {
    borderTopColor: COLORS.track,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sessionCopy: { flex: 1 },
  sessionNameRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  sessionName: { color: COLORS.ink, fontSize: 14, fontWeight: '700' },
  currentSession: {
    color: COLORS.accent,
    fontSize: 10,
    fontWeight: '700',
  },
  sessionMeta: { color: COLORS.subtle, fontSize: 11, marginTop: 4 },
  revokeSessionText: { color: COLORS.accent, fontSize: 13, fontWeight: '700' },
  pressed: { opacity: 0.62 },
});
