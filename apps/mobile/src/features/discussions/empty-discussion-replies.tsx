import { StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/design';

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
