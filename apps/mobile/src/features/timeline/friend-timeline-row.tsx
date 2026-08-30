import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Fragment, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { BangumiText } from '@/features/shared/bangumi-text';
import { useTheme } from '@/features/theme/theme-provider';
import { formatActivityTime } from '@/lib/format-activity-time';
import type { FriendTimelineItem } from './model';

export function FriendTimelineRow({
  hasDivider = false,
  item,
}: {
  hasDivider?: boolean;
  item: FriendTimelineItem;
}) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  // 条目动态进条目页；日志动态与日志标题一样，直接进日志详情页。
  const destination = item.subjectId
    ? {
        pathname: '/subject/[id]' as const,
        params: { id: String(item.subjectId) },
      }
    : item.blogId
      ? {
          pathname: '/blog/[id]' as const,
          params: { id: String(item.blogId) },
        }
      : undefined;

  return (
    <Pressable
      accessibilityLabel={`${item.user.nickname}：${item.text}`}
      accessibilityRole={destination ? 'button' : undefined}
      accessibilityHint={
        destination
          ? item.subjectId
            ? '进入相关条目详情'
            : '进入日志详情'
          : undefined
      }
      onPress={() =>
        destination ? router.push(destination) : undefined
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
        style={({ pressed }) => [
          styles.avatar,
          pressed && styles.pressedAvatar,
        ]}
      >
        <Text style={styles.avatarFallback}>
          {item.user.nickname.slice(0, 1)}
        </Text>
        {item.user.avatarUrl ? (
          <Image
            contentFit="cover"
            recyclingKey={item.user.avatarUrl}
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
        {item.userMentions?.length ? (
          <Text style={styles.text}>
            {item.leadingText}
            {item.userMentions.map((mention, index) => (
              <Fragment key={mention.username}>
                {index > 0 ? '、' : null}
                <Text
                  onPress={() =>
                    router.push({
                      pathname: '/user/[username]',
                      params: { username: mention.username },
                    })
                  }
                  style={styles.userMention}
                >
                  {mention.nickname}
                </Text>
              </Fragment>
            ))}
            {item.trailingText}
          </Text>
        ) : item.blogId && item.blogTitle ? (
          <Text style={styles.text}>
            {item.leadingText}
            <Text
              onPress={() =>
                router.push({
                  pathname: '/blog/[id]',
                  params: { id: String(item.blogId) },
                })
              }
              style={styles.blogTitle}
            >
              《{item.blogTitle}》
            </Text>
            {item.trailingText}
          </Text>
        ) : item.subjectTitle || item.entityTitle ? (
          <Text style={styles.text}>
            {item.leadingText}
            {item.subjectTitle ? (
              <Text style={styles.subjectTitle}>《{item.subjectTitle}》</Text>
            ) : (
              <Text
                onPress={() =>
                  router.push({
                    pathname:
                      item.entityKind === 'person'
                        ? '/person/[id]'
                        : '/character/[id]',
                    params: { id: String(item.entityId) },
                  })
                }
                style={styles.entityTitle}
              >
                {item.entityTitle}
              </Text>
            )}
            {item.trailingText}
          </Text>
        ) : (
          <BangumiText style={styles.text}>{item.text}</BangumiText>
        )}
        {item.replies > 0 ? (
          <Text style={styles.replies}>{item.replies} 回复</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  row: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    paddingVertical: 15,
  },
  divider: {
    borderTopColor: colors.divider,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.track,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 36,
  },
  pressedAvatar: { opacity: 0.62 },
  avatarFallback: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  copy: { flex: 1, marginLeft: 12 },
  metaRow: { alignItems: 'baseline', flexDirection: 'row', gap: 8 },
  nickname: { color: colors.ink, flexShrink: 1, fontSize: 13, fontWeight: '700' },
  time: { color: colors.subtle, fontSize: 11 },
  text: { color: colors.ink, fontSize: 14, lineHeight: 21, marginTop: 5 },
  blogTitle: { color: colors.accentRich, fontWeight: '700' },
  subjectTitle: { color: colors.accentRich, fontWeight: '700' },
  entityTitle: { color: colors.accentRich, fontWeight: '700' },
  userMention: { color: colors.accentRich, fontWeight: '700' },
  replies: { color: colors.muted, fontSize: 11, marginTop: 7 },
  pressed: { opacity: 0.62 },
});
