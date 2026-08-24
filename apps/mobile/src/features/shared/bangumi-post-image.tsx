import { useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/features/theme/theme-provider';

import { FullscreenImageViewer } from './fullscreen-image-viewer';

const IMAGE_WIDTH = 232;
const FALLBACK_ASPECT_RATIO = 1.35;

// 帖子正文内的图片：圆角卡片，宽度固定、高度按原图比例自适应；点击可
// 全屏预览（复用条目封面的全屏查看器）。
export function BangumiPostImage({ uri }: { uri: string }) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [aspectRatio, setAspectRatio] = useState(FALLBACK_ASPECT_RATIO);
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
              setAspectRatio(source.width / source.height);
            }
          }}
          recyclingKey={uri}
          source={uri}
          style={[styles.image, { aspectRatio }]}
          transition={120}
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
      marginVertical: 6,
      width: IMAGE_WIDTH,
    },
    pressed: { opacity: 0.8 },
  });
