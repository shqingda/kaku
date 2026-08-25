import { useMemo, useState, type ComponentProps } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
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

import type { ThemeColors } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-provider';
import { takeReturnTo } from '@/lib/auth-redirect';
import {
  useDeviceSessions,
  useRevokeDeviceSession,
} from '@/features/auth/use-device-sessions';
import { useRecentSubjects } from '@/features/history/recent-subjects-provider';
import { useNotifications } from '@/features/notifications/use-notifications';
import { useSearchHistory } from '@/features/search/search-history-provider';
import { useTheme } from '@/features/theme/theme-provider';
import { queryPersister } from '@/lib/query-persister';
import { clearDiagnosticRecords } from '@/lib/diagnostic-log';

function formatSessionTime(timestamp: number) {
  return new Intl.DateTimeFormat('zh-CN', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  }).format(new Date(timestamp));
}

export default function AccountScreen() {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [isClearingLocalData, setIsClearingLocalData] = useState(false);
  const queryClient = useQueryClient();
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
  const notificationsQuery = useNotifications();
  const { clearHistory: clearRecentSubjects } = useRecentSubjects();
  const { clearHistory: clearSearchHistory } = useSearchHistory();

  async function handleSignIn() {
    if (await signIn()) {
      const target = takeReturnTo();
      router.dismissTo((target ?? '/') as Href);
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

  async function clearLocalData() {
    setIsClearingLocalData(true);
    try {
      queryClient.removeQueries({
        predicate: (query) => query.meta?.persist === true,
      });

      const results = await Promise.allSettled([
        queryPersister.removeClient(),
        clearSearchHistory(),
        clearRecentSubjects(),
        clearDiagnosticRecords(),
        Image.clearMemoryCache(),
        Image.clearDiskCache(),
      ]);

      if (results.some((result) => result.status === 'rejected')) {
        Alert.alert('部分数据未能清理', '可以稍后再试，不影响继续使用。');
        return;
      }

      Alert.alert(
        '已清理',
        '公开缓存、图片、最近记录和诊断信息已清理；最近搜索和浏览也会同步清除。',
      );
    } finally {
      setIsClearingLocalData(false);
    }
  }

  function confirmClearLocalData() {
    Alert.alert(
      '清理本地数据？',
      '将删除公开内容缓存、图片缓存、最近搜索、最近浏览和诊断记录。最近搜索和浏览会从其他 Kaku 设备同步清除；不会退出登录，也不会修改 Bangumi 收藏。',
      [
        { style: 'cancel', text: '取消' },
        {
          onPress: () => void clearLocalData(),
          text: '清理',
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
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.stateText}>正在读取登录状态</Text>
          </View>
        ) : session ? (
          <>
            <Pressable
              accessibilityLabel="查看我的 Bangumi 主页"
              accessibilityRole="link"
              onPress={() =>
                router.push({
                  pathname: '/user/[username]',
                  params: { username: session.user.username },
                })
              }
              style={({ pressed }) => [
                styles.profileCard,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.avatar}>
                <SymbolView
                  name={{
                    android: 'account_circle',
                    ios: 'person.crop.circle.fill',
                    web: 'account_circle',
                  }}
                  size={72}
                  tintColor={colors.subtle}
                />
                {session.user.avatarUrl ? (
                  <Image
                    contentFit="cover"
                    source={session.user.avatarUrl}
                    style={StyleSheet.absoluteFill}
                    transition={120}
                  />
                ) : null}
              </View>
              <Text style={styles.nickname}>{session.user.nickname}</Text>
              <Text style={styles.username}>@{session.user.username}</Text>
              <View style={styles.connectedBadge}>
                <View style={styles.connectedDot} />
                <Text style={styles.connectedText}>已连接 Bangumi</Text>
              </View>
              <View style={styles.profileLink}>
                <Text style={styles.profileLinkText}>查看公开主页</Text>
                <SymbolView
                  name={{
                    android: 'chevron_right',
                    ios: 'chevron.right',
                    web: 'chevron_right',
                  }}
                  size={13}
                  tintColor={colors.subtle}
                />
              </View>
            </Pressable>
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
                    params: { username: session.user.username },
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
                    params: { username: session.user.username },
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
                description="类型、状态与待开始进度"
                hasDivider
                icon={{
                  android: 'donut_large',
                  ios: 'chart.pie',
                  web: 'donut_large',
                }}
                label="收藏分析"
                onPress={() => router.push('/collection-overview')}
              />
              <AccountMenuRow
                colors={colors}
                description="近期条目与类型偏好"
                hasDivider
                icon={{
                  android: 'insights',
                  ios: 'chart.bar.xaxis',
                  web: 'insights',
                }}
                label="浏览足迹"
                onPress={() => router.push('/footprint')}
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
            </View>
            <View style={styles.sessionsCard}>
              <View style={styles.sessionsHeading}>
                <Text style={styles.sessionsTitle}>登录设备</Text>
                {sessionsQuery.isFetching ? (
                  <ActivityIndicator color={colors.accent} size="small" />
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
              <Image
                accessibilityLabel="Kaku"
                contentFit="cover"
                source={require('../../assets/images/kaku-icon.png')}
                style={styles.logoMark}
              />
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
                <ActivityIndicator color={colors.surface} />
              ) : (
                <Text style={styles.primaryButtonText}>使用 Bangumi 登录</Text>
              )}
            </Pressable>
            <Text style={styles.privacyText}>
              授权在系统浏览器中完成，密码不会经过 Kaku。
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/about')}
              style={({ pressed }) => [
                styles.aboutLink,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.aboutLinkText}>关于、帮助与隐私</Text>
            </Pressable>
          </>
        )}
        {!isLoading ? (
          <>
            <Text style={styles.menuSectionTitle}>设置与本地</Text>
            <View style={styles.menuGroup}>
              <AccountMenuRow
                colors={colors}
                description="深色、浅色与云端同步"
                icon={{
                  android: 'cloud',
                  ios: 'icloud',
                  web: 'cloud',
                }}
                label="外观与同步"
                onPress={() => router.push('/settings')}
              />
              <AccountMenuRow
                colors={colors}
                description="公开缓存、图片与最近记录"
                hasDivider
                icon={{
                  android: 'delete_sweep',
                  ios: 'trash',
                  web: 'delete_sweep',
                }}
                label="清理本地数据"
                loading={isClearingLocalData}
                onPress={confirmClearLocalData}
              />
              <AccountMenuRow
                colors={colors}
                description="查看仅保存在本机的错误记录"
                hasDivider
                icon={{
                  android: 'troubleshoot',
                  ios: 'waveform.path.ecg',
                  web: 'troubleshoot',
                }}
                label="诊断信息"
                onPress={() => router.push('/diagnostics')}
              />
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function AccountMenuRow({
  colors,
  badge,
  description,
  hasDivider = false,
  icon,
  label,
  loading = false,
  onPress,
}: {
  badge?: number;
  colors: ThemeColors;
  description: string;
  hasDivider?: boolean;
  icon: ComponentProps<typeof SymbolView>['name'];
  label: string;
  loading?: boolean;
  onPress: () => void;
}) {
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuRow,
        hasDivider && styles.menuRowDivider,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.menuIcon}>
        <SymbolView
          name={icon}
          size={18}
          tintColor={colors.accent}
          weight="semibold"
        />
      </View>
      <View style={styles.menuCopy}>
        <Text style={styles.menuTitle}>{label}</Text>
        <Text style={styles.menuDescription}>{description}</Text>
      </View>
      {badge ? (
        <View style={styles.menuBadge}>
          <Text style={styles.menuBadgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : null}
      {loading ? (
        <ActivityIndicator color={colors.accent} size="small" />
      ) : (
        <SymbolView
          name={{
            android: 'chevron_right',
            ios: 'chevron.right',
            web: 'chevron_right',
          }}
          size={14}
          tintColor={colors.subtle}
        />
      )}
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  centerState: { alignItems: 'center', gap: 12 },
  stateText: { color: colors.muted, fontSize: 14 },
  intro: { alignItems: 'center', marginBottom: 32 },
  logoMark: {
    borderRadius: 20,
    height: 76,
    marginBottom: 22,
    width: 76,
  },
  title: {
    color: colors.ink,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  description: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 23,
    marginTop: 12,
    maxWidth: 320,
    textAlign: 'center',
  },
  errorCard: {
    backgroundColor: colors.accentSoft,
    borderRadius: 16,
    marginBottom: 14,
    padding: 14,
  },
  errorText: {
    color: colors.accent,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 16,
    height: 54,
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '800',
  },
  privacyText: {
    color: colors.subtle,
    fontSize: 12,
    marginTop: 14,
    textAlign: 'center',
  },
  aboutLink: { alignSelf: 'center', marginTop: 10, padding: 10 },
  aboutLinkText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  profileCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 28,
    padding: 32,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.track,
    borderRadius: 38,
    height: 76,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 76,
  },
  nickname: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '800',
    marginTop: 18,
  },
  username: { color: colors.muted, fontSize: 14, marginTop: 4 },
  connectedBadge: {
    alignItems: 'center',
    backgroundColor: colors.background,
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
  connectedText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  profileLink: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
    marginTop: 14,
  },
  profileLinkText: { color: colors.subtle, fontSize: 12, fontWeight: '600' },
  menuSectionTitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 22,
    paddingHorizontal: 4,
  },
  menuGroup: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    paddingHorizontal: 18,
  },
  menuRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 68,
  },
  menuRowDivider: {
    borderTopColor: colors.track,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  menuIcon: {
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: 13,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  menuCopy: { flex: 1, marginLeft: 13 },
  menuTitle: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  menuDescription: { color: colors.subtle, fontSize: 11, marginTop: 3 },
  menuBadge: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 10,
    justifyContent: 'center',
    marginRight: 9,
    minHeight: 20,
    minWidth: 20,
    paddingHorizontal: 6,
  },
  menuBadgeText: {
    color: colors.surface,
    fontSize: 10,
    fontWeight: '800',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    marginTop: 14,
  },
  secondaryButtonText: { color: colors.accent, fontSize: 15, fontWeight: '700' },
  disconnectButton: { alignItems: 'center', marginTop: 16, paddingVertical: 10 },
  disconnectButtonText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
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
