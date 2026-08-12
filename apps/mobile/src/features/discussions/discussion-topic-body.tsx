import { StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/design';

export function DiscussionTopicBody({ body }: { body?: string }) {
  if (!body) return null;

  return (
    <View style={styles.card}>
      <Text selectable style={styles.body}>
        {body}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    marginBottom: 14,
    padding: 20,
  },
  body: {
    color: COLORS.ink,
    fontSize: 15,
    lineHeight: 24,
  },
});
