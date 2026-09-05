import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useAuth } from '@/features/auth/auth-provider';
import { useCatalogSubject } from '@/features/catalog/use-catalog-subject';
import { usePersonalCollection } from '@/features/collections/use-personal-collection';
import { getPersonalCollection, savePersonalCollection } from '@/infrastructure/kaku/collections-client';
import { queryKeys } from '@/lib/query-keys';
import { playSuccessHaptic } from '@/lib/haptics';
import { useTheme } from '@/features/theme/theme-provider';
import { applyQuickProgress, nextTrackingEpisode } from './quick-progress';

export function QuickProgressButton({ subjectId }: { subjectId: number }) {
  const { session } = useAuth();
  const [expanded, setExpanded] = useState(false);
  if (!session) return null;
  return expanded ? <LoadedProgress key={`${session.user.id}:${subjectId}`} subjectId={subjectId} /> : (
    <ProgressAction label="记录进度" onPress={() => setExpanded(true)} />
  );
}
function ProgressAction({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  const colors = useTheme();
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', opacity: pressed || disabled ? 0.6 : 1 })}>
    <Text style={{ color: colors.accent, fontSize: 12, lineHeight: 17 }}>{label}</Text>
  </Pressable>;
}
function LoadedProgress({ subjectId }: { subjectId: number }) {
  const colors = useTheme();
  const { session, request } = useAuth();
  const client = useQueryClient();
  const subject = useCatalogSubject(subjectId);
  const personal = usePersonalCollection(subjectId);
  const [undoEpisode, setUndoEpisode] = useState<number | null>(null);
  const [failedAction, setFailedAction] = useState<{ episode: number; undo: boolean } | null>(null);
  const busy = useRef(false);
  const queryKey = queryKeys.personalCollection(session?.user.id, subjectId);
  const mutation = useMutation({
    scope: { id: JSON.stringify(queryKey) },
    retry: false,
    networkMode: 'always',
    mutationFn: async (action: { episode: number; undo: boolean }) => {
      // Read at execution time, after earlier writes in this scope, including undo.
      const current = await getPersonalCollection(request, subjectId);
      if (!action.undo && (!subject.data || nextTrackingEpisode(subject.data, current)?.number !== action.episode)) {
        throw new Error('进度已变化，请进入章节页确认');
      }
      return savePersonalCollection(request, subjectId, applyQuickProgress(current, action.episode, action.undo));
    },
    onSuccess: (collection) => {
      client.setQueryData(queryKey, collection);
      void client.invalidateQueries({ queryKey: queryKeys.publicUser(session?.user.username ?? '') });
    },
    onError: () => { void client.invalidateQueries({ queryKey }); },
  });
  async function change(action: { episode: number; undo: boolean }) {
    if (busy.current) return;
    busy.current = true;
    setFailedAction(null);
    try {
      await mutation.mutateAsync(action);
      setUndoEpisode(action.undo ? null : action.episode);
      playSuccessHaptic();
    } catch { setFailedAction(action); }
    finally { busy.current = false; }
  }
  const openChapters = () => router.push({ pathname: '/subject/[id]', params: { id: String(subjectId) } });
  if (mutation.isPending) return <ProgressAction label="正在同步…" disabled onPress={() => {}} />;
  if (failedAction) return <View>
    <Text accessibilityRole="alert" style={{ color: colors.muted, fontSize: 12 }}>{mutation.error?.message ?? '同步失败'}</Text>
    <ProgressAction label="重试同步" onPress={() => void change(failedAction)} />
    <ProgressAction label="查看章节" onPress={openChapters} />
  </View>;
  if (undoEpisode !== null) return <View>
    <Text style={{ color: colors.muted, fontSize: 12 }}>第 {undoEpisode} 集已看</Text>
    <ProgressAction label="撤销本次标记" onPress={() => void change({ episode: undoEpisode, undo: true })} />
    <ProgressAction label="继续记录" onPress={() => setUndoEpisode(null)} />
  </View>;
  if (subject.fetchStatus === 'paused' || personal.fetchStatus === 'paused') return <ProgressAction label="离线 · 查看章节" onPress={openChapters} />;
  if (subject.isError || personal.isError) return <ProgressAction label="进度读取失败 · 重试" onPress={() => { void subject.refetch(); void personal.refetch(); }} />;
  if (!subject.data || personal.isPending) return <ProgressAction label="正在读取进度…" disabled onPress={() => {}} />;
  const next = nextTrackingEpisode(subject.data, personal.data ?? null);
  return next ? <ProgressAction label={`第 ${next.number} 集 · 标记看过`} onPress={() => void change({ episode: next.number, undo: false })} />
    : <ProgressAction label="进入章节选择" onPress={openChapters} />;
}
