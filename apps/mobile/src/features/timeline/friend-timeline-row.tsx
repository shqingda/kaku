import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/design';
import { formatActivityTime } from '@/lib/format-activity-time';
import type { FriendTimelineItem } from './model';

export function FriendTimelineRow({
  hasDivider = false,
  item,
}: {
  hasDivider?: boolean;
  item: FriendTimelineItem;
}) {
  return (
    <Pressable
      accessibilityLabel={`${item.user.nickname}：${item.text}`}
      accessibilityRole={item.subjectId ? 'button' : undefined}
      onPress={() =>
        item.subjectId
          ? router.push({
              pathname: '/subject/[id]',
              params: { id: String(item.subjectId) },
            })
          : undefined
      }
      style={({ pressed }) => [
        styles.row,
        hasDivider && styles.divider,
        pressed && styles.pressed,
      ]}
    >
      <Pressable
        accessibilityLabel={`打开${item.user.nickname}的公开主页`}
        accessibilityRole="button"
        hitSlop={6}
        onPress={(event) => {
          event.stopPropagation();
          router.push({
            pathname: '/user/[username]',
            params: { username: item.user.username },
          });
        }}
        style={styles.avatar}
      >
        <Text style={styles.avatarFallback}>
          {item.user.nickname.slice(0, 1)}
        </Text>
        {item.user.avatarUrl ? (
          <Image
            contentFit="cover"
            source={item.user.avatarUrl}
            style={StyleSheet.absoluteFill}
            transition={100}
          />
        ) : null}
      </Pressable>
      <View style={styles.copy}>
        <View style={styles.metaRow}>
          <Text numberOfLines={1} style={styles.nickname}>
            {item.user.nickname}
          </Text>
          <Text style={styles.time}>{formatActivityTime(item.createdAt)}</Text>
        </View>
        <Text style={styles.text}>{item.text}</Text>
        {item.replies > 0 ? (
          <Text style={styles.replies}>{item.replies} 回复</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    paddingVertical: 15,
  },
  divider: {
    borderTopColor: COLORS.track,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: COLORS.track,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 36,
  },
  avatarFallback: { color: COLORS.muted, fontSize: 13, fontWeight: '700' },
  copy: { flex: 1, marginLeft: 12 },
  metaRow: { alignItems: 'baseline', flexDirection: 'row', gap: 8 },
  nickname: { color: COLORS.ink, flexShrink: 1, fontSize: 13, fontWeight: '700' },
  time: { color: COLORS.subtle, fontSize: 10 },
  text: { color: COLORS.ink, fontSize: 14, lineHeight: 21, marginTop: 5 },
  replies: { color: COLORS.muted, fontSize: 11, marginTop: 7 },
  pressed: { opacity: 0.62 },
});
