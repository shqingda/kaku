import { memo } from 'react';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/design';

import type { DiscussionReply } from './model';

type ReplyListItemProps = {
  floor: number;
  isHighlighted?: boolean;
  onDelete?: (reply: DiscussionReply) => void;
  onEdit?: (reply: DiscussionReply) => void;
  onOpenReference: (replyId: string) => void;
  onReply?: (reply: DiscussionReply) => void;
  onReport?: (reply: DiscussionReply) => void;
  reply: DiscussionReply;
};

export const ReplyListItem = memo(function ReplyListItem({
  floor,
  isHighlighted,
  onDelete,
  onEdit,
  onOpenReference,
  onReply,
  onReport,
  reply,
}: ReplyListItemProps) {
  return (
    <View style={[styles.card, isHighlighted && styles.highlightedCard]}>
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
              hitSlop={8}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {reply.author.slice(0, 1)}
                </Text>
                {reply.authorAvatarUrl ? (
                  <Image
                    contentFit="cover"
                    source={reply.authorAvatarUrl}
                    style={StyleSheet.absoluteFill}
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
                hitSlop={8}
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
            hitSlop={8}
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
              tintColor={COLORS.muted}
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
      <Text style={styles.body}>{reply.body}</Text>
      {onEdit || onDelete || onReport ? (
        <View style={styles.actions}>
          {onEdit ? (
            <Pressable
              accessibilityLabel="编辑自己的回复"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => onEdit(reply)}
              style={({ pressed }) => [
                styles.actionButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.editAction}>编辑</Text>
            </Pressable>
          ) : null}
          {onDelete ? (
            <Pressable
              accessibilityLabel={`删除自己的回复`}
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => onDelete(reply)}
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
              hitSlop={8}
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

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderColor: 'transparent',
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 10,
    padding: 17,
  },
  highlightedCard: {
    backgroundColor: COLORS.accentSoft,
    borderColor: COLORS.accent,
  },
  header: { alignItems: 'center', flexDirection: 'row' },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#EFEEE9',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  avatarText: { color: COLORS.muted, fontSize: 14, fontWeight: '700' },
  identity: { flex: 1, marginLeft: 10 },
  author: { color: COLORS.ink, fontSize: 14, fontWeight: '700' },
  time: { color: COLORS.subtle, fontSize: 11, marginTop: 3 },
  floor: { color: COLORS.subtle, fontSize: 12 },
  replyReference: {
    backgroundColor: '#F5F4F0',
    borderLeftColor: COLORS.accent,
    borderLeftWidth: 3,
    borderRadius: 8,
    marginTop: 13,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  pressedReference: { opacity: 0.62 },
  replyReferenceAuthor: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  replyReferenceBody: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  body: { color: COLORS.ink, fontSize: 15, lineHeight: 24, marginTop: 10 },
  replyIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    minHeight: 28,
    minWidth: 28,
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 12,
    minHeight: 32,
  },
  editAction: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  deleteAction: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 32,
    paddingHorizontal: 12,
  },
  pressed: { opacity: 0.62 },
});
