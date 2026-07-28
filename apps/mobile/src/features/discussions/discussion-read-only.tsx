import { StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/design';

export function DiscussionReadOnlyNotice() {
  return (
    <View style={styles.notice}>
      <Text style={styles.noticeTitle}>当前为只读模式</Text>
      <Text style={styles.noticeText}>登录功能接通后可参与回复。</Text>
    </View>
  );
}

export function EmptyDiscussionReplies({
  text = 'Bangumi 暂无公开回复。',
}: {
  text?: string;
}) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>还没有回复</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    alignItems: 'center',
    backgroundColor: '#EFEEE9',
    borderRadius: 16,
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  noticeTitle: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  noticeText: {
    color: COLORS.subtle,
    fontSize: 12,
    marginTop: 4,
  },
  empty: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    marginBottom: 10,
    padding: 28,
  },
  emptyTitle: { color: COLORS.ink, fontSize: 16, fontWeight: '700' },
  emptyText: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
    textAlign: 'center',
  },
});
