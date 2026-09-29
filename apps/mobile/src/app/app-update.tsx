import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useRef, useState } from 'react';
import { MIN_TOUCH_SIZE, SPACING, TYPE } from '@/constants/design';
import { useTheme } from '@/features/theme/theme-provider';
import { useAppUpdate } from '@/features/app-update/update-provider';
import { installedVersion, releasePage, updateSupport, unavailableMessage } from '@/features/app-update/update-client';
import { useApkDownload } from '@/features/app-update/use-apk-download';

export default function AppUpdateScreen() {
  const colors = useTheme();
  const { state, check } = useAppUpdate();
  const checkOnOpen = useRef(check);
  useEffect(() => { void checkOnOpen.current(); }, []);
  const apk = useApkDownload();
  const [linkError, setLinkError] = useState('');
  const release = apk.release ?? state.release;
  const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: SPACING.xl, gap: SPACING.lg },
    card: { backgroundColor: colors.surface, padding: SPACING.lg, borderRadius: 20, gap: SPACING.md },
    title: { ...TYPE.heading, color: colors.ink, fontWeight: '700' },
    text: { ...TYPE.body, color: colors.ink },
    detail: { ...TYPE.caption, color: colors.muted },
    action: { minHeight: MIN_TOUCH_SIZE, justifyContent: 'center', paddingVertical: SPACING.sm },
    label: { ...TYPE.body, color: colors.accent, fontWeight: '600' },
    track: { height: SPACING.sm, backgroundColor: colors.track, borderRadius: SPACING.xs, overflow: 'hidden' },
    progress: { height: '100%', backgroundColor: colors.accent },
  });
  const button = (title: string, onPress: () => void, disabled = false) => <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.action, { opacity: pressed || disabled ? 0.5 : 1 }]}><Text style={styles.label}>{title}</Text></Pressable>;
  async function openPage() {
    setLinkError('');
    try { await Linking.openURL(release?.pageUrl ?? releasePage); }
    catch { setLinkError('无法打开页面，请重试。'); }
  }
  function confirmDownload() {
    if (!release?.apk) return;
    Alert.alert(`下载 ${release.version}？`, `安装包约 ${(release.apk.size / 1024 / 1024).toFixed(1)} MB，将使用当前网络。下载后由你确认安装。`, [
      { text: '取消', style: 'cancel' },
      { text: '下载更新', onPress: () => void apk.download(release) },
    ]);
  }
  return <SafeAreaView edges={['bottom']} style={styles.screen}><ScrollView contentContainerStyle={styles.content}>
    <View style={styles.card}>
      <Text style={styles.title}>当前版本 {installedVersion}</Text>
      {updateSupport !== 'unconfigured' ? <Text style={styles.detail}>进入应用时自动检查，每 24 小时最多一次；同一新版提醒后 7 天内不重复提示。下载和安装均由你决定。</Text> : null}
      {updateSupport === 'unconfigured' ? <Text style={styles.detail}>{unavailableMessage}</Text> : null}
      {button(state.status === 'checking' ? '正在检查…' : '检查更新', () => void check(), state.status === 'checking' || apk.status === 'downloading' || apk.status === 'ready')}
      {state.status === 'latest' ? <Text style={styles.text}>当前渠道没有更新版本。</Text> : null}
      {state.status === 'error' && state.error !== unavailableMessage ? <Text accessibilityRole="alert" style={styles.detail}>{state.error}</Text> : null}
    </View>
    {release ? <View style={styles.card}>
      <Text style={styles.title}>新版本 {release.version}</Text>
      <Text style={styles.text}>{release.notes || '此版本暂无更新说明。'}</Text>
      {apk.status === 'downloading' ? <>
        <Text style={styles.text}>正在下载 {Math.floor(apk.progress * 100)}%</Text>
        <View accessibilityRole="progressbar" accessibilityLabel="更新下载进度" accessibilityValue={{ min: 0, max: 100, now: Math.floor(apk.progress * 100) }} style={styles.track}><View style={[styles.progress, { width: `${apk.progress * 100}%` }]} /></View>
        <Text style={styles.detail}>离开此页面会取消下载。</Text>
        {button('取消下载', () => void apk.cancel())}
      </> : apk.status === 'ready' ? <>
        <Text style={styles.text}>下载完成</Text>
        <Text style={styles.detail}>系统可能要求允许 Kaku 安装应用；取消安装后仍可在这里重试。</Text>
        {button('打开系统安装器', () => void apk.install())}
      </> : release.apk ? button(apk.status === 'error' ? '重新下载' : '下载更新', confirmDownload) : button('前往 App Store 更新', () => void openPage())}
      {apk.error ? <Text accessibilityRole="alert" style={styles.detail}>{apk.error}</Text> : null}
    </View> : null}
    {apk.status !== 'downloading' ? button(release?.apk ? '改用网页下载' : '查看发布页面', () => void openPage()) : null}
    {linkError ? <Text accessibilityRole="alert" style={styles.detail}>{linkError}</Text> : null}
  </ScrollView></SafeAreaView>;
}
