import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MIN_TOUCH_SIZE, SPACING, TYPE } from '@/constants/design';
import { AppSheet } from '@/features/shared/app-sheet';
import { useTheme } from '@/features/theme/theme-provider';

export function UpdateDownloadSheet({ visible, status, progress, error, onClose, onInstall, onRetry, onWeb }: {
  visible: boolean; status: 'idle' | 'downloading' | 'ready' | 'error'; progress: number; error: string;
  onClose: () => void; onInstall: () => void; onRetry: () => void; onWeb: () => void;
}) {
  const colors = useTheme();
  const styles = StyleSheet.create({
    content: { padding: SPACING.xl, gap: SPACING.md },
    title: { ...TYPE.heading, color: colors.ink, fontWeight: '700' },
    copy: { ...TYPE.body, color: colors.muted },
    track: { height: SPACING.sm, backgroundColor: colors.track, borderRadius: SPACING.xs, overflow: 'hidden' },
    fill: { height: '100%', backgroundColor: colors.accent },
    button: { minHeight: MIN_TOUCH_SIZE, justifyContent: 'center' },
    label: { ...TYPE.body, color: colors.accent },
  });
  const button = (text: string, onPress: () => void) => <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.button, pressed && { opacity: 0.5 }]}><Text style={styles.label}>{text}</Text></Pressable>;
  const downloading = status === 'downloading' || status === 'idle';
  return <AppSheet visible={visible} onClose={onClose}>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>{downloading ? `正在下载 ${Math.floor(progress * 100)}%` : status === 'ready' ? '下载完成' : '下载未完成'}</Text>
      {downloading ? <View accessible accessibilityRole="progressbar" accessibilityLabel="更新下载进度" accessibilityValue={{ min: 0, max: 100, now: Math.floor(progress * 100) }} style={styles.track}><View style={[styles.fill, { width: `${progress * 100}%` }]} /></View> : null}
      {error ? <Text accessibilityRole="alert" style={styles.copy}>{error}</Text> : null}
      {status === 'ready' ? button('安装更新', onInstall) : null}
      {status === 'error' ? button('重试下载', onRetry) : null}
      {status === 'error' || (status === 'ready' && error) ? button('改用网页下载', onWeb) : null}
      {button(downloading ? '取消下载' : '关闭', onClose)}
    </ScrollView>
  </AppSheet>;
}
