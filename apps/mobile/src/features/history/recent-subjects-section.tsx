import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/design';
import { getSubjectTypeLabel } from '@/features/catalog/subject-types';

import type { RecentSubject } from './recent-subjects-model';

export function RecentSubjectsSection({
  items,
  onClear,
}: {
  items: RecentSubject[];
  onClear: () => void;
}) {
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
          <View key={item.id} style={styles.card}>
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
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingTop: 24 },
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 30,
    paddingHorizontal: 4,
  },
  title: { color: COLORS.ink, fontSize: 18, fontWeight: '800' },
  clear: { color: COLORS.muted, fontSize: 12, fontWeight: '600' },
  list: { gap: 13, paddingRight: 20, paddingTop: 12 },
  card: { width: 96 },
  cover: {
    alignItems: 'center',
    backgroundColor: COLORS.track,
    borderCurve: 'continuous',
    borderRadius: 14,
    height: 134,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 96,
  },
  coverFallback: { color: COLORS.subtle, fontSize: 16, fontWeight: '700' },
  cardTitle: {
    color: COLORS.ink,
    fontSize: 12,
    fontWeight: '700',
    height: 34,
    lineHeight: 17,
    marginTop: 8,
  },
  cardMeta: { color: COLORS.subtle, fontSize: 11, marginTop: 3 },
  pressed: { opacity: 0.62 },
});
