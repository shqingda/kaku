import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/design';

type DiscussionStatusProps = {
  errorText?: string;
  isError: boolean;
  isPending: boolean;
  loadingText?: string;
  onRetry: () => void;
};

export function DiscussionStatus({
  errorText = '讨论加载失败，请检查网络后重试。',
  isError,
  isPending,
  loadingText = '正在读取 Bangumi 讨论…',
  onRetry,
}: DiscussionStatusProps) {
  if (!isError && !isPending) {
    return null;
  }

  return (
    <View style={[styles.box, isError && styles.errorBox]}>
      <Text style={styles.text}>
        {isError ? errorText : loadingText}
      </Text>
      {isError ? (
        <Pressable onPress={onRetry}>
          <Text style={styles.retry}>重试</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    padding: 14,
  },
  errorBox: { backgroundColor: COLORS.accentSoft },
  text: { color: COLORS.muted, flex: 1, fontSize: 13 },
  retry: { color: COLORS.accent, fontSize: 13, fontWeight: '700', marginLeft: 12 },
});
