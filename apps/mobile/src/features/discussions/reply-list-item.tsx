import { HIT_SLOP, MIN_TOUCH_SIZE, SPACING, TYPE } from '@/constants/design';
import { memo } from 'react';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { BangumiContentText } from '@/features/shared/bangumi-text';
import { useTheme } from '@/features/theme/theme-provider';

import type { DiscussionReply } from './model';

type ReplyListItemProps = {
  embedded?: boolean;
  floor: number;
  hasDivider?: boolean;
  isHighlighted?: boolean;
  onDelete?: (reply: DiscussionReply) => void;
  onEdit?: (reply: DiscussionReply) => void;
  onOpenReference: (replyId: string) => void;
  onReply?: (reply: DiscussionReply) => void;
  onReport?: (reply: DiscussionReply) => void;
  ownerUsername?: string;
  reply: DiscussionReply;
};

export const ReplyListItem = memo(function ReplyListItem({
  embedded = false,
  floor,
  hasDivider = false,
  isHighlighted,
  onDelete,
  onEdit,
  onOpenReference,
  onReply,
  onReport,
  ownerUsername,
  reply,
}: ReplyListItemProps) {
  const colors = useTheme();
  const styles = createStyles(colors);
  const isOwner =
    !ownerUsername || reply.authorUsername === ownerUsername;
  const editReply = isOwner ? onEdit : undefined;
  const deleteReply = isOwner ? onDelete : undefined;

  return (
    <View
      style={[
        embedded ? styles.embeddedRow : styles.card,
        embedded && hasDivider && styles.embeddedDivider,
        !embedded && isHighlighted && styles.highlightedCard,
      ]}
    >
      <View style={styles.header}>
        {reply.authorUsername ? (
          <Link
            asChild
            href={{
              pathname: '/user/[username]',
              params: { username: reply.authorUsername },
            }}
          >
            <Pressable
              accessibilityLabel={`打开 ${reply.author} 的公开主页`}
              accessibilityRole="button"
              hitSlop={HIT_SLOP}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {reply.author.slice(0, 1)}
                </Text>
                {reply.authorAvatarUrl ? (
                  <Image
                    contentFit="cover"
                    recyclingKey={reply.authorAvatarUrl}
                    source={reply.authorAvatarUrl}
                    style={StyleSheet.absoluteFill}
                    transition={120}
                  />
                ) : null}
              </View>
            </Pressable>
          </Link>
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{reply.author.slice(0, 1)}</Text>
          </View>
        )}
        <View style={styles.identity}>
          {reply.authorUsername ? (
            <Link
              asChild
              href={{
                pathname: '/user/[username]',
                params: { username: reply.authorUsername },
              }}
            >
              <Pressable
                accessibilityLabel={`打开 ${reply.author} 的公开主页`}
                accessibilityRole="button"
                hitSlop={HIT_SLOP}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <Text style={styles.author}>{reply.author}</Text>
              </Pressable>
            </Link>
          ) : (
            <Text style={styles.author}>{reply.author}</Text>
          )}
          <Text style={styles.time}>{reply.createdAt}</Text>
        </View>
        {onReply ? (
          <Pressable
            accessibilityLabel={`回复 ${reply.author}`}
            accessibilityRole="button"
            hitSlop={HIT_SLOP}
            onPress={() => onReply(reply)}
            style={({ pressed }) => [
              styles.replyIcon,
              pressed && styles.pressed,
            ]}
          >
            <SymbolView
              name={{
                android: 'reply',
                ios: 'arrowshape.turn.up.left',
                web: 'reply',
              }}
              size={13}
              tintColor={colors.muted}
              weight="semibold"
            />
          </Pressable>
        ) : null}
        <Text style={styles.floor}>#{floor}</Text>
      </View>
      {reply.replyTo ? (
        <Pressable
          accessibilityLabel={`查看 ${reply.replyTo.author} 的原回复`}
          accessibilityRole="button"
          onPress={() => onOpenReference(reply.replyTo!.replyId)}
          style={({ pressed }) => [
            styles.replyReference,
            pressed && styles.pressedReference,
          ]}
        >
          <Text style={styles.replyReferenceAuthor}>
            回复 @{reply.replyTo.author}
          </Text>
          <Text numberOfLines={2} style={styles.replyReferenceBody}>
            {reply.replyTo.body || '原回复暂不可见'}
          </Text>
        </Pressable>
      ) : null}
      <BangumiContentText
        blocks={
          reply.segments ?? [{ type: 'text', value: reply.body ?? '' }]
        }
        style={styles.body}
      />
      {editReply || deleteReply || onReport ? (
        <View style={styles.actions}>
          {editReply ? (
            <Pressable
              accessibilityLabel="编辑自己的回复"
              accessibilityRole="button"
              hitSlop={HIT_SLOP}
              onPress={() => editReply(reply)}
              style={({ pressed }) => [
                styles.actionButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.editAction}>编辑</Text>
            </Pressable>
          ) : null}
          {deleteReply ? (
            <Pressable
              accessibilityLabel={`删除自己的回复`}
              accessibilityRole="button"
              hitSlop={HIT_SLOP}
              onPress={() => deleteReply(reply)}
              style={({ pressed }) => [
                styles.actionButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.deleteAction}>删除</Text>
            </Pressable>
          ) : null}
          {onReport ? (
            <Pressable
              accessibilityLabel={`举报 ${reply.author} 的回复`}
              accessibilityRole="button"
              hitSlop={HIT_SLOP}
              onPress={() => onReport(reply)}
              style={({ pressed }) => [
                styles.actionButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.editAction}>举报</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
});

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: 'transparent',
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: SPACING.md,
    padding: SPACING.lg,
  },
  highlightedCard: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  embeddedRow: { paddingVertical: SPACING.lg },
  embeddedDivider: {
    borderTopColor: colors.divider,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  header: { alignItems: 'center', flexDirection: 'row' },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  avatarText: { color: colors.muted, fontSize: TYPE.body.fontSize, fontWeight: '700' },
  identity: { flex: 1, marginLeft: SPACING.md },
  author: { color: colors.ink, fontSize: TYPE.body.fontSize, fontWeight: '700' },
  time: { color: colors.subtle, fontSize: TYPE.micro.fontSize, marginTop: SPACING.xs },
  floor: { color: colors.subtle, fontSize: TYPE.caption.fontSize },
  replyReference: {
    backgroundColor: colors.surfaceSoft,
    borderLeftColor: colors.accent,
    borderLeftWidth: 3,
    borderRadius: 8,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  pressedReference: { opacity: 0.62 },
  replyReferenceAuthor: {
    color: colors.accent,
    fontSize: TYPE.caption.fontSize,
    fontWeight: '700',
  },
  replyReferenceBody: {
    color: colors.muted,
    fontSize: TYPE.caption.fontSize,
    lineHeight: TYPE.caption.lineHeight,
    marginTop: SPACING.xs,
  },
  body: { color: colors.ink, fontSize: TYPE.body.fontSize, lineHeight: TYPE.body.lineHeight, marginTop: SPACING.md },
  replyIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.md,
    minHeight: MIN_TOUCH_SIZE,
    minWidth: MIN_TOUCH_SIZE,
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SPACING.md,
    minHeight: MIN_TOUCH_SIZE,
  },
  editAction: {
    color: colors.muted,
    fontSize: TYPE.caption.fontSize,
    fontWeight: '700',
  },
  deleteAction: {
    color: colors.accent,
    fontSize: TYPE.caption.fontSize,
    fontWeight: '700',
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MIN_TOUCH_SIZE,
    paddingHorizontal: SPACING.md,
  },
  pressed: { opacity: 0.62 },
});
