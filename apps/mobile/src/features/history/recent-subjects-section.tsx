import { useMemo } from 'react';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { getSubjectTypeLabel } from '@/features/catalog/subject-types';
import { usePrefetchSubject } from '@/features/catalog/use-catalog-subject';
import { useTheme } from '@/features/theme/theme-provider';

import type { RecentSubject } from './recent-subjects-model';

export function RecentSubjectsSection({
  items,
  onClear,
}: {
  items: RecentSubject[];
  onClear: () => void;
}) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!items.length) return null;

  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <Text style={styles.title}>最近浏览</Text>
        <Pressable
          accessibilityLabel="清除最近浏览"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onClear}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Text style={styles.clear}>清除</Text>
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={styles.list}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {items.map((item) => (
          <RecentSubjectCard item={item} key={item.id} styles={styles} />
        ))}
      </ScrollView>
    </View>
  );
}

function RecentSubjectCard({
  item,
  styles,
}: {
  item: RecentSubject;
  styles: ReturnType<typeof createStyles>;
}) {
  const prefetchSubject = usePrefetchSubject();

  return (
    <View style={styles.card}>
      <Link
        asChild
        href={{
          pathname: '/subject/[id]',
          params: { id: String(item.id) },
        }}
      >
        <Pressable
          accessibilityLabel={`再次打开${item.title}`}
          accessibilityRole="button"
          onPressIn={() => prefetchSubject.prefetch(item.id)}
          onPressOut={prefetchSubject.cancel}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Link.AppleZoom>
            <View style={styles.cover}>
              <Text style={styles.coverFallback}>
                {item.title.slice(0, 1)}
              </Text>
              {item.coverUrl ? (
                <Image
                  contentFit="cover"
                  recyclingKey={item.coverUrl}
                  source={item.coverUrl}
                  style={StyleSheet.absoluteFill}
                  transition={120}
                />
              ) : null}
            </View>
          </Link.AppleZoom>
          <Text
            ellipsizeMode="tail"
            numberOfLines={2}
            style={styles.cardTitle}
          >
            {item.title}
          </Text>
          <Text style={styles.cardMeta}>
            {getSubjectTypeLabel(item.type)}
          </Text>
        </Pressable>
      </Link>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  section: { paddingTop: 24 },
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 30,
    paddingHorizontal: 4,
  },
  title: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  clear: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  list: { gap: 13, paddingRight: 20, paddingTop: 12 },
  card: { width: 96 },
  cover: {
    alignItems: 'center',
    backgroundColor: colors.track,
    borderCurve: 'continuous',
    borderRadius: 14,
    height: 134,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 96,
  },
  coverFallback: { color: colors.subtle, fontSize: 16, fontWeight: '700' },
  cardTitle: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '700',
    height: 34,
    lineHeight: 17,
    marginTop: 8,
  },
  cardMeta: { color: colors.subtle, fontSize: 11, marginTop: 3 },
  pressed: { opacity: 0.62 },
});
