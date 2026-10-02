import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getSubjectDetailLabels } from '@/features/catalog/subject-types';
import { prefetchSubjectTopics } from '@/features/discussions/use-bangumi-discussions';
import { prefetchSubjectIndexes } from '@/features/indexes/use-indexes';
import { prefetchSubjectStaff } from '@/features/staff/use-subject-staff';
import { prefetchSubjectCharacters, prefetchSubjectRelations } from '@/features/subject-extras/use-subject-extras';
import { SPACING, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/features/theme/theme-provider';

function useThemedStyles() {
  const colors = useTheme();
  const styles = createStyles(colors);

  return { colors, styles };
}

function DetailEntry({
  hint,
  label,
  onPress,
  onPressIn,
  withBorder = false,
}: {
  hint: string;
  label: string;
  onPress: () => void;
  onPressIn?: () => void;
  withBorder?: boolean;
}) {
  const { colors, styles } = useThemedStyles();
  return (
    <Pressable
      accessibilityLabel={`查看${label}`}
      accessibilityRole="button"
      onPress={onPress}
      onPressIn={onPressIn}
      style={({ pressed }) => [
        styles.detailEntry,
        withBorder && styles.detailEntryBorder,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.detailEntryCopy}>
        <Text style={styles.detailEntryTitle}>{label}</Text>
        <Text maxFontSizeMultiplier={1.3} numberOfLines={2} style={styles.detailEntryHint}>{hint}</Text>
      </View>
      <SymbolView
        name={{ android: 'chevron_right', ios: 'chevron.right', web: 'chevron_right' }}
        size={13}
        tintColor={colors.subtle}
        weight="semibold"
      />
    </Pressable>
  );
}

export function SubjectDetailLinks({ subjectId, subjectType }: { subjectId: number; subjectType: number }) {
  const { styles } = useThemedStyles();
  const queryClient = useQueryClient();
  const router = useRouter();
  const detailLabels = getSubjectDetailLabels(subjectType);
  return (
    <View style={styles.detailEntries}>
      {detailLabels.characters ? (
        <DetailEntry
          hint={detailLabels.characters.hint}
          label={detailLabels.characters.label}
          onPress={() =>
            router.push({
              pathname: '/subject/[id]/characters',
              params: { id: String(subjectId) },
            })
          }
          onPressIn={() =>
            prefetchSubjectCharacters(queryClient, subjectId)
          }
        />
      ) : null}
      <DetailEntry
        hint={detailLabels.credits.hint}
        label={detailLabels.credits.label}
        onPress={() =>
          router.push({
            pathname: '/subject/[id]/staff',
            params: { id: String(subjectId) },
          })
        }
        onPressIn={() => prefetchSubjectStaff(queryClient, subjectId)}
        withBorder={Boolean(detailLabels.characters)}
      />
      <DetailEntry
        hint="系列作品与相关条目"
        label="关联条目"
        onPress={() =>
          router.push({
            pathname: '/subject/[id]/relations',
            params: { id: String(subjectId) },
          })
        }
        onPressIn={() =>
          prefetchSubjectRelations(queryClient, subjectId)
        }
        withBorder
      />
      <DetailEntry
        hint="条目相关话题与回复"
        label="讨论版"
        onPress={() =>
          router.push({
            pathname: '/subject/[id]/discussions',
            params: { id: String(subjectId) },
          })
        }
        onPressIn={() => prefetchSubjectTopics(queryClient, subjectId)}
        withBorder
      />
      <DetailEntry
        hint="收录该条目的公开主题目录"
        label="目录"
        onPress={() =>
          router.push({
            pathname: '/subject/[id]/indexes',
            params: { id: String(subjectId) },
          })
        }
        onPressIn={() => prefetchSubjectIndexes(queryClient, subjectId)}
        withBorder
      />
      <DetailEntry
        hint="评分分布、收藏与基础信息"
        label="条目资料"
        onPress={() =>
          router.push({
            pathname: '/subject/[id]/info',
            params: { id: String(subjectId) },
          })
        }
        withBorder
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  detailEntries: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
    paddingHorizontal: SPACING.lg + SPACING.xs,
  },
  detailEntry: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.lg,
  },
  detailEntryCopy: { flex: 1, minWidth: 0, paddingRight: SPACING.md },
  detailEntryBorder: {
    borderTopColor: colors.divider,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  detailEntryTitle: { color: colors.ink, ...TYPE.heading, fontWeight: '800' },
  detailEntryHint: { color: colors.subtle, ...TYPE.micro, marginTop: SPACING.xs },
  pressed: { opacity: 0.62 },
});
