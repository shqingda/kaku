import { useState } from 'react';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { FullscreenImageViewer } from '@/features/shared/fullscreen-image-viewer';
import { useTheme } from '@/features/theme/theme-provider';

export function SubjectHero({
  coverUrl,
  title,
  year,
}: {
  coverUrl?: string;
  title: string;
  year?: number;
}) {
  const colors = useTheme();
  const styles = createStyles(colors);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);

  return (
    <>
      <View style={styles.hero}>
        <Pressable
          accessibilityLabel="全屏查看封面"
          accessibilityRole="button"
          disabled={!coverUrl}
          onPress={() => setIsPreviewVisible(true)}
          style={({ pressed }) => [
            styles.coverFrame,
            pressed && styles.pressed,
          ]}
        >
          <View pointerEvents="none">
            <Link.AppleZoomTarget>
              <View style={styles.cover}>
                <Text style={styles.coverFallback}>{title.slice(0, 1)}</Text>
                {coverUrl ? (
                  <Image
                    contentFit="cover"
                    source={coverUrl}
                    style={StyleSheet.absoluteFill}
                    transition={180}
                  />
                ) : null}
              </View>
            </Link.AppleZoomTarget>
          </View>
        </Pressable>
        <Text style={styles.year}>{year}</Text>
        <Text selectable style={styles.title}>
          {title}
        </Text>
      </View>

      <FullscreenImageViewer
        onClose={() => setIsPreviewVisible(false)}
        title={title}
        url={coverUrl}
        visible={isPreviewVisible}
      />
    </>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  hero: { alignItems: 'center', paddingTop: 8 },
  coverFrame: { borderCurve: 'continuous', borderRadius: 24 },
  cover: {
    alignItems: 'center',
    backgroundColor: colors.track,
    borderCurve: 'continuous',
    borderRadius: 24,
    height: 238,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 170,
  },
  pressed: { opacity: 0.78 },
  coverFallback: { color: colors.subtle, fontSize: 30, fontWeight: '700' },
  year: { color: colors.accent, fontSize: 13, fontWeight: '700', marginTop: 22 },
  title: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.7,
    marginTop: 7,
    textAlign: 'center',
  },
});
