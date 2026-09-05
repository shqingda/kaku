import { useEffect, useState } from 'react';
import { SymbolView } from 'expo-symbols';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
} from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { CollectionControls } from '@/features/subject-detail/collection-controls';
import { useTheme } from '@/features/theme/theme-provider';
import type { PublicUserCollection } from '@/features/users/model';
import type { WatchingItem } from '@/features/watching/model';
import type { PersonalCollection } from './model';
import {
  usePersonalCollection,
  useSavePersonalCollection,
} from './use-personal-collection';

function toCollectionEditorItem(
  item: PublicUserCollection,
  personal: PersonalCollection | null,
): WatchingItem {
  return {
    collectionStatus: personal?.collectionStatus ?? item.collectionStatus,
    comment: personal?.comment ?? '',
    coverUrl: item.coverUrl ?? '',
    episodeAirDates: [],
    id: item.id,
    isPrivate: personal?.isPrivate ?? false,
    rating: personal?.rating ?? item.rate,
    readChapterCount:
      item.subjectType === 1
        ? (personal?.readChapterCount ?? item.progress)
        : undefined,
    readVolumeCount:
      item.subjectType === 1
        ? (personal?.readVolumeCount ?? item.volumeProgress)
        : undefined,
    summary: '',
    tags: personal?.tags ?? [],
    title: item.title,
    totalEpisodes: item.totalEpisodes,
    type: item.subjectType,
    watchedEpisodeNumbers:
      personal?.watchedEpisodeNumbers ??
      Array.from({ length: item.progress }, (_, index) => index + 1),
    year: 0,
  };
}

export function CollectionRowEditor({ item }: { item: PublicUserCollection }) {
  const colors = useTheme();
  const styles = createStyles(colors);
  const [open, setOpen] = useState(false);
  const personalQuery = usePersonalCollection(item.id, { enabled: open });
  const saveCollection = useSavePersonalCollection(item.id);

  useEffect(() => {
    if (!open || personalQuery.data !== undefined || !personalQuery.isError) {
      return;
    }

    Alert.alert(
      '收藏没有打开',
      personalQuery.error instanceof Error
        ? personalQuery.error.message
        : '请稍后重试。',
      [
        { onPress: () => setOpen(false), style: 'cancel', text: '取消' },
        { onPress: () => void personalQuery.refetch(), text: '重试' },
      ],
    );
  }, [open, personalQuery.data, personalQuery.error, personalQuery.isError]);

  if (open && personalQuery.data !== undefined) {
    return (
      <CollectionControls
        initiallyOpen
        item={toCollectionEditorItem(item, personalQuery.data)}
        onDismiss={() => setOpen(false)}
        onSave={(update) =>
          saveCollection.mutateAsync(update).then(() => undefined)
        }
        variant="compact"
      />
    );
  }

  const loading = open && personalQuery.data === undefined && !personalQuery.isError;

  return (
    <Pressable
      accessibilityLabel={
        personalQuery.isError
          ? `重新读取${item.title}的收藏`
          : `编辑${item.title}的收藏和进度`
      }
      accessibilityRole="button"
      disabled={loading}
      hitSlop={5}
      onPress={(event) => {
        event.stopPropagation();
        setOpen(true);
        if (personalQuery.isError) {
          void personalQuery.refetch();
        }
      }}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      {loading ? (
        <ActivityIndicator color={colors.ink} size="small" />
      ) : (
        <SymbolView
          name={{ android: 'edit', ios: 'square.and.pencil', web: 'edit' }}
          size={16}
          tintColor={colors.ink}
          weight="semibold"
        />
      )}
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    button: {
      alignItems: 'center',
      backgroundColor: colors.surfaceSoft,
      borderColor: colors.inputBorder,
      borderRadius: 10,
      borderWidth: StyleSheet.hairlineWidth,
      height: 34,
      justifyContent: 'center',
      marginLeft: 10,
      width: 34,
    },
    pressed: { opacity: 0.62 },
  });

