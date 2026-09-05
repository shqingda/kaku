import { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';

import { useAuth } from '@/features/auth/auth-provider';
import { useCatalogSubject } from '@/features/catalog/use-catalog-subject';
import { usePersonalCollection } from '@/features/collections/use-personal-collection';
import {
  getPersonalCollection,
  savePersonalCollection,
} from '@/infrastructure/kaku/collections-client';
import { playSuccessHaptic } from '@/lib/haptics';
import { queryKeys } from '@/lib/query-keys';
import { useTheme } from '@/features/theme/theme-provider';

import {
  applyQuickProgress,
  nextTrackingEpisode,
  quickProgressAction,
} from './quick-progress';

export function QuickProgressButton({ subjectId }: { subjectId: number }) {
  const { session } = useAuth();
  if (!session) return null;
  return <LoadedProgress key={`${session.user.id}:${subjectId}`} subjectId={subjectId} />;
}

function ProgressAction({
  accessibilityHint,
  disabled = false,
  label,
  onPress,
}: {
  accessibilityHint?: string;
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
  const colors = useTheme();
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        justifyContent: 'center',
        minHeight: 44,
        opacity: pressed || disabled ? 0.6 : 1,
      })}
    >
      <Text style={{ color: colors.accent, fontSize: 12, lineHeight: 17 }}>
        {label}
      </Text>
    </Pressable>
  );
}

function LoadedProgress({ subjectId }: { subjectId: number }) {
  const colors = useTheme();
  const { request, session } = useAuth();
  const client = useQueryClient();
  const subject = useCatalogSubject(subjectId);
  const personal = usePersonalCollection(subjectId);
  const [undoEpisode, setUndoEpisode] = useState<number | null>(null);
  const [failedAction, setFailedAction] = useState<{
    episode: number;
    undo: boolean;
  } | null>(null);
  const busy = useRef(false);
  const queryKey = queryKeys.personalCollection(session?.user.id, subjectId);
  const mutation = useMutation({
    scope: { id: JSON.stringify(queryKey) },
    retry: false,
    networkMode: 'always',
    mutationFn: async (action: { episode: number; undo: boolean }) => {
      const current = await getPersonalCollection(request, subjectId);
      if (
        !action.undo &&
        (!subject.data ||
          nextTrackingEpisode(subject.data, current)?.number !== action.episode)
      ) {
        throw new Error('进度刚有更新，去勾选已看集数');
      }
      return savePersonalCollection(
        request,
        subjectId,
        applyQuickProgress(current, action.episode, action.undo),
      );
    },
    onSuccess: (collection) => {
      client.setQueryData(queryKey, collection);
      void client.invalidateQueries({
        queryKey: queryKeys.myCollections(session?.user.id),
      });
      void client.invalidateQueries({
        queryKey: queryKeys.publicUser(session?.user.username ?? ''),
      });
    },
    onError: () => {
      void client.invalidateQueries({ queryKey });
    },
  });

  async function change(action: { episode: number; undo: boolean }) {
    if (busy.current) return;
    busy.current = true;
    setFailedAction(null);
    try {
      await mutation.mutateAsync(action);
      setUndoEpisode(action.undo ? null : action.episode);
      playSuccessHaptic();
    } catch {
      setFailedAction(action);
    } finally {
      busy.current = false;
    }
  }

  function openChapters() {
    router.push({
      pathname: '/subject/[id]',
      params: { id: String(subjectId) },
    });
  }

  if (mutation.isPending) {
    return <ProgressAction disabled label="正在记下…" onPress={() => {}} />;
  }
  if (failedAction) {
    return (
      <View>
        <Text
          accessibilityRole="alert"
          style={{ color: colors.muted, fontSize: 12 }}
        >
          {mutation.error?.message ?? '没记下，请再试一次'}
        </Text>
        <ProgressAction
          label="再试一次"
          onPress={() => void change(failedAction)}
        />
        <ProgressAction
          accessibilityHint="打开条目，在章节列表里勾选已看的集"
          label="去勾选已看集数"
          onPress={openChapters}
        />
      </View>
    );
  }
  if (undoEpisode !== null) {
    return (
      <View>
        <Text style={{ color: colors.muted, fontSize: 12 }}>
          已记下第 {undoEpisode} 集
        </Text>
        <ProgressAction
          label="撤销"
          onPress={() => void change({ episode: undoEpisode, undo: true })}
        />
      </View>
    );
  }
  if (subject.fetchStatus === 'paused' || personal.fetchStatus === 'paused') {
    return (
      <ProgressAction
        accessibilityHint="打开条目，在章节列表里勾选已看的集"
        label="离线，去勾选已看集数"
        onPress={openChapters}
      />
    );
  }
  if (subject.isError || personal.isError) {
    return (
      <ProgressAction
        label="进度读取失败，点此重试"
        onPress={() => {
          void subject.refetch();
          void personal.refetch();
        }}
      />
    );
  }
  if (!subject.data || personal.isPending) {
    return <ProgressAction disabled label="读取进度…" onPress={() => {}} />;
  }

  const action = quickProgressAction(subject.data, personal.data ?? null);
  if (action.kind === 'mark') {
    return (
      <ProgressAction
        accessibilityHint={`把第 ${action.episode} 集记为已看，可撤销`}
        label={`看过第 ${action.episode} 集`}
        onPress={() => void change({ episode: action.episode, undo: false })}
      />
    );
  }
  if (action.kind === 'caughtUp') {
    return (
      <View style={{ justifyContent: 'center', minHeight: 44 }}>
        <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }}>
          正片已看完
        </Text>
      </View>
    );
  }
  return (
    <ProgressAction
      accessibilityHint="打开条目，在章节列表里勾选已看的集"
      label="去勾选已看集数"
      onPress={openChapters}
    />
  );
}
