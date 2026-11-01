import { useState } from 'react';
import { Image } from 'expo-image';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { MIN_TOUCH_SIZE, SPACING, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/features/theme/theme-provider';

import { FullscreenImageViewer } from './fullscreen-image-viewer';

const IMAGE_WIDTH = 232;
const FALLBACK_ASPECT_RATIO = 1.35;
type ImageState = {
  attempt: number;
  status: 'loading' | 'ready' | 'error';
  aspectRatio: number | null;
};

// 帖子正文内的图片：圆角卡片，宽度固定、高度按原图比例自适应；点击可
// 全屏预览（复用条目封面的全屏查看器）。
export function BangumiPostImage({ uri }: { uri: string }) {
  // FlashList 复用正文时，换图必须同时重置尺寸和预览状态。
  return <PostImage key={uri} uri={uri} />;
}

function PostImage({ uri }: { uri: string }) {
  const colors = useTheme();
  const styles = createStyles(colors);
  const [image, setImage] = useState<ImageState>({ attempt: 0, status: 'loading', aspectRatio: null });
  const [viewerVisible, setViewerVisible] = useState(false);
  const aspectRatio = image.aspectRatio ?? FALLBACK_ASPECT_RATIO;
  const failed = image.status === 'error';

  function finishLoad(status: 'ready' | 'error', nextRatio: number | null = null) {
    setImage((current) => {
      // URL 由外层 key 隔离；重试代次在 state 更新中比较，不留 effect 前的竞态窗口。
      if (current.attempt !== image.attempt || current.status !== 'loading') return current;
      return { ...current, status, aspectRatio: current.aspectRatio ?? nextRatio };
    });
  }

  function retry() {
    setImage((current) => current.status === 'error'
      ? { ...current, attempt: current.attempt + 1, status: 'loading' }
      : current);
  }

  return (
    <>
      <View
        style={[styles.frame, failed ? { minHeight: IMAGE_WIDTH / aspectRatio } : { aspectRatio }]}
      >
        <Pressable
          accessibilityElementsHidden={failed}
          accessibilityLabel="查看图片"
          accessibilityRole="imagebutton"
          disabled={failed}
          importantForAccessibility={failed ? 'no-hide-descendants' : 'auto'}
          onPress={() => setViewerVisible(true)}
          style={({ pressed }) => [StyleSheet.absoluteFill, failed && styles.hidden, pressed && styles.pressed]}
        >
          <Image
            contentFit="cover"
            key={image.attempt}
            onError={() => finishLoad('error')}
            onLoad={(event) => {
              const source = event.source;
              if (source?.width > 0 && source?.height > 0) {
                // Android 重布局后解码可能有像素舍入差，只锁定首次成功的比例。
                finishLoad('ready', source.width / source.height);
              } else {
                finishLoad('error');
              }
            }}
            recyclingKey={`${uri}:${image.attempt}`}
            source={uri}
            style={StyleSheet.absoluteFill}
            // Android 重布局会重新加载 drawable，多图/GIF 不叠加交叉淡入。
            transition={Platform.OS === 'android' ? 0 : 120}
          />
        </Pressable>
        {image.status === 'loading' ? (
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.status]}>
            <ActivityIndicator accessibilityLabel="图片加载中" color={colors.muted} />
          </View>
        ) : null}
        {failed ? (
          <View style={styles.status}>
            <Text style={styles.statusText}>图片加载失败</Text>
            <View style={styles.actions}>
              <Pressable
                accessibilityLabel="重试加载图片"
                accessibilityRole="button"
                onPress={retry}
                style={({ pressed }) => [styles.action, pressed && styles.pressed]}
              >
                <Text style={styles.actionText}>重试</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setViewerVisible(true)}
                style={({ pressed }) => [styles.action, pressed && styles.pressed]}
              >
                <Text style={styles.actionText}>查看大图</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
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
    frame: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 12,
      justifyContent: 'center',
      marginVertical: SPACING.xs + SPACING.xs / 2,
      overflow: 'hidden',
      width: IMAGE_WIDTH,
    },
    status: {
      alignItems: 'center',
      gap: SPACING.md,
      justifyContent: 'center',
      padding: SPACING.lg,
    },
    statusText: { ...TYPE.caption, color: colors.muted, textAlign: 'center' },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, justifyContent: 'center' },
    action: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 8,
      justifyContent: 'center',
      minHeight: MIN_TOUCH_SIZE,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
    },
    actionText: { ...TYPE.caption, color: colors.ink },
    hidden: { opacity: 0 },
    pressed: { opacity: 0.8 },
  });
