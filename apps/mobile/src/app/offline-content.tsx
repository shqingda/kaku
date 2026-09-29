import { useCallback, useRef, useState } from 'react';
import { router, Stack, useFocusEffect } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MIN_TOUCH_SIZE, SPACING, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/features/theme/theme-provider';
import { AppState } from '@/features/shared/app-state';
import { listOfflineSubjects, removeOfflineSubject } from '@/features/catalog/offline-subject-pack';
import { OFFLINE_SUBJECT_PACK_TTL_MS, type PackedSubject } from '@/features/catalog/offline-subject-pack-model';

export default function OfflineContentScreen() {
  const styles = createStyles(useTheme());
  const [items, setItems] = useState<PackedSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [removing, setRemoving] = useState<number | null>(null);
  const busy = useRef(false);
  const active = useRef(false);
  const reload = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const next = await listOfflineSubjects();
      if (active.current) setItems(next);
    } catch { if (active.current) setError(true); }
    finally { if (active.current) setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => {
    active.current = true;
    void reload();
    return () => { active.current = false; };
  }, [reload]));
  async function remove(id: number) {
    if (busy.current) return;
    busy.current = true;
    setRemoving(id);
    try {
      await removeOfflineSubject(id);
      if (active.current) setItems(previous => previous.filter(item => item.subject.id !== id));
    } catch {
      if (active.current) Alert.alert('没有移除', '本机存储操作失败，请重试。', [
        { text: '取消', style: 'cancel' }, { text: '重试', onPress: () => void remove(id) },
      ]);
    } finally {
      busy.current = false;
      if (active.current) setRemoving(null);
    }
  }
  return <SafeAreaView edges={['bottom']} style={styles.screen}>
    <Stack.Screen options={{ title: '离线内容' }} />
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.description}>自动保存最近查看的最多 10 个条目，有效期 30 天。可离线读取条目资料与章节信息；图片、讨论和最新进度仍可能需要联网。</Text>
      <Text style={styles.description}>移除仅删除自动离线副本；再次联网查看时会重新保存。其他缓存可在“清理缓存”中清除。</Text>
      {error ? <AppState title="离线内容读取失败" text="请重试读取本机存储。" action={() => void reload()} /> : null}
      {loading ? <ActivityIndicator accessibilityLabel="正在读取离线内容" /> : null}
      {!loading && !error && items.length === 0 ? <AppState title="暂无离线内容" text="联网打开条目后会自动保存资料。" /> : null}
      {items.map(item => <View key={item.subject.id} style={styles.card}>
        <Pressable accessibilityRole="button" accessibilityLabel={`打开离线条目：${item.subject.title}`} onPress={() => router.push(`/subject/${item.subject.id}`)} style={({ pressed }) => [styles.open, pressed && styles.pressed]}>
          <Text style={styles.title}>{item.subject.title}</Text>
          <Text style={styles.meta}>本机保存：{new Date(item.savedAt).toLocaleString()}</Text>
          <Text style={styles.meta}>有效至：{new Date(item.savedAt + OFFLINE_SUBJECT_PACK_TTL_MS).toLocaleDateString()}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`移除离线副本：${item.subject.title}`} accessibilityState={{ disabled: removing !== null, busy: removing === item.subject.id }} disabled={removing !== null} style={styles.remove} onPress={() => Alert.alert('移除离线副本？', `移除“${item.subject.title}”的自动离线资料，收藏和历史不受影响。`, [
          { text: '取消', style: 'cancel' }, { text: '移除', style: 'destructive', onPress: () => void remove(item.subject.id) },
        ])}><Text style={styles.action}>{removing === item.subject.id ? '正在移除…' : '移除离线副本'}</Text></Pressable>
      </View>)}
    </ScrollView>
  </SafeAreaView>;
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: SPACING.xl, gap: SPACING.lg },
  description: { ...TYPE.body, color: colors.muted },
  card: { backgroundColor: colors.surface, borderRadius: 18, padding: SPACING.lg },
  open: { minHeight: MIN_TOUCH_SIZE, gap: SPACING.sm },
  title: { ...TYPE.heading, color: colors.ink, fontWeight: '700' },
  meta: { ...TYPE.caption, color: colors.muted },
  remove: { minHeight: MIN_TOUCH_SIZE, justifyContent: 'center', marginTop: SPACING.sm },
  action: { ...TYPE.body, color: colors.accent },
  pressed: { opacity: 0.6 },
});
