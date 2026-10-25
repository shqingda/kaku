import { HistoryLocalNotice } from '@/features/history/history-local-notice';
import { SpoilerSetting } from '@/features/preferences/spoiler-setting';
import { useState } from 'react';
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HIT_SLOP } from '@/constants/design';
import { useAuth } from '@/features/auth/auth-provider';
import { useRecentSubjects } from '@/features/history/recent-subjects-provider';
import { usePreferences } from '@/features/preferences/preferences-provider';
import { usePushRegistration } from '@/features/push/use-push-registration';
import { useSearchHistory } from '@/features/search/search-history-provider';
import { SettingsThemeCard } from '@/features/preferences/settings-theme-card';
import { SettingsSyncStatusList } from '@/features/preferences/settings-sync-status-list';
import { createSettingsStyles } from '@/features/preferences/settings-styles';
import { useTheme } from '@/features/theme/theme-provider';
import { playSelectionHaptic } from '@/lib/haptics';

export default function SettingsScreen() {
  const colors = useTheme();
  const styles = createSettingsStyles(colors);
  const { session } = useAuth();
  const {
    cloudError,
    cloudSyncAvailable,
    canSync,
    localStatus,
    localError,
    retryLocal,
    preferences,
    retryCloudSync,
    setSyncEnabled,
    setTheme,
    syncing,
  } = usePreferences();
  const recentSubjects = useRecentSubjects();
  const searchHistory = useSearchHistory();
  const push = usePushRegistration();
  const [settingsError, setSettingsError] = useState<string | null>(null);
  async function openNotificationSettings() {
    setSettingsError(null);
    try { await Linking.openSettings(); }
    catch { setSettingsError('无法打开系统设置，请重试，或从系统设置中打开 Kaku 的通知权限。'); }
  }
  const signedIn = Boolean(session);
  const channels = [
    {
      key: 'appearance', label: '外观', ready: true,
      error: cloudError, syncing, onRetry: () => void retryCloudSync(),
    },
    {
      key: 'search', label: `最近搜索 ${searchHistory.items.length} 条`,
      ready: searchHistory.localStatus === 'ready', error: searchHistory.cloudError,
      syncing: searchHistory.syncing, onRetry: () => void searchHistory.retryCloudSync(),
    },
    {
      key: 'browse', label: `最近浏览 ${recentSubjects.items.length} 条`,
      ready: recentSubjects.localStatus === 'ready', error: recentSubjects.cloudError,
      syncing: recentSubjects.syncing, onRetry: () => void recentSubjects.retryCloudSync(),
    },
  ];

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionTitle, styles.firstSectionTitle]}>
          外观
        </Text>
        <SettingsThemeCard
          theme={preferences.theme}
          onSelect={setTheme}
          colors={colors}
          styles={styles}
        />

        {localStatus === 'loading' ? (
          <Text style={styles.rowDescription}>正在读取本机偏好，云同步暂未开启。</Text>
        ) : localError ? (
          <View style={styles.localNotice}>
            <Text accessibilityRole="alert" style={styles.rowDescription}>{localError}</Text>
            <Pressable
              accessibilityLabel={localStatus === 'read-error' ? '重试读取本机偏好' : '重试保存本机偏好'}
              accessibilityRole="button"
              onPress={() => void retryLocal()}
              style={({ pressed }) => [styles.statusRow, pressed && styles.pressed]}
            >
              <Text style={styles.rowAction}>{localStatus === 'read-error' ? '重试读取' : '重试保存'}</Text>
            </Pressable>
          </View>
        ) : preferences.syncEnabled && cloudSyncAvailable && !canSync ? (
          <Text style={styles.rowDescription}>正在保存本机偏好，云同步暂未开启。</Text>
        ) : null}

        <Text style={styles.sectionTitle}>同步</Text>
        <View style={styles.group}>
          {session ? (
            <View style={styles.syncBlock}>
              <View style={styles.syncHeader}>
                <Text style={styles.rowTitle}>云同步</Text>
                <Switch
                  accessibilityLabel="云同步"
                  disabled={!cloudSyncAvailable && !preferences.syncEnabled}
                  ios_backgroundColor={colors.track}
                  onValueChange={(enabled) => {
                    playSelectionHaptic();
                    setSyncEnabled(enabled);
                  }}
                  testID="preference-sync-switch"
                  thumbColor={
                    Platform.OS === 'android' ? '#FFFFFF' : undefined
                  }
                  trackColor={{ false: colors.track, true: colors.accent }}
                  value={preferences.syncEnabled}
                />
              </View>
              <SettingsSyncStatusList
                available={cloudSyncAvailable}
                enabled={canSync}
                signedIn={signedIn}
                channels={channels}
                colors={colors}
                styles={styles}
              />
            </View>
          ) : (
            <Pressable
              accessibilityLabel="前往登录"
              accessibilityRole="button"
              onPress={() => router.push('/account')}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>设备间同步</Text>
                <Text style={styles.rowDescription}>
                  登录后即可在设备间同步。
                </Text>
              </View>
              <Text style={styles.rowAction}>去登录</Text>
            </Pressable>
          )}
        </View>

        <HistoryLocalNotice label="搜索历史" history={searchHistory} />
        <HistoryLocalNotice label="浏览历史" history={recentSubjects} />
        <SpoilerSetting />
        <Text style={styles.sectionTitle}>通知</Text>
        <View style={styles.group}>
          {session ? (
            <View style={styles.syncBlock}>
              <View style={styles.syncHeader}>
                <Text style={styles.rowTitle}>推送通知</Text>
                <Switch
                  accessibilityLabel="推送通知"
                  disabled={
                    push.status === 'unavailable' || push.status === 'simulator'
                  }
                  ios_backgroundColor={colors.track}
                  onValueChange={(next) => {
                    playSelectionHaptic();
                    push.setEnabled(next);
                  }}
                  thumbColor={
                    Platform.OS === 'android' ? '#FFFFFF' : undefined
                  }
                  trackColor={{ false: colors.track, true: colors.accent }}
                  value={push.enabled}
                />
              </View>
              <Text style={styles.rowDescription}>
                {push.status === 'registering'
                  ? '正在登记这台设备…'
                  : push.status === 'on'
                  ? '有新的 Bangumi 通知时，会发到这台设备。'
                  : push.status === 'denied'
                    ? '系统通知权限未打开，可在系统设置里允许后再开。'
                    : push.status === 'simulator'
                      ? '模拟器收不到远程推送，请用真机打开。'
                      : push.status === 'failed'
                        ? (push.error ?? '推送登记失败，请稍后重试。')
                        : push.status === 'unavailable'
                          ? (push.error ?? '当前安装还没有推送模块，需要重新编译后再打开。')
                          : '打开后，未读回复会推送到这台设备。'}
              </Text>
              {push.status === 'denied' || settingsError ? (
                <Pressable accessibilityRole="button" onPress={() => void openNotificationSettings()} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                  <Text style={styles.rowAction}>打开系统设置</Text>
                </Pressable>
              ) : null}
              {settingsError ? <Text accessibilityRole="alert" style={styles.rowDescription}>{settingsError}</Text> : null}
              {push.status === 'failed' ? (
                <Pressable
                  accessibilityRole="button"
                  hitSlop={HIT_SLOP}
                  onPress={push.retry}
                  style={({ pressed }) => [
                    styles.row,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.rowAction}>重试</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <Pressable
              accessibilityLabel="前往登录"
              accessibilityRole="button"
              onPress={() => router.push('/account')}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>推送通知</Text>
                <Text style={styles.rowDescription}>
                  登录后即可在这台设备接收未读通知。
                </Text>
              </View>
              <Text style={styles.rowAction}>去登录</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
