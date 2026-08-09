import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/design';

import type { PublicUserEntityCollection } from './model';

export function PublicUserEntityCard({
  entity,
  onPress,
}: {
  entity: PublicUserEntityCollection;
  onPress: () => void;
}) {
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
            contentFit="contain"
            contentPosition="top"
            source={entity.imageUrl}
            style={StyleSheet.absoluteFill}
            transition={120}
          />
        ) : null}
      </View>
      <Text numberOfLines={2} style={styles.name}>
        {entity.name}
      </Text>
      <Text numberOfLines={1} style={styles.subtitle}>
        {entity.subtitle}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    flex: 1,
    overflow: 'hidden',
    padding: 10,
  },
  portrait: {
    alignItems: 'center',
    aspectRatio: 0.76,
    backgroundColor: COLORS.track,
    borderRadius: 14,
    justifyContent: 'center',
    overflow: 'hidden',
    width: '100%',
  },
  fallback: { color: COLORS.subtle, fontSize: 24, fontWeight: '800' },
  name: {
    color: COLORS.ink,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 19,
    marginTop: 10,
    minHeight: 38,
  },
  subtitle: { color: COLORS.subtle, fontSize: 11, marginTop: 4 },
  pressed: { opacity: 0.62, transform: [{ scale: 0.985 }] },
});
