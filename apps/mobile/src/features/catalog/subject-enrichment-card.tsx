import { useMemo } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { HIT_SLOP } from '@/constants/design';
import { useTheme } from '@/features/theme/theme-provider';
import { userErrorMessage } from '@/lib/user-error-message';

import { useSubjectEnrichment } from './use-subject-enrichment';

export function SubjectEnrichmentCard({ subjectId }: { subjectId: number }) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const query = useSubjectEnrichment(subjectId, true);
  const enrichment = query.data;

  if (query.isPending) {
    return (
      <View style={styles.card}>
        <Text style={styles.eyebrow}>其它来源</Text>
        <Text style={styles.copy}>正在对照 AniList 查找同一部作品。</Text>
      </View>
    );
  }

  if (query.isError) {
    return (
      <View style={styles.card}>
        <Text style={styles.eyebrow}>其它来源</Text>
        <Text style={styles.copy}>
          {userErrorMessage(query.error, 'AniList 暂时没有响应。')}
        </Text>
        <Pressable
          accessibilityRole="button"
          hitSlop={HIT_SLOP}
          onPress={() => void query.refetch()}
          style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
        >
          <Text style={styles.retryText}>重试</Text>
        </Pressable>
      </View>
    );
  }

  if (!enrichment?.matched) {
    return (
      <View style={styles.card}>
        <Text style={styles.eyebrow}>其它来源</Text>
        <Text style={styles.copy}>AniList 上没有找到标题完全一致的条目。</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>AniList</Text>
      <Text style={styles.title}>{enrichment.title ?? '对应条目'}</Text>
      {enrichment.score != null ? (
        <Text style={styles.copy}>评分 {enrichment.score}</Text>
      ) : null}
      <View style={styles.actions}>
        {enrichment.url ? (
          <Pressable
            accessibilityRole="link"
            hitSlop={HIT_SLOP}
            onPress={() => void Linking.openURL(enrichment.url!)}
            style={({ pressed }) => [styles.link, pressed && styles.pressed]}
          >
            <Text style={styles.linkText}>打开 AniList</Text>
          </Pressable>
        ) : null}
        {enrichment.trailerUrl ? (
          <Pressable
            accessibilityRole="link"
            hitSlop={HIT_SLOP}
            onPress={() => void Linking.openURL(enrichment.trailerUrl!)}
            style={({ pressed }) => [styles.link, pressed && styles.pressed]}
          >
            <Text style={styles.linkText}>预告片</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderCurve: 'continuous',
      borderRadius: 20,
      gap: 6,
      marginHorizontal: 20,
      marginTop: 16,
      padding: 16,
    },
    eyebrow: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 0.4,
    },
    title: {
      color: colors.ink,
      fontSize: 17,
      fontWeight: '700',
    },
    copy: {
      color: colors.subtle,
      fontSize: 14,
      lineHeight: 20,
    },
    actions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginTop: 6,
    },
    link: { minHeight: 32, justifyContent: 'center' },
    linkText: { color: colors.accent, fontSize: 15, fontWeight: '600' },
    retry: { alignSelf: 'flex-start', marginTop: 4, minHeight: 32, justifyContent: 'center' },
    retryText: { color: colors.accent, fontSize: 15, fontWeight: '600' },
    pressed: { opacity: 0.62 },
  });
