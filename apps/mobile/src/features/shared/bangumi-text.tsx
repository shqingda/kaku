import { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, TextStyle } from 'react-native';

import {
  containsBangumiEmoji,
  getBangumiEmojiUrl,
  parseBangumiEmoji,
} from '@/lib/bangumi-emoji';
import { parseBangumiContent, type BangumiContentBlock } from '@/lib/bangumi-content';
import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/features/theme/theme-provider';

import { BangumiPostImage } from './bangumi-post-image';

// 内联渲染 Bangumi 表情包（(bgmNN) 与 ASCII 颜文字）：表情以原生 Image 内嵌在
// Text 里，随文字基线对齐、正常换行。无表情时退化为纯 Text。
function BangumiEmojiText({
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

// 富文本块渲染：文本（含表情）走 BangumiEmojiText，[quote] 渲染成块引用
// 样式（左侧竖线 + 弱化颜色），[img] 渲染为可全屏查看的图片。
function BangumiRichBody({
  blocks,
  style,
}: {
  blocks: BangumiContentBlock[];
  style?: StyleProp<TextStyle>;
}) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const flattened = StyleSheet.flatten(style);
  const containerStyle = flattened?.marginTop
    ? { marginTop: flattened.marginTop }
    : undefined;
  const textStyle = flattened ? { ...flattened, marginTop: 0 } : undefined;

  return (
    <View style={containerStyle}>
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'quote':
            return (
              <View key={index} style={styles.quote}>
                <BangumiEmojiText style={styles.quoteText}>
                  {block.value}
                </BangumiEmojiText>
              </View>
            );
          case 'image':
            return <BangumiPostImage key={index} uri={block.value} />;
          default:
            return (
              <BangumiEmojiText key={index} style={textStyle}>
                {block.value}
              </BangumiEmojiText>
            );
        }
      })}
    </View>
  );
}

// 渲染直接来自接口的正文（小组话题、长评等）：普通文本走表情内联，
// 含 [quote]/[img] 时走富文本块。
export function BangumiText({
  children,
  style,
}: {
  children: string;
  style?: StyleProp<TextStyle>;
}) {
  const blocks = useMemo(() => parseBangumiContent(children), [children]);
  const hasRichBlocks = blocks.some(
    (block) => block.type === 'image' || block.type === 'quote',
  );

  if (!hasRichBlocks) {
    return <BangumiEmojiText style={style}>{children}</BangumiEmojiText>;
  }

  return <BangumiRichBody blocks={blocks} style={style} />;
}

// 渲染回复正文：已解析块的序列（讨论/单集评论 Adapter 输出）。
export function BangumiContentText({
  blocks,
  style,
}: {
  blocks: BangumiContentBlock[];
  style?: StyleProp<TextStyle>;
}) {
  if (blocks.length === 0) {
    return null;
  }

  const hasRichBlocks = blocks.some(
    (block) => block.type === 'quote' || block.type === 'image',
  );
  if (!hasRichBlocks) {
    return (
      <BangumiEmojiText style={style}>
        {blocks.map((block) => block.value).join('')}
      </BangumiEmojiText>
    );
  }

  return <BangumiRichBody blocks={blocks} style={style} />;
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
