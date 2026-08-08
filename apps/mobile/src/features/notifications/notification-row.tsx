import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/design';
import { formatActivityTime } from '@/lib/format-activity-time';
import type { NotificationTarget, UserNotification } from './model';

function openTarget(target: NotificationTarget | undefined) {
  if (!target) return;

  if (target.kind === 'group-topic') {
    router.push({
      pathname: '/group/topic/[id]',
      params: { id: String(target.id) },
    });
    return;
  }

  if (target.kind === 'subject-topic') {
    router.push({
      pathname: '/subject/[id]/topic/[topicId]',
      params: { id: '0', topicId: String(target.id) },
    });
    return;
  }

  router.push({
    pathname: '/user/[username]',
    params: { username: target.username },
  });
}

export function NotificationRow({
  hasDivider,
  item,
  onRead,
}: {
  hasDivider: boolean;
  item: UserNotification;
  onRead: (id: number) => void;
}) {
  return (
    <Pressable
      accessibilityLabel={`${item.sender.nickname}${item.action}：${item.title}`}
      accessibilityRole="button"
      onPress={() => {
        if (item.unread) onRead(item.id);
        openTarget(item.target);
      }}
      style={({ pressed }) => [
        styles.row,
        hasDivider && styles.divider,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarFallback}>
          {item.sender.nickname.slice(0, 1)}
        </Text>
        {item.sender.avatarUrl ? (
          <Image
            contentFit="cover"
            source={item.sender.avatarUrl}
            style={StyleSheet.absoluteFill}
            transition={100}
          />
        ) : null}
      </View>
      <View style={styles.copy}>
        <View style={styles.heading}>
          <Text numberOfLines={1} style={styles.sender}>
            {item.sender.nickname}
          </Text>
          <Text style={styles.time}>{formatActivityTime(item.createdAt)}</Text>
          {item.unread ? <View style={styles.unreadDot} /> : null}
        </View>
        <Text style={styles.action}>{item.action}</Text>
        {item.title ? (
          <Text numberOfLines={2} style={styles.title}>
            {item.title}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    paddingVertical: 16,
  },
  divider: {
    borderTopColor: COLORS.track,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: COLORS.track,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 40,
  },
  avatarFallback: { color: COLORS.muted, fontSize: 14, fontWeight: '700' },
  copy: { flex: 1, marginLeft: 13 },
  heading: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  sender: { color: COLORS.ink, flexShrink: 1, fontSize: 14, fontWeight: '700' },
  time: { color: COLORS.subtle, fontSize: 11 },
  unreadDot: {
    backgroundColor: COLORS.accent,
    borderRadius: 4,
    height: 7,
    marginLeft: 'auto',
    width: 7,
  },
  action: { color: COLORS.muted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  title: { color: COLORS.ink, fontSize: 14, fontWeight: '600', lineHeight: 21, marginTop: 4 },
  pressed: { opacity: 0.62 },
});
