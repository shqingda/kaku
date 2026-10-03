import { useState } from 'react';
import { Image } from 'expo-image';
import { Platform, Pressable, StyleSheet } from 'react-native';

import { SPACING } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/features/theme/theme-provider';

import { FullscreenImageViewer } from './fullscreen-image-viewer';

const IMAGE_WIDTH = 232;
const FALLBACK_ASPECT_RATIO = 1.35;

// 帖子正文内的图片：圆角卡片，宽度固定、高度按原图比例自适应；点击可
// 全屏预览（复用条目封面的全屏查看器）。
export function BangumiPostImage({ uri }: { uri: string }) {
  // FlashList 复用正文时，换图必须同时重置尺寸和预览状态。
  return <PostImage key={uri} uri={uri} />;
}

function PostImage({ uri }: { uri: string }) {
  const colors = useTheme();
  const styles = createStyles(colors);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [viewerVisible, setViewerVisible] = useState(false);

  return (
    <>
      <Pressable
        accessibilityLabel="查看图片"
        accessibilityRole="imagebutton"
        onPress={() => setViewerVisible(true)}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <Image
          contentFit="cover"
          onLoad={(event) => {
            const source = event.source as
              | { height?: number; width?: number }
              | undefined;
            if (source?.width && source?.height) {
              // Android 返回解码后的尺寸，布局变化后再次解码可能有像素舍入差。
              // 同一图片只确定一次比例，切断「改高度 → 重载 → 再改高度」循环。
              setAspectRatio((current) => current ?? source.width! / source.height!);
            }
          }}
          recyclingKey={uri}
          source={uri}
          style={[styles.image, { aspectRatio: aspectRatio ?? FALLBACK_ASPECT_RATIO }]}
          // Android 会在原图比例更新、视图重新布局时重新加载 drawable。
          // 多图/GIF 不叠加交叉淡入，避免滚动时旧帧与新帧重影、闪白。
          transition={Platform.OS === 'android' ? 0 : 120}
        />
      </Pressable>
      <FullscreenImageViewer
        onClose={() => setViewerVisible(false)}
        title="图片"
        url={uri}
        visible={viewerVisible}
      />
    </>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    image: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 12,
      marginVertical: SPACING.xs + SPACING.xs / 2,
      width: IMAGE_WIDTH,
    },
    pressed: { opacity: 0.8 },
  });
