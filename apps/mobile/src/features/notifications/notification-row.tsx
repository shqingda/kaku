import { useMemo } from 'react';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { formatActivityTime } from '@/lib/format-activity-time';
import type { NotificationTarget, UserNotification } from './model';

function openTarget(target: NotificationTarget | undefined) {
  if (!target) return;

  if (target.kind === 'group-topic') {
    router.push({
      pathname: '/group/topic/[id]',
      params: {
        id: String(target.id),
        ...(target.replyId
          ? { replyId: String(target.replyId) }
          : {}),
      },
    });
    return;
  }

  if (target.kind === 'subject-topic') {
    router.push({
      pathname: '/subject/[id]/topic/[topicId]',
      params: {
        id: '0',
        topicId: String(target.id),
        ...(target.replyId
          ? { replyId: String(target.replyId) }
          : {}),
      },
    });
    return;
  }

  router.push({
    pathname: '/user/[username]',
    params: { username: target.username },
  });
}

export function NotificationRow({
  colors,
  hasDivider,
  item,
  onRead,
}: {
  colors: ThemeColors;
  hasDivider: boolean;
  item: UserNotification;
  onRead: (id: number) => void;
}) {
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable
      accessibilityLabel={`${item.unread ? '未读，' : ''}${item.sender.nickname}${item.action}：${item.title}`}
      accessibilityHint={item.unread ? '未读，打开后标记为已读。' : '打开相关内容'}
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
            recyclingKey={item.sender.avatarUrl}
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

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  row: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    paddingVertical: 16,
  },
  divider: {
    borderTopColor: colors.track,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.track,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 40,
  },
  avatarFallback: { color: colors.muted, fontSize: 14, fontWeight: '700' },
  copy: { flex: 1, marginLeft: 13 },
  heading: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  sender: { color: colors.ink, flexShrink: 1, fontSize: 14, fontWeight: '700' },
  time: { color: colors.subtle, fontSize: 11 },
  unreadDot: {
    backgroundColor: colors.accent,
    borderRadius: 4,
    height: 7,
    marginLeft: 'auto',
    width: 7,
  },
  action: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  title: { color: colors.ink, fontSize: 14, fontWeight: '600', lineHeight: 21, marginTop: 4 },
  pressed: { opacity: 0.62 },
});
