import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { BangumiText } from '@/features/shared/bangumi-text';
import { useTheme } from '@/features/theme/theme-provider';
import { containsBangumiEmoji } from '@/lib/bangumi-emoji';

// 原生 TextInput 无法真正内嵌图片，所以在这里提供一个贴近输入框的实时渲染
// 预览：插入 (bgmNN) 后能立刻看到官方表情，而不是只看到纯文本。
export function BangumiComposerPreview({ content }: { content: string }) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!containsBangumiEmoji(content)) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>渲染预览</Text>
      <BangumiText style={styles.body}>{content}</BangumiText>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.surfaceSoft,
      borderRadius: 12,
      marginBottom: 6,
      marginTop: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    label: {
      color: colors.subtle,
      fontSize: 11,
      fontWeight: '600',
      marginBottom: 6,
    },
    body: {
      color: colors.ink,
      fontSize: 15,
      lineHeight: 22,
    },
  });
