import { useMemo } from 'react';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import type { StyleProp, TextStyle } from 'react-native';

import {
  containsBangumiEmoji,
  getBangumiEmojiUrl,
  parseBangumiEmoji,
} from '@/lib/bangumi-emoji';

// 内联渲染 Bangumi 表情包（(bgmNN) 与 ASCII 颜文字）：把文本按表情切分，
// 表情以与文字等高的小图渲染，其余走原生 Text 换行。无表情时退化为纯 Text。
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
    <View style={styles.row}>
      {segments.map((segment, index) =>
        segment.type === 'emoji' ? (
          <Image
            key={index}
            contentFit="contain"
            source={{ uri: getBangumiEmojiUrl(segment.value) ?? undefined }}
            style={{ height: emojiSize, marginHorizontal: 1, width: emojiSize }}
          />
        ) : segment.value ? (
          <Text key={index} style={style}>
            {segment.value}
          </Text>
        ) : null,
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
