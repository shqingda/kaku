import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/design';

export function SubjectHero({
  coverUrl,
  title,
  year,
}: {
  coverUrl?: string;
  title: string;
  year?: number;
}) {
  return (
    <View style={styles.hero}>
      <View pointerEvents="none">
        <Link.AppleZoomTarget>
          <View style={styles.cover}>
            <Text style={styles.coverFallback}>{title.slice(0, 1)}</Text>
            <Image
              contentFit="cover"
              source={coverUrl}
              style={StyleSheet.absoluteFill}
              transition={180}
            />
          </View>
        </Link.AppleZoomTarget>
      </View>
      <Text style={styles.year}>{year}</Text>
      <Text selectable style={styles.title}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingTop: 8 },
  cover: {
    alignItems: 'center',
    backgroundColor: COLORS.track,
    borderRadius: 24,
    height: 238,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 170,
  },
  coverFallback: { color: COLORS.subtle, fontSize: 30, fontWeight: '700' },
  year: { color: COLORS.accent, fontSize: 13, fontWeight: '700', marginTop: 22 },
  title: {
    color: COLORS.ink,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.7,
    marginTop: 7,
    textAlign: 'center',
  },
});
