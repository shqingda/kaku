import { memo } from 'react';
import { Image } from 'expo-image';
import { type Href, Link } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SPACING, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { getSubjectTypeLabel } from '@/features/catalog/subject-types';
import { useTheme } from '@/features/theme/theme-provider';
import type { PublicIndexItem } from './model';

// 目录条目行：按条目类型生成深链，可点击的条目用 AppleZoom 包住封面。
export const PublicIndexItemRow = memo(function PublicIndexItemRow({
  item,
}: {
  item: PublicIndexItem;
}) {
  const colors = useTheme();
  const styles = createStyles(colors);
  const href = getIndexItemHref(item);
  const cover = (
    <View style={styles.cover}>
      <Text style={styles.coverFallback}>
        {item.title.slice(0, 1)}
      </Text>
      {item.coverUrl ? (
        <Image
          contentFit="cover"
          recyclingKey={item.coverUrl}
          source={item.coverUrl}
          style={StyleSheet.absoluteFill}
          transition={120}
        />
      ) : null}
    </View>
  );
  const row = (
    <Pressable
      accessibilityHint={href ? '进入详情' : undefined}
      accessibilityLabel={`打开${item.title}`}
      accessibilityRole={href ? 'button' : undefined}
      style={styles.subjectRow}
    >
      {href ? <Link.AppleZoom>{cover}</Link.AppleZoom> : cover}
      <View style={styles.subjectMain}>
        <Text maxFontSizeMultiplier={1.3} numberOfLines={2} style={styles.subjectTitle}>
          {item.title}
        </Text>
        <Text maxFontSizeMultiplier={1.3} numberOfLines={2} style={styles.subjectMeta}>
          {getIndexItemLabel(item)}
          {item.kind === 'subject'
            ? ` · ${item.score ? `${item.score.toFixed(1)} 分` : '暂无评分'}`
            : ''}
          {item.comment ? ` · ${item.comment}` : ''}
        </Text>
      </View>
      <SymbolView
        name={{
          android: 'chevron_right',
          ios: 'chevron.right',
          web: 'chevron_right',
        }}
        size={14}
        tintColor={colors.subtle}
        weight="semibold"
      />
    </Pressable>
  );

  return href ? <Link asChild href={href}>{row}</Link> : row;
});

function getIndexItemLabel(item: PublicIndexItem) {
  if (item.kind === 'subject' && item.type) {
    return getSubjectTypeLabel(item.type);
  }
  return {
    blog: '日志',
    character: '角色',
    episode: '章节',
    groupTopic: '小组话题',
    person: '人物',
    subject: '条目',
    subjectTopic: '条目话题',
  }[item.kind];
}

function getIndexItemHref(item: PublicIndexItem): Href | undefined {
  switch (item.kind) {
    case 'subject':
      return { pathname: '/subject/[id]', params: { id: String(item.id) } };
    case 'character':
      return { pathname: '/character/[id]', params: { id: String(item.id) } };
    case 'person':
      return { pathname: '/person/[id]', params: { id: String(item.id) } };
    case 'blog':
      return { pathname: '/blog/[id]', params: { id: String(item.id) } };
    case 'groupTopic':
      return {
        pathname: '/group/topic/[id]',
        params: { id: String(item.id) },
      };
    case 'episode':
      return item.parentId && item.episodeNumber
        ? {
            pathname: '/subject/[id]/episode/[episodeNumber]',
            params: {
              episodeNumber: String(item.episodeNumber),
              id: String(item.parentId),
            },
          }
        : undefined;
    case 'subjectTopic':
      return item.parentId
        ? {
            pathname: '/subject/[id]/topic/[topicId]',
            params: {
              id: String(item.parentId),
              topicId: String(item.id),
            },
          }
        : undefined;
  }
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  subjectRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 18,
    flexDirection: 'row',
    minHeight: 92,
    padding: SPACING.md,
  },
  cover: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 11,
    height: 72,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 51,
  },
  coverFallback: { color: colors.subtle, fontSize: TYPE.body.fontSize, fontWeight: '700' },
  subjectMain: { flex: 1, marginLeft: SPACING.md },
  subjectTitle: {
    color: colors.ink,
    fontSize: TYPE.body.fontSize,
    fontWeight: '700',
    lineHeight: TYPE.body.lineHeight,
  },
  subjectMeta: {
    color: colors.muted,
    fontSize: TYPE.caption.fontSize,
    lineHeight: TYPE.caption.lineHeight,
    marginTop: SPACING.sm,
  },
});
