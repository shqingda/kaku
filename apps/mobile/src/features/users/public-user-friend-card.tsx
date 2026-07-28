import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/design';
import type { PublicUserFriend } from './model';

export function PublicUserFriendCard({
  compact = false,
  friend,
  onPress,
}: {
  compact?: boolean;
  friend: PublicUserFriend;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={`打开用户：${friend.nickname}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        compact && styles.compactCard,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.avatar}>
        <Text style={styles.fallback}>{friend.nickname.slice(0, 1)}</Text>
        {friend.avatarUrl ? (
          <Image
            contentFit="cover"
            source={friend.avatarUrl}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
      </View>
      <Text numberOfLines={1} style={styles.nickname}>
        {friend.nickname}
      </Text>
      {!compact ? (
        <Text numberOfLines={1} style={styles.username}>
          @{friend.username}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 11,
    width: 104,
  },
  compactCard: { width: 92 },
  avatar: {
    alignItems: 'center',
    backgroundColor: COLORS.track,
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 48,
  },
  fallback: { color: COLORS.subtle, fontSize: 15, fontWeight: '800' },
  nickname: {
    color: COLORS.ink,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
    maxWidth: 82,
  },
  username: {
    color: COLORS.subtle,
    fontSize: 10,
    marginTop: 3,
    maxWidth: 82,
  },
  pressed: { opacity: 0.62 },
});
