import { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, TextStyle } from 'react-native';

import {
  containsBangumiEmoji,
  getBangumiEmojiUrl,
  parseBangumiEmoji,
} from '@/lib/bangumi-emoji';
import type { BangumiContentBlock } from '@/lib/bangumi-content';
import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/features/theme/theme-provider';

// 内联渲染 Bangumi 表情包（(bgmNN) 与 ASCII 颜文字）：表情以原生 Image 内嵌在
// Text 里，随文字基线对齐、正常换行。无表情时退化为纯 Text。
export function BangumiText({
  children,
  style,
}: {
  children: string;
  style?: StyleProp<TextStyle>;
}) {
  const flattened = StyleSheet.flatten(style);
  const fontSize = flattened?.fontSize ?? 14;
  const lineHeight = flattened?.lineHeight ?? Math.round(fontSize * 1.4);
  const emojiSize = Math.round(lineHeight * 0.86);

  const segments = useMemo(() => parseBangumiEmoji(children), [children]);

  if (!containsBangumiEmoji(children)) {
    return <Text style={style}>{children}</Text>;
  }

  return (
    <Text style={style}>
      {segments.map((segment, index) =>
        segment.type === 'emoji' ? (
          <Image
            key={index}
            resizeMode="contain"
            source={{ uri: getBangumiEmojiUrl(segment.value) ?? undefined }}
            style={{ height: emojiSize, width: emojiSize }}
          />
        ) : (
          segment.value
        ),
      )}
    </Text>
  );
}

// 渲染回复正文：普通文本走 BangumiText，[quote] 引用块渲染成块引用样式
// （左侧竖线 + 弱化颜色），不破坏正文排版。
export function BangumiContentText({
  blocks,
  style,
}: {
  blocks: BangumiContentBlock[];
  style?: StyleProp<TextStyle>;
}) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (blocks.length === 0) {
    return null;
  }

  const hasQuote = blocks.some((block) => block.type === 'quote');
  if (!hasQuote) {
    return (
      <BangumiText style={style}>
        {blocks.map((block) => block.value).join('')}
      </BangumiText>
    );
  }

  const flattened = StyleSheet.flatten(style);
  const containerStyle = flattened?.marginTop
    ? { marginTop: flattened.marginTop }
    : undefined;
  const textStyle = flattened ? { ...flattened, marginTop: 0 } : undefined;

  return (
    <View style={containerStyle}>
      {blocks.map((block, index) =>
        block.type === 'quote' ? (
          <View key={index} style={styles.quote}>
            <BangumiText style={styles.quoteText}>{block.value}</BangumiText>
          </View>
        ) : (
          <BangumiText key={index} style={textStyle}>
            {block.value}
          </BangumiText>
        ),
      )}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    quote: {
      borderLeftColor: colors.divider,
      borderLeftWidth: 3,
      marginVertical: 4,
      paddingLeft: 10,
    },
    quoteText: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  });
}
