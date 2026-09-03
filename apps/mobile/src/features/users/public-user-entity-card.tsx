import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/features/theme/theme-provider';

import type { PublicUserEntityCollection } from './model';

export function PublicUserEntityCard({
  entity,
  onPress,
}: {
  entity: PublicUserEntityCollection;
  onPress: () => void;
}) {
  const colors = useTheme();
  const styles = createStyles(colors);

  return (
    <Pressable
      accessibilityLabel={`打开${entity.kind === 'character' ? '角色' : '人物'}：${entity.name}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.portrait}>
        <Text style={styles.fallback}>{entity.name.slice(0, 1)}</Text>
        {entity.imageUrl ? (
          <Image
            contentFit="cover"
            contentPosition="top"
            recyclingKey={entity.imageUrl}
            source={entity.imageUrl}
            style={StyleSheet.absoluteFill}
            transition={120}
          />
        ) : null}
      </View>
      <Text maxFontSizeMultiplier={1.3} numberOfLines={2} style={styles.name}>
        {entity.name}
      </Text>
      <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={styles.subtitle}>
        {entity.subtitle}
      </Text>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    flex: 1,
    overflow: 'hidden',
    padding: 10,
  },
  portrait: {
    alignItems: 'center',
    aspectRatio: 112 / 154,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    justifyContent: 'center',
    overflow: 'hidden',
    width: '100%',
  },
  fallback: { color: colors.subtle, fontSize: 24, fontWeight: '800' },
  name: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 19,
    marginTop: 10,
    minHeight: 38,
  },
  subtitle: { color: colors.subtle, fontSize: 11, marginTop: 4 },
  pressed: { opacity: 0.62, transform: [{ scale: 0.985 }] },
});
