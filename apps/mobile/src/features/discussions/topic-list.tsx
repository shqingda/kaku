import { useMemo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/features/theme/theme-provider';

import type { DiscussionTopic } from './model';

type TopicListProps = {
  accessibilityLabelPrefix?: string;
  emptyText: string;
  footer?: ReactNode;
  onOpenTopic: (topic: DiscussionTopic) => void;
  topics: DiscussionTopic[];
};

export function TopicList({
  accessibilityLabelPrefix = '打开话题',
  emptyText,
  footer,
  onOpenTopic,
  topics,
}: TopicListProps) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.list}>
      {topics.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>{emptyText}</Text>
        </View>
      ) : null}
      {topics.map((topic, index) => {
        const latestReply = topic.replies.at(-1);
        const replyCount = topic.replyCount ?? topic.replies.length;

        return (
          <Pressable
            accessibilityLabel={`${accessibilityLabelPrefix}：${topic.title}`}
            accessibilityRole="button"
            key={topic.id}
            onPress={() => onOpenTopic(topic)}
            style={({ pressed }) => [
              styles.topicRow,
              index > 0 && styles.topicBorder,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.topicMain}>
              <View style={styles.titleLine}>
                {topic.episodeNumber ? (
                  <View style={styles.episodeBadge}>
                    <Text style={styles.episodeBadgeText}>EP.{topic.episodeNumber}</Text>
                  </View>
                ) : null}
                <Text numberOfLines={2} style={styles.topicTitle}>
                  {topic.title}
                </Text>
              </View>
              <Text numberOfLines={1} style={styles.topicPreview}>
                {latestReply?.body ??
                  (replyCount > 0 ? '点击读取最新回复' : '暂无回复')}
              </Text>
              <Text style={styles.topicMeta}>
                {topic.author} · {topic.createdAt}
              </Text>
            </View>
            <View style={styles.replyCount}>
              <Text style={styles.replyCountText}>{replyCount}</Text>
            </View>
          </Pressable>
        );
      })}
      {footer}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  list: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    overflow: 'hidden',
    paddingHorizontal: 18,
  },
  topicRow: { alignItems: 'center', flexDirection: 'row', paddingVertical: 16 },
  topicBorder: {
    borderTopColor: colors.track,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  pressed: { opacity: 0.56 },
  topicMain: { flex: 1, paddingRight: 14 },
  titleLine: { alignItems: 'center', flexDirection: 'row' },
  episodeBadge: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 7,
    marginRight: 7,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  episodeBadgeText: { color: colors.muted, fontSize: 10, fontWeight: '800' },
  topicTitle: {
    color: colors.ink,
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  topicPreview: { color: colors.muted, fontSize: 13, marginTop: 6 },
  topicMeta: { color: colors.subtle, fontSize: 12, marginTop: 8 },
  replyCount: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 13,
    justifyContent: 'center',
    minHeight: 26,
    minWidth: 32,
    paddingHorizontal: 8,
  },
  replyCountText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  emptyState: {
    alignItems: 'center',
    padding: 28,
  },
  emptyText: { color: colors.muted, fontSize: 14, lineHeight: 21 },
});
